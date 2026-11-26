import { test } from "node:test";
import assert from "node:assert/strict";
import {
  brandDefaults,
  normalizeBrand,
  validateImageFile,
  readableInk,
} from "../src/branding.js";
test("branding defaults, bounded plain-text title and strict hex colours", () => {
  assert.deepEqual(normalizeBrand(), brandDefaults);
  assert.equal(readableInk("#ffffff"), "#000000");
  assert.equal(readableInk("#000000"), "#ffffff");
  assert.equal(normalizeBrand({ title: "  Event Run  " }).title, "Event Run");
  assert.equal(normalizeBrand({ title: "x".repeat(100) }).title.length, 60);
  assert.equal(normalizeBrand({ title: "   " }).title, brandDefaults.title);
  assert.equal(
    normalizeBrand({ primary: "url(javascript:bad)" }).primary,
    brandDefaults.primary,
  );
  assert.equal(normalizeBrand({ accent: "#AABBCC" }).accent, "#AABBCC");
  assert.equal(
    normalizeBrand({ title: "<img onerror=alert(1)>" }).title,
    "<img onerror=alert(1)>",
  );
});
test("image validation restricts formats, slots, empty and oversized uploads", () => {
  assert.doesNotThrow(() =>
    validateImageFile({ type: "image/png", size: 1024 }, "logo"),
  );
  assert.doesNotThrow(() =>
    validateImageFile(
      { type: "image/webp", size: 4 * 1024 * 1024 },
      "background",
    ),
  );
  for (const type of ["image/svg+xml", "image/gif", "text/html"])
    assert.throws(() => validateImageFile({ type, size: 100 }, "logo"), /PNG/);
  assert.throws(
    () => validateImageFile({ type: "image/jpeg", size: 0 }, "logo"),
    /empty/,
  );
  assert.throws(
    () =>
      validateImageFile({ type: "image/png", size: 3 * 1024 * 1024 }, "logo"),
    /2 MB/,
  );
  assert.throws(
    () =>
      validateImageFile(
        { type: "image/png", size: 9 * 1024 * 1024 },
        "background",
      ),
    /8 MB/,
  );
  assert.throws(
    () => validateImageFile({ type: "image/png", size: 100 }, "unknown"),
    /Unknown/,
  );
});

test("image slots replace atomically, reject fake formats and release removed/stale URLs", async () => {
  const { createBrandAssets } = await import("../src/branding.js");
  const oldImage = globalThis.Image,
    oldCreate = URL.createObjectURL,
    oldRevoke = URL.revokeObjectURL;
  const pending = [],
    revoked = [],
    changes = [];
  let id = 0;
  globalThis.Image = class {
    naturalWidth = 100;
    naturalHeight = 50;
    decode() {
      return new Promise((resolve, reject) =>
        pending.push({ resolve, reject, image: this }),
      );
    }
  };
  URL.createObjectURL = () => `blob:test-${++id}`;
  URL.revokeObjectURL = (url) => revoked.push(url);
  const file = () =>
    Object.assign(
      new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])], {
        type: "image/png",
      }),
      { name: "brand.png" },
    );
  const assets = createBrandAssets(
    (slot, url) => changes.push([slot, url]),
    () => {},
  );
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  try {
    const first = assets.load(file(), "logo");
    await flush();
    pending.shift().resolve();
    await first;
    assert.deepEqual(changes.at(-1), ["logo", "blob:test-1"]);
    const broken = assets.load(file(), "logo");
    await flush();
    pending.shift().reject(Error("Bad image"));
    await assert.rejects(broken, /Bad image/);
    assert.deepEqual(changes.at(-1), ["logo", "blob:test-1"]);
    assert.ok(!revoked.includes("blob:test-1"));
    const stale = assets.load(file(), "logo");
    await flush();
    assets.remove("logo");
    pending.shift().resolve();
    await stale;
    assert.deepEqual(changes.at(-1), ["logo", null]);
    assert.ok(revoked.includes("blob:test-1"));
    assert.ok(revoked.includes("blob:test-3"));
    const tooLarge = assets.load(file(), "background");
    await flush();
    const job = pending.shift();
    job.image.naturalWidth = 5000;
    job.resolve();
    await assert.rejects(tooLarge, /too large/);
    const fake = Object.assign(new Blob(["<svg/>"], { type: "image/png" }), {
      name: "fake.png",
    });
    await assert.rejects(assets.load(fake, "logo"), /contents/);
    assets.dispose();
  } finally {
    globalThis.Image = oldImage;
    URL.createObjectURL = oldCreate;
    URL.revokeObjectURL = oldRevoke;
  }
});
