import test from "node:test";
import assert from "node:assert/strict";
import { Group, Box3 } from "three";
import "fake-indexeddb/auto";
import {
  defaultEnvironment,
  validateEnvironment,
  endlessLayout,
  SCATTER_KEYS,
  SEGMENT_COUNT,
} from "../src/assets/endless.js";
import { createObjectView } from "../src/assets/object-view.js";
import { defaultTransform } from "../src/assets/object-settings.js";
import { newProject, validateProject } from "../src/projects/schema.js";
import { createStudioStore } from "../src/projects/storage.js";
import { characterGlb, packGlb } from "../fixtures/character-glb.js";
import { inspectGlb } from "../src/assets/glb.js";
const file = (options) =>
  new File([characterGlb({ animated: false, ...options })], "segment.glb", {
    type: "model/gltf-binary",
  });
const config = (patch = {}) => ({
  ...defaultEnvironment(),
  mode: "endless",
  ...patch,
});
const game = (distance) => ({ distance, course: [], nextRow: 0 });

test("environment config is whitelisted, bounded, and absent old-project settings stay static", () => {
  const p = newProject();
  delete p.settings.environment;
  assert.equal(validateProject(p).settings.environment.mode, "static");
  for (const patch of [
    { mode: "curved" },
    { length: 0 },
    { length: Infinity },
    { density: 3 },
    { clearance: 0 },
    { seed: 1.2 },
    { seed: -1 },
  ])
    assert.throws(() => validateEnvironment(config(patch)));
  assert.equal(
    validateEnvironment({ ...config(), execute: "bad" }).execute,
    undefined,
  );
});
test("endless chunks cover the view without gaps and retain seeded scenery identities while scrolling", () => {
  for (const length of [12, 24, 40])
    for (const distance of [
      0,
      length - 0.001,
      length,
      length + 0.001,
      1000000,
    ]) {
      const c = config({ length, density: 2 }),
        layout = endlessLayout(distance, c);
      assert.equal(layout.segments.length, SEGMENT_COUNT);
      assert.equal(layout.props.length, 64);
      const z = layout.segments.map((s) => s.z).sort((a, b) => a - b);
      assert.ok(z[0] - length / 2 <= -65);
      assert.ok(z.at(-1) + length / 2 >= 9);
      for (let i = 1; i < z.length; i++)
        assert.ok(Math.abs(z[i] - z[i - 1] - length) < 1e-6);
      assert.deepEqual(layout, endlessLayout(distance, c));
      assert.notDeepEqual(
        layout.props,
        endlessLayout(distance, { ...c, seed: 99 }).props,
      );
    }
  const c = config(),
    before = endlessLayout(23.9, c),
    after = endlessLayout(24.1, c),
    map = new Map(after.props.map((p) => [p.id, p]));
  for (const prop of before.props) {
    const next = map.get(prop.id);
    if (!next) continue;
    assert.equal(prop.key, next.key);
    assert.equal(prop.x, next.x);
    assert.equal(prop.rotation, next.rotation);
    assert.ok(Math.abs(next.z - prop.z - 0.2) < 1e-9);
  }
  assert.equal(endlessLayout(0, c, []).props.length, 0);
  assert.ok(endlessLayout(0, c, ["rock"]).props.every((p) => p.key === "rock"));
});
test("road pool fits width/length/top, scrolls and recycles existing roots, switches back to static", async () => {
  const scene = new Group(),
    view = createObjectView(scene);
  await view.load("environment", file());
  await view.load("road", file({ flat: true }));
  view.configureEnvironment(config({ length: 12 }));
  view.draw(game(0));
  const road = scene.children.filter((r) => r.name.startsWith("road:")),
    stage = scene.children.find((r) => r.name === "environment:0"),
    ids = road.map((r) => r.uuid);
  assert.equal(road.length, 8);
  assert.equal(stage.visible, false);
  let box = new Box3().setFromObject(road[0]);
  assert.ok(Math.abs(box.max.x - box.min.x - 8) < 1e-5);
  assert.ok(Math.abs(box.max.z - box.min.z - 12) < 1e-5);
  assert.ok(Math.abs(box.max.y) < 1e-5);
  const z = road[1].position.z;
  view.draw(game(0.5));
  assert.ok(Math.abs(road[1].position.z - z - 0.5) < 1e-8);
  view.draw(game(100000));
  assert.deepEqual(
    road.map((r) => r.uuid),
    ids,
  );
  view.configureEnvironment(config({ length: 40 }));
  view.draw(game(0));
  box = new Box3().setFromObject(road[0]);
  assert.ok(Math.abs(box.max.z - box.min.z - 40) < 1e-5);
  view.configureEnvironment(defaultEnvironment());
  view.draw(game(5));
  assert.ok(road.every((r) => !r.visible));
  assert.equal(stage.visible, true);
  view.dispose();
  assert.equal(scene.children.length, 0);
});
test("scenery stays outside the road with rotated/offset models; pause/reset/seed changes do not allocate", async () => {
  const scene = new Group(),
    view = createObjectView(scene);
  for (const key of SCATTER_KEYS) await view.load(key, file());
  const t = {
    ...defaultTransform(),
    scale: 2,
    rotation: { x: 15, y: 65, z: -10 },
    offset: { x: -8, y: 0, z: 2 },
  };
  view.configure("tree", t);
  const c = config({ density: 2, clearance: 0.5 });
  view.configureEnvironment(c);
  const ids = scene.children.map((r) => r.uuid);
  for (const distance of [0, 23.99, 24.01, 10000]) {
    const g = game(distance),
      copy = JSON.stringify(g);
    view.draw(g);
    assert.equal(JSON.stringify(g), copy);
    let count = 0;
    for (const root of scene.children.filter((r) => r.visible)) {
      count++;
      const box = new Box3().setFromObject(root);
      assert.ok(
        box.min.x >= 4.5 - 1e-5 || box.max.x <= -4.5 + 1e-5,
        "full model bounds stay outside corridor",
      );
    }
    assert.equal(count, 64);
  }
  view.draw(game(10));
  const poses = scene.children.map((r) => [
    r.visible,
    ...r.position.toArray(),
    r.rotation.y,
    ...r.scale.toArray(),
  ]);
  view.draw(game(10));
  assert.deepEqual(
    scene.children.map((r) => [
      r.visible,
      ...r.position.toArray(),
      r.rotation.y,
      ...r.scale.toArray(),
    ]),
    poses,
  );
  view.configureEnvironment({ ...c, seed: 50 });
  view.draw(game(10));
  assert.deepEqual(
    scene.children.map((r) => r.uuid),
    ids,
  );
  view.dispose();
});
test("heavy repeated models are rejected without replacing a current prop", async () => {
  const source = characterGlb({ animated: false }),
    json = inspectGlb(source),
    v = new DataView(source),
    at = 20 + v.getUint32(12, true);
  json.nodes = Array.from({ length: 17 }, () => ({ mesh: 0 }));
  delete json.skins;
  json.scenes = [{ nodes: json.nodes.map((_, i) => i) }];
  const heavy = new File(
    [packGlb(json, new Uint8Array(source, at + 8))],
    "heavy.glb",
  );
  const scene = new Group(),
    view = createObjectView(scene);
  await view.load("tree", file());
  const old = scene.children[0];
  await assert.rejects(view.load("tree", heavy), /16 meshes/);
  assert.equal(scene.children[0], old);
  view.dispose();
});
test("endless mode, rules, transforms and model references survive browser-local storage reopen", async () => {
  const store = createStudioStore("endless-" + crypto.randomUUID()),
    asset = await store.putAsset(file()),
    p = newProject();
  p.settings.environment = config({
    seed: 77,
    density: 2,
    length: 30,
    clearance: 3,
  });
  p.assetRefs.tree = asset.id;
  p.assetRefs.road = asset.id;
  await store.saveProject(p);
  await store.close();
  const loaded = await store.getProject(p.id);
  assert.deepEqual(loaded.settings.environment, p.settings.environment);
  assert.equal(loaded.assetRefs.road, asset.id);
  await assert.rejects(store.deleteAsset(asset.id), /used/);
  await store.close();
});

