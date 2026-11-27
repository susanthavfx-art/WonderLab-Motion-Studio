import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { Box3 } from "three";
import "fake-indexeddb/auto";
import {
  forestCatalog,
  forestStarter,
  importForestAsset,
} from "../src/assets/forest-pack.js";
import { inspectGlb, loadGlb, disposeModel } from "../src/assets/glb.js";
import { createStudioStore } from "../src/projects/storage.js";
import { packGlb } from "../fixtures/character-glb.js";
const read = (e) => fs.readFileSync("public/packs/forest-v1/" + e.file);
const buffer = (bytes) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

test("curated forest catalog has 54 independent low-poly, attributed, integrity-checked assets", () => {
  assert.equal(forestCatalog.assets.length, 54);
  assert.equal(new Set(forestCatalog.assets.map((a) => a.id)).size, 54);
  const counts = {};
  let vertices = 0;
  for (const e of forestCatalog.assets) {
    assert.equal(
      e.suggestedSlot,
      e.category === "deadwood"
        ? "log"
        : ["tree", "rock"].includes(e.category)
          ? e.category
          : "bush",
    );
    const bytes = read(e);
    assert.equal(bytes.length, e.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), e.sha256);
    const j = inspectGlb(buffer(bytes));
    const primitives = j.meshes.flatMap((m) => m.primitives);
    assert.equal(primitives.length, e.meshes);
    assert.ok(e.meshes <= 2);
    assert.ok(e.vertices <= 650);
    assert.equal(j.asset.extras.license.split(" ")[0], "CC-BY-4.0");
    assert.ok(j.asset.extras.modifications.includes("Ragat Vdoo Kaf"));
    assert.ok(j.images.every((im) => im.mimeType === "image/png"));
    vertices += e.vertices;
    counts[e.category] = (counts[e.category] || 0) + 1;
  }
  assert.equal(vertices, 9388);
  assert.deepEqual(counts, {
    tree: 15,
    groundcover: 12,
    deadwood: 9,
    rock: 10,
    bush: 8,
  });
});
test("split assets preserve upright non-empty geometry with centred grounded pivots", async () => {
  for (const e of forestCatalog.assets) {
    const bytes = read(e),
      j = inspectGlb(buffer(bytes)),
      at = 20 + new DataView(buffer(bytes)).getUint32(12, true);
    for (const m of j.materials)
      delete m.pbrMetallicRoughness?.baseColorTexture;
    delete j.textures;
    delete j.images;
    delete j.samplers;
    // Geometry-only load avoids requiring a browser image decoder in Node. Browser tests cover original textures.
    const model = await loadGlb(
      new File([packGlb(j, new Uint8Array(buffer(bytes), at + 8))], e.file),
    );
    const box = new Box3().setFromObject(model.scene);
    assert.ok(Math.abs(box.min.y) < 1e-4, e.id + " is grounded");
    assert.ok(Math.abs(box.min.x + box.max.x) < 1e-4, e.id + " is centred");
    assert.ok(
      Math.abs(box.min.z + box.max.z) < 1e-4,
      e.id + " is centred in depth",
    );
    disposeModel(model);
  }
});
test("built-in import persists attribution and reuses an existing verified local asset", async () => {
  const store = createStudioStore("forest-" + crypto.randomUUID()),
    id = forestStarter()[0];
  let requests = 0;
  const fetcher = async (url) => {
    requests++;
    assert.ok(url.startsWith("./packs/forest-v1/"));
    return new Response(read(forestCatalog.assets.find((a) => a.id === id)));
  };
  const a = await importForestAsset(id, store, { fetcher, base: "./" });
  const b = await importForestAsset(id, store, { fetcher, base: "./" });
  assert.equal(a.id, b.id);
  assert.equal(requests, 1);
  assert.equal((await store.listAssets()).length, 1);
  assert.ok((await store.getAsset(a.id)).attribution.includes("CC BY 4.0"));
  await store.close();
});
test("unknown IDs, failed downloads and integrity failures do not create library records", async () => {
  const store = createStudioStore("forest-" + crypto.randomUUID()),
    id = forestStarter()[0];
  await assert.rejects(importForestAsset("missing", store), /Unknown/);
  await assert.rejects(
    importForestAsset(id, store, {
      fetcher: async () => new Response("", { status: 404 }),
    }),
    /404/,
  );
  await assert.rejects(
    importForestAsset(id, store, { fetcher: async () => new Response("bad") }),
    /integrity/,
  );
  assert.equal((await store.listAssets()).length, 0);
  await store.close();
});
test("damaged previously imported records are not silently overwritten or reused", async () => {
  const store = createStudioStore("forest-" + crypto.randomUUID()),
    e = forestCatalog.assets[0];
  await store.putAsset(
    new File([read(forestCatalog.assets[1])], "other.glb", {
      type: "model/gltf-binary",
    }),
    { sourceKey: `${forestCatalog.id}:${e.sha256}` },
  );
  await assert.rejects(importForestAsset(e.id, store), /damaged/);
  assert.equal((await store.listAssets()).length, 1);
  await store.close();
});
