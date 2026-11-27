import { test, expect } from "@playwright/test";
import { characterGlb, packGlb } from "../fixtures/character-glb.js";
const upload = (options) => ({
  name: "actor.glb",
  mimeType: "model/gltf-binary",
  buffer: Buffer.from(characterGlb(options)),
});
test("GLB character animates embedded clips, freezes on pause and persists with project settings", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto("/");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect
    .poll(async () => (await page.locator("#runnerPanel").boundingBox()).width)
    .toBeGreaterThan(600);
  await page.locator("#characterFile").setInputFiles(upload({ texture: true }));
  await expect(page.locator("#characterStatus")).toContainText(
    "4 animation clips",
  );
  await expect(page.locator("#clip-run")).toHaveValue("1");
  await page.locator("#characterScale").fill("1.25");
  await page.locator("#characterFacing").selectOption("90");
  await page.locator("#keyboardTab").click();
  await page.locator("#playRunner").click();
  await expect(page.locator("#characterPlayback")).toContainText(
    "Visual action: run",
    { timeout: 15000 },
  );
  await expect
    .poll(async () =>
      Number(
        await page
          .locator("#characterPlayback")
          .getAttribute("data-animation-time"),
      ),
    )
    .toBeGreaterThan(0.2);
  await page.keyboard.press("Escape");
  await expect(page.locator("#runnerState")).toHaveText("PAUSED");
  const paused = await page
    .locator("#characterPlayback")
    .getAttribute("data-animation-time");
  await page.waitForTimeout(300);
  await expect(page.locator("#characterPlayback")).toHaveAttribute(
    "data-animation-time",
    paused,
  );
  await page.locator("#playRunner").click();
  await expect(page.locator("#runnerState")).toHaveText("RUNNING", {
    timeout: 15000,
  });
  await page.keyboard.press("Space");
  await expect(page.locator("#characterPlayback")).toContainText(
    "Visual action: jump",
  );
  await expect(page.locator("#characterPlayback")).toContainText(
    "Visual action: run",
  );
  await page.keyboard.down("s");
  await expect(page.locator("#characterPlayback")).toContainText(
    "Visual action: duck",
  );
  await page.keyboard.up("s");
  await page.keyboard.press("Escape");
  await page.locator("#characterFile").setInputFiles({
    name: "fake.glb",
    mimeType: "model/gltf-binary",
    buffer: Buffer.from("bad"),
  });
  await expect(page.locator("#characterStatus")).toContainText(
    "Character not changed",
  );
  await expect(page.locator("#clip-run")).toHaveValue("1");
  await page.locator("#projectName").fill("Animated client");
  await page.locator("#saveProject").click();
  await expect(page.locator("#projectState")).toContainText("Saved locally");
  await page.reload();
  await page.locator("#openProjects").click();
  await page
    .locator("#projectList")
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(page.locator("#characterStatus")).toContainText(
    "4 animation clips",
  );
  await expect(page.locator("#characterScale")).toHaveValue("1.25");
  await expect(page.locator("#characterFacing")).toHaveValue("90");
  await expect(page.locator("#clip-jump")).toHaveValue("2");
  await page.locator("#openAssets").click();
  await expect(page.locator("#assetList")).toContainText("model/gltf-binary");
  await expect(
    page
      .locator("#assetList")
      .getByRole("button", { name: "Use as character", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("#assetList").getByRole("button", { name: "Use as logo" }),
  ).toHaveCount(0);
  await page
    .locator("#assetList")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.locator("#studioStatus")).toContainText(
    "assigned in the current editor",
  );
  await page.locator('[data-close="assetsDialog"]').click();
  await page.locator("#removeCharacter").click();
  await expect(page.locator("#characterPlayback")).toContainText(
    "No custom character",
  );
  await page.locator("#openAssets").click();
  await page
    .locator("#assetList")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.locator("#studioStatus")).toContainText(
    "used by a saved project",
  );
  await page
    .locator("#assetList")
    .getByRole("button", { name: "Use as character", exact: true })
    .click();
  await expect(page.locator("#characterStatus")).toContainText(
    "4 animation clips",
  );
  await page.locator('[data-close="assetsDialog"]').click();
  await page.locator("#newProject").click();
  await expect(page.locator("#characterPlayback")).toContainText(
    "No custom character",
  );
  await expect(page.locator("#clip-run")).toHaveValue("");
  expect(errors).toEqual([]);
});
test("library rejects external GLB resources before requests and accepts static GLB", async ({
  page,
}) => {
  const external = [];
  page.on("request", (r) => {
    if (r.url().includes("blocked.example")) external.push(r.url());
  });
  await page.goto("/");
  await page.locator("#openAssets").click();
  await page.locator("#libraryFile").setInputFiles({
    name: "external.glb",
    mimeType: "model/gltf-binary",
    buffer: Buffer.from(
      packGlb({
        asset: { version: "2.0" },
        buffers: [{ uri: "https://blocked.example/a.bin", byteLength: 16 }],
      }),
    ),
  });
  await expect(page.locator("#studioStatus")).toContainText("self-contained");
  expect(external).toEqual([]);
  await page
    .locator("#libraryFile")
    .setInputFiles(upload({ texture: "invalid" }));
  await expect(page.locator("#studioStatus")).toContainText(
    "texture could not be decoded",
  );
  await page.locator("#libraryFile").setInputFiles(upload({ animated: false }));
  await expect(page.locator("#assetList .studio-row")).toHaveCount(1);
  await page
    .locator("#assetList")
    .getByRole("button", { name: "Use as character", exact: true })
    .click();
  await expect(page.locator("#characterStatus")).toContainText("Static model", {
    timeout: 20000,
  });
  await page.locator('[data-close="assetsDialog"]').click();
  await expect(page.locator("#clip-idle option")).toHaveCount(1);
});

test("uploaded GLB gets a static library thumbnail without changing assignment", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#openAssets").click();
  await page.locator("#libraryFile").setInputFiles(upload({ animated: false }));
  const frame = page.locator("#assetList .asset-thumbnail");
  await frame.scrollIntoViewIfNeeded();
  await expect(frame.locator("img")).toBeVisible({ timeout: 20000 });
  await expect
    .poll(() => frame.locator("img").evaluate((img) => img.naturalWidth))
    .toBe(192);
  await expect(page.locator("#characterStatus")).not.toContainText("actor.glb");
});
