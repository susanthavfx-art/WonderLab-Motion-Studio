import { test, expect } from "@playwright/test";
import { characterGlb } from "../fixtures/character-glb.js";
const upload = (name, flat = false) => ({
  name,
  mimeType: "model/gltf-binary",
  buffer: Buffer.from(characterGlb({ animated: false, flat })),
});
test("endless rules persist across reload and edits pause gameplay; no assets required for fallback", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept());
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("#environmentMode").selectOption("endless");
  await expect(page.locator("#environmentStatus")).toContainText(
    "Endless track",
  );
  for (const [id, value] of [
    ["environmentLength", "12"],
    ["environmentClearance", "3"],
    ["environmentSeed", "77"],
  ]) {
    await page.locator("#" + id).fill(value);
    await page.locator("#" + id).press("Tab");
  }
  await page.locator("#environmentDensity").selectOption("2");
  await page.locator("#keyboardTab").click();
  await page.locator("#playRunner").click();
  await expect(page.locator("#runnerState")).toHaveText("RUNNING", {
    timeout: 15000,
  });
  await expect
    .poll(async () => Number(await page.locator("#gameScore").textContent()))
    .toBeGreaterThan(20);
  await page.locator("#environmentSeed").fill("88");
  await page.locator("#environmentSeed").press("Tab");
  await expect(page.locator("#runnerState")).toHaveText("PAUSED");
  const score = await page.locator("#gameScore").textContent();
  await page.waitForTimeout(500);
  await expect(page.locator("#gameScore")).toHaveText(score);
  await page.locator("#projectName").fill("Endless jungle");
  await page.locator("#saveProject").click();
  await expect(page.locator("#projectState")).toContainText("Saved locally");
  await page.reload();
  await page.locator("#openProjects").click();
  await page
    .locator("#projectList")
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(page.locator("#projectState")).toContainText("Saved locally");
  await expect(page.locator("#environmentMode")).toHaveValue("endless");
  await expect(page.locator("#environmentLength")).toHaveValue("12");
  await expect(page.locator("#environmentClearance")).toHaveValue("3");
  await expect(page.locator("#environmentSeed")).toHaveValue("88");
  await expect(page.locator("#environmentDensity")).toHaveValue("2");
  await page.locator("#newProject").click();
  await expect(page.locator("#environmentMode")).toHaveValue("static");
  await expect(page.locator("#environmentLength")).toHaveValue("24");
  expect(errors).toEqual([]);
});
test("road and tree/rock/bush/log library slots can be reused in an endless project and switched to static", async ({
  page,
}) => {
  test.setTimeout(120000);
  page.on("dialog", (d) => d.accept());
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("#environmentMode").selectOption("endless");
  await page.locator("#slot-road summary").click();
  await page
    .locator("#objectFile-road")
    .setInputFiles(upload("road.glb", true));
  await expect(page.locator("#objectStatus-road")).toContainText("road.glb", {
    timeout: 20000,
  });
  await page.locator("#openAssets").click();
  await page.locator("#libraryFile").setInputFiles(upload("jungle-prop.glb"));
  await expect(page.locator("#studioStatus")).toContainText("Asset imported", {
    timeout: 20000,
  });
  for (const slot of ["tree", "rock", "bush", "log"]) {
    await page
      .locator("#assetList")
      .getByRole("button", { name: `Use as ${slot}`, exact: true })
      .click();
    await expect(page.locator("#studioStatus")).toContainText(
      `as ${slot}. Save`,
      { timeout: 20000 },
    );
  }
  await page.locator('[data-close="assetsDialog"]').click();
  await page.locator("#projectName").fill("GLB endless");
  await page.locator("#saveProject").click();
  await expect(page.locator("#projectState")).toContainText("Saved locally");
  await page.reload();
  await page.locator("#openProjects").click();
  await page
    .locator("#projectList")
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(page.locator("#projectState")).toContainText("Saved locally", {
    timeout: 30000,
  });
  for (const slot of ["tree", "rock", "bush", "log"])
    await expect(page.locator("#objectStatus-" + slot)).toContainText(
      "jungle-prop.glb",
    );
  await expect(page.locator("#objectStatus-road")).toContainText("road.glb");
  await expect(page.locator("#environmentMode")).toHaveValue("endless");
  await page.locator("#environmentMode").selectOption("static");
  await expect(page.locator("#environmentStatus")).toContainText(
    "Static stage",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