test("every assigned scenery category has a nearby representative, with bounded stable pools", () => {
  for (const length of [12, 24, 40])
    for (const density of [1, 2])
      for (const seed of [0, 99, 2026])
        for (const distance of [0, 23.99, 384, 10000]) {
          const layout = endlessLayout(
            distance,
            config({ length, density, seed }),
          );
          for (const key of SCATTER_KEYS) {
            assert.ok(
              layout.props.some((p) => p.key === key && p.z <= 5 && p.z >= -55),
              `${key} within view at ${distance}/${length}`,
            );
            assert.ok(layout.props.filter((p) => p.key === key).length <= 32);
          }
          for (const segment of layout.segments) {
            const props = layout.props.filter((p) =>
              p.id.startsWith(segment.id + ":"),
            );
            assert.deepEqual(
              new Set(props.map((p) => p.key)),
              new Set(SCATTER_KEYS),
            );
          }
        }
});

test("old saved projects gain an empty log slot without replacing their rock reference", () => {
  const old = newProject();
  delete old.settings.objects.log;
  delete old.assetRefs.log;
  old.assetRefs.rock = "existing-rock";
  const project = validateProject(old);
  assert.equal(project.assetRefs.rock, "existing-rock");
  assert.equal(project.assetRefs.log, null);
  assert.deepEqual(project.settings.objects.log, defaultTransform());
});
