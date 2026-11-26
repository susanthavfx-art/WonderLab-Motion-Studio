import { test, expect } from "@playwright/test";
import { characterGlb } from "../fixtures/character-glb.js";
const keys = ["environment", "jumpObstacle", "duckObstacle", "collectible"];
const model = (name = "prop.glb", options = {}) => ({
  name,
  mimeType: "model/gltf-binary",
  buffer: Buffer.from(characterGlb({ animated: false, ...options })),
});
test("shared GLB object slots persist transforms, reuse models, reset and retain deletion protection", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto("/");
  await page.locator("#openAssets").click();
  await page.locator("#libraryFile").setInputFiles(model("shared.glb"));
  await expect(page.locator("#studioStatus")).toContainText("Asset imported");
  for (const key of keys) {
    await page
      .locator("#assetList")
      .getByRole("button", { name: `Use as ${key}`, exact: true })
      .click();
    await expect(page.locator("#studioStatus")).toContainText(
      `as ${key}. Save`,
      { timeout: 20000 },
    );
  }
  await page.locator('[data-close="assetsDialog"]').click();
  for (const key of keys) {
    await expect(page.locator("#objectStatus-" + key)).toContainText(
      "shared.glb",
    );
    await page.locator("#slot-" + key + " summary").click();
    await page.locator(`#object-${key}-scale`).fill("1.5");
    await page.locator(`#object-${key}-scale`).press("Tab");
    await page.locator(`#object-${key}-rotation-y`).fill("45");
    await page.locator(`#object-${key}-rotation-y`).press("Tab");
    await page.locator(`#object-${key}-offset-x`).fill("0.2");
    await page.locator(`#object-${key}-offset-x`).press("Tab");
  }
  await page.locator("#projectName").fill("3D client");
  await page.locator("#saveProject").click();
  await expect(page.locator("#projectState")).toContainText("Saved locally");
  await page.reload();
  await page.locator("#openProjects").click();
  await page
    .locator("#projectList")
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(page.locator("#projectState")).toContainText("Saved locally");
  for (const key of keys) {
    await page.locator("#slot-" + key + " summary").click();
    await expect(page.locator("#objectStatus-" + key)).toContainText(
      "shared.glb",
    );
    await expect(page.locator(`#object-${key}-scale`)).toHaveValue("1.5");
    await expect(page.locator(`#object-${key}-rotation-y`)).toHaveValue("45");
    await expect(page.locator(`#object-${key}-offset-x`)).toHaveValue("0.2");
  }
  await page.locator("#objectTransformReset-environment").click();
  await expect(page.locator("#object-environment-scale")).toHaveValue("1");
  await expect(page.locator("#object-environment-offset-x")).toHaveValue("0");
  await expect(page.locator("#objectStatus-environment")).toContainText(
    "shared.glb",
  );
  await page.locator("#objectFile-jumpObstacle").setInputFiles({
    name: "bad.glb",
    mimeType: "model/gltf-binary",
    buffer: Buffer.from("bad"),
  });
  await expect(page.locator("#objectStatus-jumpObstacle")).toContainText(
    "Object not changed",
  );
  await page.locator("#saveProject").click();
  await expect(page.locator("#projectState")).toContainText("Saved locally");
  await page.locator("#keyboardTab").click();
  await page.locator("#playRunner").click();
  await expect(page.locator("#runnerState")).toHaveText("RUNNING", {
    timeout: 15000,
  });
  await page.locator("#object-collectible-rotation-z").fill("90");
  await page.locator("#object-collectible-rotation-z").press("Tab");
  await expect(page.locator("#runnerState")).toHaveText("PAUSED");
  await page.locator("#openAssets").click();
  await expect(page.locator("#assetList .studio-row")).toHaveCount(1);
  await page
    .locator("#assetList")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.locator("#studioStatus")).toContainText(
    "assigned in the current editor",
  );
  await page.locator('[data-close="assetsDialog"]').click();
  for (const key of keys) {
    await page.locator("#objectDefault-" + key).click();
    await expect(page.locator("#objectStatus-" + key)).toContainText(
      "Default geometry",
    );
    await expect(page.locator(`#object-${key}-scale`)).toHaveValue("1");
  }
  await page.locator("#openAssets").click();
  await page
    .locator("#assetList")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.locator("#studioStatus")).toContainText(
    "used by a saved project",
  );
  await page.locator('[data-close="assetsDialog"]').click();
  await page.locator("#saveProject").click();
  await expect(page.locator("#projectState")).toContainText("Saved locally");
  await page.locator("#openAssets").click();
  await page
    .locator("#assetList")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.locator("#assetList .studio-row")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("flat scenery is allowed; new project restores defaults and mobile layout does not overflow", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/");
  await page.locator("#slot-environment summary").click();
  await page
    .locator("#objectFile-environment")
    .setInputFiles(model("floor.glb", { flat: true }));
  await expect(page.locator("#objectStatus-environment")).toContainText(
    "floor.glb",
  );
  await page.locator("#newProject").click();
  await expect(page.locator("#objectStatus-environment")).toContainText(
    "Default geometry",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  for (const key of keys) {
    const details = page.locator("#slot-" + key);
    if (!(await details.evaluate((el) => el.open)))
      await details.locator("summary").click();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
