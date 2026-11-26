import test from "node:test";
import assert from "node:assert/strict";
import { Group, Box3, Vector3 } from "three";
import "fake-indexeddb/auto";
import { characterGlb } from "../fixtures/character-glb.js";
import { createObjectView } from "../src/assets/object-view.js";
import { loadGlb, disposeModel } from "../src/assets/glb.js";
import {
  OBJECT_KEYS,
  defaultTransform,
  defaultObjects,
  validateTransform,
  validateObjects,
} from "../src/assets/object-settings.js";
import { newProject, validateProject } from "../src/projects/schema.js";
import { createStudioStore } from "../src/projects/storage.js";
const file = (options) =>
  new File([characterGlb({ animated: false, ...options })], "prop.glb", {
    type: "model/gltf-binary",
  });
const game = () => ({
  course: [
    { type: "block", distance: 30, lane: -1, coinLane: 1 },
    { type: "bar", distance: 40, lane: 1, coinLane: 0 },
  ],
  nextRow: 0,
  distance: 0,
});

test("object transforms are whitelisted, bounded and old projects gain independent default slots", () => {
  const old = newProject();
  delete old.settings.objects;
  for (const k of OBJECT_KEYS) delete old.assetRefs[k];
  const p = validateProject(old);
  assert.deepEqual(p.settings.objects, defaultObjects());
  for (const k of OBJECT_KEYS) assert.equal(p.assetRefs[k], null);
  p.settings.objects.environment.offset.x = 3;
  assert.equal(p.settings.objects.collectible.offset.x, 0);
  assert.equal(
    validateTransform({ ...defaultTransform(), extra: "ignored" }).extra,
    undefined,
  );
  for (const patch of [
    { scale: 0 },
    { scale: Infinity },
    { rotation: { x: 181, y: 0, z: 0 } },
    { offset: { x: 0, y: NaN, z: 0 } },
  ])
    assert.throws(() => validateTransform({ ...defaultTransform(), ...patch }));
  assert.throws(() => validateObjects({ unknown: {} }));
});
test("static pools fit models, clone skeletons safely, follow course anchors and do not mutate gameplay", async () => {
  const scene = new Group(),
    view = createObjectView(scene);
  for (const k of OBJECT_KEYS) await view.load(k, file());
  assert.equal(scene.children.length, 16);
  const g = game(),
    before = JSON.stringify(g);
  view.draw(g);
  assert.equal(JSON.stringify(g), before);
  const env = scene.children[0];
  assert.equal(env.position.z, -22);
  assert.ok(Math.abs(new Box3().setFromObject(env).min.y) < 1e-6);
  const jump = scene.children.slice(1, 6),
    duck = scene.children.slice(6, 11),
    coins = scene.children.slice(11);
  assert.equal(jump[0].visible, true);
  assert.equal(jump[1].visible, false);
  assert.equal(duck[0].visible, false);
  assert.equal(duck[1].visible, true);
  assert.equal(coins[0].position.x, 2.2);
  assert.equal(jump[0].position.x, -2.2);
  assert.equal(duck[1].position.y, 1.55);
  const a = jump[0].getObjectByName("Body"),
    b = jump[1].getObjectByName("Body");
  assert.equal(a.geometry, b.geometry);
  assert.equal(a.material, b.material);
  assert.notEqual(a.skeleton, b.skeleton);
  assert.notEqual(a.skeleton.bones[0], b.skeleton.bones[0]);
  const size = new Box3().setFromObject(jump[0]).getSize(new Vector3());
  assert.ok(size.y <= 0.80001);
  assert.ok(size.x <= 1.35001);
  view.configure("jumpObstacle", {
    scale: 2,
    rotation: { x: 0, y: 90, z: 0 },
    offset: { x: 0.2, y: 0.3, z: 0.4 },
  });
  const pivot = jump[0].children[0];
  assert.equal(pivot.rotation.y, Math.PI / 2);
  assert.deepEqual(pivot.position.toArray(), [0.2, 0.3, 0.4]);
  g.distance = 10;
  view.draw(g);
  assert.equal(jump[0].position.z, -20);
  assert.equal(coins[0].rotation.y, 1);
  assert.equal(env.position.z, -22);
  view.dispose();
  assert.equal(scene.children.length, 0);
});
test("replacing/removing a pooled model releases shared geometry once and restores empty slot", async () => {
  const scene = new Group(),
    view = createObjectView(scene);
  await view.load("collectible", file());
  let releases = 0;
  scene.children[0]
    .getObjectByName("Body")
    .geometry.addEventListener("dispose", () => releases++);
  await view.load("collectible", file());
  assert.equal(releases, 1);
  assert.equal(scene.children.length, 5);
  await view.load("collectible", null);
  assert.equal(view.has("collectible"), false);
  assert.equal(scene.children.length, 0);
  view.dispose();
});
test("failed/staged/discarded replacements keep the active model until commit", async () => {
  const scene = new Group(),
    view = createObjectView(scene);
  await view.load("environment", file());
  const old = scene.children[0];
  await assert.rejects(view.load("environment", new File(["bad"], "bad.glb")));
  assert.equal(scene.children[0], old);
  const stage = await view.prepare("environment", file(), {
    ...defaultTransform(),
    scale: 2,
  });
  assert.equal(scene.children[0], old);
  stage.discard();
  assert.equal(scene.children[0], old);
  const next = await view.prepare("environment", file());
  assert.equal(next.commit(), true);
  assert.notEqual(scene.children[0], old);
  assert.equal(next.commit(), false);
  view.dispose();
});
test("late loads and prepared models cannot resurrect removed/disposed slots", async () => {
  const scene = new Group(),
    view = createObjectView(scene);
  let resolve;
  const f = file();
  f.arrayBuffer = () => new Promise((r) => (resolve = r));
  const late = view.load("jumpObstacle", f);
  await view.load("jumpObstacle", null);
  resolve(characterGlb({ animated: false }));
  assert.equal(await late, false);
  assert.equal(view.has("jumpObstacle"), false);
  const stage = await view.prepare("environment", file());
  view.dispose();
  assert.equal(stage.commit(), false);
  assert.equal(scene.children.length, 0);
});
test("flat scenery GLBs are accepted for objects but not as characters", async () => {
  const f = file({ flat: true });
  await assert.rejects(loadGlb(f), /finite-height/);
  const model = await loadGlb(f, { allowFlat: true });
  disposeModel(model);
  const scene = new Group(),
    view = createObjectView(scene);
  await view.load("environment", f);
  view.draw(game());
  const box = new Box3().setFromObject(scene.children[0]);
  assert.ok(box.max.x - box.min.x <= 40.00001);
  assert.ok(Math.abs(box.min.y) < 0.00001);
  view.dispose();
});
test("one library model can serve all typed slots, persist transforms and protect references", async () => {
  const store = createStudioStore("objects-" + crypto.randomUUID()),
    asset = await store.putAsset(file()),
    p = newProject();
  for (const k of OBJECT_KEYS) p.assetRefs[k] = asset.id;
  p.settings.objects.environment.offset.z = -4;
  await store.saveProject(p);
  await store.close();
  const loaded = await store.getProject(p.id);
  assert.equal(loaded.settings.objects.environment.offset.z, -4);
  assert.equal(loaded.assetRefs.duckObstacle, asset.id);
  await assert.rejects(store.deleteAsset(asset.id), /used/);
  const copy = {
    ...loaded,
    id: crypto.randomUUID(),
    settings: structuredClone(loaded.settings),
  };
  await store.saveProject(copy);
  await store.deleteProject(p.id);
  await assert.rejects(store.deleteAsset(asset.id));
  await store.deleteProject(copy.id);
  await store.deleteAsset(asset.id);
  await store.close();
});
