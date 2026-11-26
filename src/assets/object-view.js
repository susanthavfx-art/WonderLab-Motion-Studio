import { Group, Box3, Vector3, MathUtils } from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { loadGlb, disposeModel } from "./glb.js";
import {
  OBJECT_SLOTS,
  OBJECT_KEYS,
  defaultTransform,
  validateTransform,
} from "./object-settings.js";
// Shared static visual slots. Clones share source geometry/material/texture resources;
// each owns its skeleton. Simulation coordinates and collision rules are read-only.
export function createObjectView(parent) {
  const slots = Object.fromEntries(
    OBJECT_KEYS.map((k) => [
      k,
      {
        source: null,
        instances: [],
        settings: defaultTransform(),
        generation: 0,
      },
    ]),
  );
  let disposed = false;
  function release(state) {
    for (const { root } of state.instances) {
      parent.remove(root);
      root.traverse((o) => o.skeleton?.dispose());
    }
    state.instances = [];
    disposeModel(state.source);
    state.source = null;
  }
  function configure(key, value) {
    const state = slots[key];
    if (!state) throw Error("Unknown 3D slot.");
    state.settings = validateTransform(value);
    for (const { pivot, base } of state.instances) {
      pivot.rotation.set(
        ...["x", "y", "z"].map((a) =>
          MathUtils.degToRad(state.settings.rotation[a]),
        ),
      );
      pivot.scale.setScalar(base * state.settings.scale);
      pivot.position.set(
        ...["x", "y", "z"].map((a) => state.settings.offset[a]),
      );
    }
  }
  async function prepare(key, file, value = defaultTransform()) {
    const state = slots[key];
    if (!state || disposed) throw Error("3D object viewer is unavailable.");
    const settings = validateTransform(value),
      token = ++state.generation;
    let source = null,
      instances = [];
    if (file) {
      source = await loadGlb(file, { allowFlat: true });
      try {
        if (disposed || token !== state.generation) {
          disposeModel(source);
          return null;
        }
        const slot = OBJECT_SLOTS[key],
          box = new Box3().setFromObject(source.scene),
          size = box.getSize(new Vector3()),
          center = box.getCenter(new Vector3());
        const dims = size.toArray();
        const base = Math.min(
          ...slot.fit.map((v, i) => (dims[i] > 1e-6 ? v / dims[i] : Infinity)),
        );
        if (!Number.isFinite(base) || base <= 0)
          throw Error("Model bounds cannot be fitted into this slot.");
        for (let i = 0; i < slot.count; i++) {
          const root = new Group(),
            pivot = new Group(),
            offset = new Group(),
            model = clone(source.scene);
          offset.position.set(
            -center.x,
            slot.floor ? -box.min.y : -center.y,
            -center.z,
          );
          offset.add(model);
          pivot.add(offset);
          root.add(pivot);
          root.visible = false;
          instances.push({ root, pivot, base });
        }
      } catch (error) {
        for (const { root } of instances)
          root.traverse((o) => o.skeleton?.dispose());
        disposeModel(source);
        throw error;
      }
    }
    // Prepared but unattached: project hydration can stage every slot before committing.
    let consumed = false;
    return {
      commit() {
        if (consumed) return false;
        consumed = true;
        if (disposed || token !== state.generation) {
          this.releaseResources();
          return false;
        }
        release(state);
        state.source = source;
        state.instances = instances;
        for (const { root } of instances) parent.add(root);
        configure(key, settings);
        return true;
      },
      releaseResources() {
        for (const { root } of instances)
          root.traverse((o) => o.skeleton?.dispose());
        disposeModel(source);
      },
      discard() {
        if (!consumed) {
          consumed = true;
          this.releaseResources();
        }
      },
    };
  }
  return {
    prepare,
    configure,
    async load(key, file, value) {
      const prepared = await prepare(key, file, value);
      return prepared ? prepared.commit() : false;
    },
    has: (key) => !!slots[key]?.source,
    draw(game) {
      for (const key of OBJECT_KEYS) {
        const state = slots[key],
          slot = OBJECT_SLOTS[key];
        for (let i = 0; i < state.instances.length; i++) {
          const root = state.instances[i].root;
          if (key === "environment") {
            root.visible = true;
            root.position.set(...slot.anchor);
            continue;
          }
          const row = game.course[game.nextRow + i];
          root.visible =
            !!row &&
            row.distance - game.distance < 49 &&
            (key === "collectible" ||
              row.type === (key === "jumpObstacle" ? "block" : "bar"));
          if (!root.visible) continue;
          root.position.set(
            (key === "collectible" ? row.coinLane : row.lane) * 2.2,
            slot.anchor[1],
            game.distance - row.distance,
          );
          root.rotation.y = key === "collectible" ? game.distance * 0.1 : 0;
        }
      }
    },
    dispose() {
      disposed = true;
      for (const state of Object.values(slots)) {
        state.generation++;
        release(state);
      }
    },
  };
}
