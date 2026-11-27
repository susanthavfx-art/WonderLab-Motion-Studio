import {
  SCATTER_KEYS,
  defaultEnvironment,
  validateEnvironment,
  endlessLayout,
} from "./endless.js";
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
  let disposed = false,
    environment = defaultEnvironment(),
    currentLayout = null;
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
    for (const { root, pivot, base, normalizer, size } of state.instances) {
      if (key === "road")
        normalizer.scale.set(
          8 / size.x,
          Math.min(1, 1 / Math.max(size.y, 1e-6)),
          environment.length / size.z,
        );
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
    if (SCATTER_KEYS.includes(key) && state.instances.length) {
      const root = state.instances[0].root,
        p = root.position.clone(),
        r = root.rotation.clone(),
        s = root.scale.clone();
      root.position.set(0, 0, 0);
      root.rotation.set(0, 0, 0);
      root.scale.setScalar(1);
      const box = new Box3().setFromObject(root);
      state.radius =
        Math.hypot(
          Math.max(Math.abs(box.min.x), Math.abs(box.max.x)),
          Math.max(Math.abs(box.min.z), Math.abs(box.max.z)),
        ) * 1.15;
      root.position.copy(p);
      root.rotation.copy(r);
      root.scale.copy(s);
      root.updateMatrixWorld(true);
    }
  }
  function configureEnvironment(value) {
    environment = validateEnvironment(value);
    configure("road", slots.road.settings);
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
        if (SCATTER_KEYS.includes(key) || key === "road") {
          let meshes = 0,
            vertices = 0;
          source.scene.traverse((o) => {
            if (o.isMesh) {
              meshes++;
              vertices += o.geometry?.attributes.position?.count || 0;
            }
          });
          if (meshes > 16 || vertices > 50000)
            throw Error(
              "Repeated road/scenery models are limited to 16 meshes and 50,000 vertices per GLB. Use low-poly assets.",
            );
        }
        const slot = OBJECT_SLOTS[key],
          box = new Box3().setFromObject(source.scene),
          size = box.getSize(new Vector3()),
          center = box.getCenter(new Vector3());
        const dims = size.toArray();
        let base = Math.min(
          ...slot.fit.map((v, i) => (dims[i] > 1e-6 ? v / dims[i] : Infinity)),
        );
        if (!Number.isFinite(base) || base <= 0)
          throw Error("Model bounds cannot be fitted into this slot.");
        if (key === "road") {
          if (size.x < 1e-5 || size.z < 1e-5)
            throw Error("Road segment needs a finite width and depth.");
          base = 1;
        }
        for (let i = 0; i < slot.count; i++) {
          const root = new Group(),
            pivot = new Group(),
            normalizer = new Group(),
            offset = new Group(),
            model = clone(source.scene);
          offset.position.set(
            -center.x,
            key === "road" ? -box.max.y : slot.floor ? -box.min.y : -center.y,
            -center.z,
          );
          offset.add(model);
          normalizer.add(offset);
          pivot.add(normalizer);
          root.add(pivot);
          root.name = `${key}:${i}`;
          root.visible = false;
          instances.push({ root, pivot, base, normalizer, size });
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
    configureEnvironment,
    mode: () => environment.mode,
    layout: () => currentLayout,
    hasScatter: () => SCATTER_KEYS.some((k) => !!slots[k].source),
    async load(key, file, value) {
      const prepared = await prepare(key, file, value);
      return prepared ? prepared.commit() : false;
    },
    has: (key) => !!slots[key]?.source,
    draw(game) {
      const available = SCATTER_KEYS.filter((k) => slots[k].source),
        layout =
          environment.mode === "endless"
            ? endlessLayout(
                game.distance,
                environment,
                available.length ? available : ["tree"],
              )
            : null;
      currentLayout = layout;
      for (const key of ["road", ...SCATTER_KEYS])
        for (const { root } of slots[key].instances) root.visible = false;
      if (layout) {
        slots.road.instances.forEach(({ root }, i) => {
          root.visible = true;
          root.position.set(0, 0, layout.segments[i].z);
        });
        const used = { tree: 0, rock: 0, bush: 0 };
        for (const prop of layout.props) {
          const state = slots[prop.key],
            instance = state.instances[used[prop.key]++];
          if (!instance) continue;
          const root = instance.root;
          root.visible = true;
          root.position.set(prop.x + prop.side * state.radius, 0, prop.z);
          root.rotation.y = prop.rotation;
          root.scale.setScalar(prop.scale);
        }
      }
      for (const key of OBJECT_KEYS) {
        if (key === "road" || SCATTER_KEYS.includes(key)) continue;
        const state = slots[key],
          slot = OBJECT_SLOTS[key];
        for (let i = 0; i < state.instances.length; i++) {
          const root = state.instances[i].root;
          if (key === "environment") {
            root.visible = environment.mode === "static";
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
