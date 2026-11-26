import test from "node:test";
import assert from "node:assert/strict";
import { Group, Box3, Vector3 } from "three";
import { characterGlb, packGlb } from "../fixtures/character-glb.js";
import { inspectGlb, loadGlb, disposeModel } from "../src/assets/glb.js";
import { createCharacterView } from "../src/assets/character-view.js";
import {
  defaultCharacter,
  validateCharacter,
  characterAction,
} from "../src/assets/character-settings.js";
import { newProject, validateProject } from "../src/projects/schema.js";
import { createStudioStore } from "../src/projects/storage.js";
import "fake-indexeddb/auto";
const file = () =>
  new File([characterGlb()], "actor.glb", { type: "model/gltf-binary" });
const mapped = () => ({
  ...defaultCharacter(),
  clips: { idle: 0, run: 1, jump: 2, duck: 3 },
});
const game = (patch = {}) => ({
  state: "running",
  time: 0,
  speed: 8,
  height: 0,
  x: 0,
  lives: 3,
  squat: false,
  ...patch,
});

test("GLB boundary rejects malformed, external, compressed and oversized resources before loading", () => {
  const good = characterGlb();
  assert.equal(inspectGlb(good).animations.length, 4);
  assert.throws(() => inspectGlb(new ArrayBuffer(10)));
  const bad = good.slice(0);
  new DataView(bad).setUint32(8, 42, true);
  assert.throws(() => inspectGlb(bad));
  for (const patch of [
    { buffers: [{ uri: "https://example.com/model.bin" }] },
    { images: [{ uri: "data:image/png;base64,abc" }] },
    { extensionsUsed: ["KHR_draco_mesh_compression"] },
    { nodes: Array(257).fill({}) },
    { accessors: [{ count: 9999999 }] },
    { images: [{ bufferView: 0, mimeType: "image/svg+xml" }] },
  ])
    assert.throws(() =>
      inspectGlb(packGlb({ asset: { version: "2.0" }, ...patch })),
    );
});
test("old project data gains safe character defaults; mappings are bounded and serializable", () => {
  const p = newProject();
  delete p.settings.character;
  delete p.assetRefs.character;
  assert.deepEqual(validateProject(p).settings.character, defaultCharacter());
  assert.equal(validateProject(p).assetRefs.character, null);
  assert.deepEqual(validateCharacter(mapped()), mapped());
  for (const patch of [
    { scale: Infinity },
    { scale: 3 },
    { facing: 45 },
    { clips: { idle: -1, run: null, jump: null, duck: null } },
  ])
    assert.throws(() => validateCharacter({ ...defaultCharacter(), ...patch }));
  assert.equal(characterAction(game()), "run");
  assert.equal(characterAction(game({ height: 1 })), "jump");
  assert.equal(characterAction(game({ squat: true })), "duck");
  assert.equal(characterAction(game({ state: "ready" })), "idle");
});
test("skinned embedded clips load, normalize, switch actions, freeze on pause and dispose", async () => {
  const scene = new Group(),
    view = createCharacterView(scene);
  assert.equal((await view.load(file(), mapped())).length, 4);
  const root = scene.children[0];
  assert.ok(
    Math.abs(new Box3().setFromObject(root).getSize(new Vector3()).y - 1.9) <
      0.001,
  );
  view.draw(game({ state: "ready" }));
  assert.equal(view.info().clip, 0);
  for (let i = 0; i < 10; i++) view.draw(game({ time: i * 0.05 }));
  assert.equal(view.info().action, "run");
  assert.equal(view.info().clip, 1);
  assert.ok(view.info().time > 0);
  const bone = root.getObjectByName("Bone");
  assert.ok(
    Math.abs(bone.quaternion.z) > 0.001,
    "animation updates the skeleton pose",
  );
  const pose = bone.quaternion.clone();
  const time = view.info().time;
  view.draw(game({ state: "paused", time: 0.45 }));
  view.draw(game({ state: "paused", time: 0.45 }));
  assert.equal(view.info().time, time);
  assert.ok(
    bone.quaternion.equals(pose),
    "pause preserves the actual skeleton pose",
  );
  assert.equal(view.info().action, "run");
  view.draw(game({ height: 0.6, time: 0.5 }));
  assert.equal(view.info().clip, 2);
  view.draw(game({ squat: true, time: 0.55 }));
  assert.equal(view.info().clip, 3);
  view.configure({ ...mapped(), scale: 1.5, facing: 90 });
  assert.equal(root.rotation.y, Math.PI / 2);
  assert.ok(Math.abs(root.scale.x - 1.425) < 1e-9);
  let released = 0;
  root.traverse((o) =>
    o.geometry?.addEventListener("dispose", () => released++),
  );
  await view.load(null);
  assert.equal(view.info().loaded, false);
  assert.equal(released, 1);
  view.dispose();
  assert.equal(scene.children.length, 0);
});
test("failed/missing clip replacement preserves previous model; stale async loads cannot resurrect removed models", async () => {
  const view = createCharacterView(new Group());
  await view.load(file(), mapped());
  await assert.rejects(view.load(new File(["bad"], "fake.glb")));
  assert.equal(view.info().loaded, true);
  await assert.rejects(
    view.load(file(), { ...mapped(), clips: { ...mapped().clips, jump: 40 } }),
    /missing/,
  );
  assert.equal(view.info().loaded, true);
  let resolve;
  const f = file();
  f.arrayBuffer = () => new Promise((r) => (resolve = r));
  const pending = view.load(f);
  await view.load(null);
  resolve(characterGlb());
  assert.equal(await pending, null);
  assert.equal(view.info().loaded, false);
  view.dispose();
});
test("static models work and full model resources can be disposed without a renderer", async () => {
  const model = await loadGlb(
    new File([characterGlb({ animated: false })], "static.glb"),
  );
  assert.equal(model.animations.length, 0);
  assert.ok(model.scene.getObjectByName("Body").isSkinnedMesh);
  disposeModel(model);
});
test("model library persists blobs and protects typed project references", async () => {
  const store = createStudioStore("models-" + crypto.randomUUID());
  const asset = await store.putAsset(file());
  assert.equal(asset.kind, "model");
  const p = newProject();
  p.assetRefs.character = asset.id;
  p.settings.character = mapped();
  await store.saveProject(p);
  await store.close();
  const stored = await store.getProject(p.id);
  assert.deepEqual(stored.settings.character, mapped());
  assert.equal((await store.getAsset(asset.id)).blob.size, file().size);
  await assert.rejects(store.deleteAsset(asset.id), /used/);
  await assert.rejects(
    store.saveProject({ ...p, assetRefs: { ...p.assetRefs, logo: asset.id } }),
    /Wrong asset type/,
  );
  await store.deleteProject(p.id);
  await store.deleteAsset(asset.id);
  await store.close();
});
