import {
  Group,
  Box3,
  Vector3,
  AnimationMixer,
  LoopOnce,
  LoopRepeat,
} from "three";
import { loadGlb, disposeModel } from "./glb.js";
import {
  defaultCharacter,
  validateCharacter,
  characterAction,
} from "./character-settings.js";
// Reusable visual attachment. Game rules/hitboxes never depend on imported geometry.
export function createCharacterView(parent) {
  const root = new Group();
  parent.add(root);
  let current = null,
    mixer = null,
    settings = defaultCharacter(),
    active = null,
    generation = 0,
    disposed = false,
    lastGameTime = null;
  const actions = new Map();
  function clear() {
    if (mixer) {
      mixer.stopAllAction();
      mixer.uncacheRoot(current.scene);
    }
    actions.clear();
    mixer = null;
    active = null;
    lastGameTime = null;
    if (current) {
      root.remove(current.scene);
      disposeModel(current);
      current = null;
    }
  }
  function configure(value) {
    settings = validateCharacter(value);
    active = null;
    mixer?.stopAllAction();
    if (current) mixer.uncacheRoot(current.scene);
    actions.clear();
    root.rotation.y = (settings.facing * Math.PI) / 180;
    if (!current) return;
    // Separate normalization from animation targets: animations cannot overwrite the fit transform.
    root.scale.setScalar(current.userData.fit * settings.scale);
    for (const [key, index] of Object.entries(settings.clips))
      if (index !== null && current.animations[index]) {
        const clip = current.animations[index].clone();
        const a = mixer.clipAction(clip);
        a.setLoop(
          key === "jump" ? LoopOnce : LoopRepeat,
          key === "jump" ? 1 : Infinity,
        );
        a.clampWhenFinished = key === "jump";
        actions.set(key, a);
      }
  }
  return {
    async load(file, value = defaultCharacter()) {
      if (disposed) throw Error("Character viewer is disposed.");
      const token = ++generation;
      if (!file) {
        clear();
        root.scale.setScalar(1);
        return [];
      }
      const next = await loadGlb(file);
      if (token !== generation || disposed) {
        disposeModel(next);
        return null;
      }
      try {
        const validated = validateCharacter(value);
        for (const index of Object.values(validated.clips))
          if (index !== null && !next.animations[index])
            throw Error("Saved animation clip is missing from this GLB.");
        const box = new Box3().setFromObject(next.scene),
          center = box.getCenter(new Vector3()),
          size = box.getSize(new Vector3());
        // Offset sits outside animated glTF scene to preserve mesh and skeleton transforms.
        const holder = new Group();
        holder.position.set(-center.x, -box.min.y, -center.z);
        holder.add(next.scene);
        const wrapped = {
          ...next,
          scene: holder,
          userData: { fit: 1.9 / size.y },
        };
        clear();
        current = wrapped;
        root.add(holder);
        mixer = new AnimationMixer(holder);
        configure(validated);
        return next.animations.map((a, i) => ({
          index: i,
          name: a.name || `Clip ${i + 1}`,
          duration: a.duration,
        }));
      } catch (error) {
        disposeModel(next);
        throw error;
      }
    },
    configure,
    draw(game) {
      root.visible = !!current && game.lives > 0;
      root.position.set(game.x, game.height, 0);
      if (!current) return false;
      const key = ["paused", "countdown"].includes(game.state)
          ? active || "idle"
          : characterAction(game),
        chosen = actions.get(key) || actions.get("idle");
      if (active !== key) {
        const previous =
          active === null ? null : actions.get(active) || actions.get("idle");
        if (chosen !== previous) {
          if (game.state !== "running" || active === null) {
            previous?.stop();
            chosen?.reset().setEffectiveWeight(1).play();
            mixer.update(0);
          } else {
            previous?.fadeOut(0.12);
            chosen?.reset().fadeIn(0.12).play();
          }
        } else if (key === "jump") chosen?.reset().play();
        active = key;
      }
      const dt =
        lastGameTime === null
          ? 0
          : Math.max(0, Math.min(0.1, game.time - lastGameTime));
      lastGameTime = game.time;
      if (game.state === "running") mixer.update(dt);
      // No duck clip: retain a visible crouch cue without changing collision rules.
      root.scale.y =
        current.userData.fit *
        settings.scale *
        (game.squat && !actions.has("duck") ? 0.58 : 1);
      return true;
    },
    info: () => ({
      loaded: !!current,
      time: mixer?.time ?? 0,
      action: active,
      clip: active ? (settings.clips[active] ?? settings.clips.idle) : null,
    }),
    dispose() {
      disposed = true;
      generation++;
      clear();
      parent.remove(root);
    },
  };
}
