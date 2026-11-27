import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { newProject, validateProject } from "../src/projects/schema.js";
import { createStudioStore } from "../src/projects/storage.js";
import { listTemplates, getTemplate } from "../src/templates/registry.js";

test("project schema whitelists data and rejects unsupported versions, settings and refs", () => {
  const p = newProject("Client A");
  assert.equal(validateProject(p).settings.difficulty, "normal");
  assert.equal(
    validateProject({ ...p, executable: "bad" }).executable,
    undefined,
  );
  for (const patch of [
    { schemaVersion: 2 },
    { templateId: "unknown" },
    { templateVersion: 2 },
    { settings: { ...p.settings, mode: "bad" } },
    {
      settings: {
        ...p.settings,
        thresholds: { ...p.settings.thresholds, lean: Infinity },
      },
    },
    { assetRefs: { logo: 42 } },
    { branding: { ...p.branding, primary: "red" } },
  ])
    assert.throws(() => validateProject({ ...p, ...patch }));
  assert.equal(listTemplates()[0].id, "runner");
  assert.equal(getTemplate("runner").assetSlots.length, 11);
  assert.throws(() => getTemplate("unknown"));
});
test("IndexedDB projects survive reopen, duplicate independently and retain referenced assets", async () => {
  const name = "test-" + crypto.randomUUID();
  let store = createStudioStore(name);
  const file = new Blob(["image"], { type: "image/png" });
  const asset = await store.putAsset(file);
  const p = newProject("Client A");
  p.assetRefs.logo = asset.id;
  await store.saveProject(p);
  await store.close();
  store = createStudioStore(name);
  const loaded = await store.getProject(p.id);
  assert.equal(loaded.assetRefs.logo, asset.id);
  const copy = { ...loaded, id: crypto.randomUUID(), name: "Client B" };
  await store.saveProject(copy);
  await assert.rejects(store.deleteAsset(asset.id), /used by a saved project/);
  await store.deleteProject(p.id);
  assert.equal((await store.getProject(copy.id)).name, "Client B");
  await assert.rejects(store.deleteAsset(asset.id));
  copy.assetRefs.logo = null;
  await store.saveProject(copy);
  await store.deleteAsset(asset.id);
  assert.equal((await store.listAssets()).length, 0);
  await store.deleteProject(copy.id);
  assert.equal((await store.listProjects()).length, 0);
  await store.close();
});
test("failed asset reference save preserves existing project; invalid library types are rejected", async () => {
  const store = createStudioStore("test-" + crypto.randomUUID()),
    p = newProject();
  await store.saveProject(p);
  await assert.rejects(
    store.saveProject({
      ...p,
      name: "Bad replacement",
      assetRefs: { logo: "missing", background: null },
    }),
    /missing/,
  );
  assert.equal((await store.getProject(p.id)).name, p.name);
  await assert.rejects(
    store.putAsset(new Blob(["svg"], { type: "image/svg+xml" })),
  );
  await store.close();
});
