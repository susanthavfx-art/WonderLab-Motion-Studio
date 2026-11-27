import { test, expect } from "@playwright/test";
import { forestCatalog, forestStarter } from "../src/assets/forest-pack.js";
test("curated starter models import on demand, retain credits, assign, save and reload without duplicates", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = [],
    downloads = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/\/packs\/forest-v1\/[^/]+\.glb$/.test(r.url()))
      downloads.push(r.url());
  });
  await page.goto("/");
  expect(downloads).toHaveLength(0);
  await page.locator("#environmentMode").selectOption("endless");
  await page.locator("#openAssets").click();
  await expect(page.locator(".forest-catalog")).toContainText("Ragat Vdoo Kaf");
  await expect(page.locator("#forestInfo")).toContainText("2 meshes");
  await page.locator("#importForestStarter").click();
  await expect(page.locator("#studioStatus")).toContainText(
    "Forest Pack ready",
    { timeout: 30000 },
  );
  await expect(page.locator("#assetList .studio-row")).toHaveCount(3);
  await page.locator("#importForestStarter").click();
  await expect(page.locator("#studioStatus")).toContainText(
    "Forest Pack ready",
  );
  await expect(page.locator("#assetList .studio-row")).toHaveCount(3);
  expect(downloads).toHaveLength(3);
  for (const id of forestStarter()) {
    const e = forestCatalog.assets.find((a) => a.id === id),
      row = page
        .locator("#assetList .studio-row")
        .filter({ hasText: "forest-" + e.file });
    await expect(row).toContainText("CC BY 4.0");
    await row
      .getByRole("button", { name: `Use as ${e.suggestedSlot}`, exact: true })
      .click();
    await expect(page.locator("#studioStatus")).toContainText(
      `as ${e.suggestedSlot}. Save`,
      { timeout: 20000 },
    );
  }
  await page.locator('[data-close="assetsDialog"]').click();
  for (const key of ["tree", "rock", "bush"])
    await expect(page.locator("#objectStatus-" + key)).toContainText("forest-");
  await page.locator("#projectName").fill("Forest client");
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
  for (const key of ["tree", "rock", "bush"])
    await expect(page.locator("#objectStatus-" + key)).toContainText("forest-");
  expect(errors).toEqual([]);
});
test("catalog lists every category and reports a failed selected import without a false success", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#openAssets").click();
  for (const [category, count] of [
    ["tree", 15],
    ["rock", 10],
    ["bush", 8],
    ["deadwood", 9],
    ["groundcover", 12],
  ]) {
    await page.locator("#forestCategory").selectOption(category);
    await expect(page.locator("#forestAsset option")).toHaveCount(count);
  }
  await page.route("**/packs/forest-v1/*.glb", (r) =>
    r.fulfill({ status: 404, body: "missing" }),
  );
  await page.locator("#importForest").click();
  await expect(page.locator("#studioStatus")).toContainText(
    "download failed (404)",
    { timeout: 20000 },
  );
  await expect(page.locator("#assetList .studio-row")).toHaveCount(0);
});

test("forest thumbnail cards select models visually without downloading GLBs", async ({
  page,
}) => {
  const models = [];
  page.on("request", (r) => {
    if (/\/packs\/forest-v1\/[^/]+\.glb$/.test(r.url())) models.push(r.url());
  });
  await page.goto("/");
  await page.locator("#openAssets").click();
  await expect(page.locator(".forest-thumbnail-card")).toHaveCount(15);
  const first = page.locator(".forest-thumbnail-card").first();
  await expect(first.locator("img")).toBeVisible();
  await expect
    .poll(() =>
      first
        .locator("img")
        .evaluate((img) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  const second = page.locator(".forest-thumbnail-card").nth(1);
  const id = await second.getAttribute("data-id");
  await second.click();
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#forestAsset")).toHaveValue(id);
  await page.locator("#forestCategory").selectOption("rock");
  await expect(page.locator(".forest-thumbnail-card")).toHaveCount(10);
  expect(models).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("actual forest trees, rocks, bushes and logs coexist and retain independent slots on reload", async ({
  page,
}) => {
  test.setTimeout(150000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("#environmentMode").selectOption("endless");
  await page.locator("#openAssets").click();
  const chosen = [];
  for (const [category, slot] of [
    ["tree", "tree"],
    ["rock", "rock"],
    ["bush", "bush"],
    ["deadwood", "log"],
  ]) {
    const entry =
      category === "tree"
        ? forestCatalog.assets.find((a) => a.id === "tree-trunk-010-28")
        : forestCatalog.assets.find((a) => a.category === category);
    chosen.push([slot, entry]);
    await page.locator("#forestCategory").selectOption(category);
    await page.locator("#forestAsset").selectOption(entry.id);
    await page.locator("#importForest").click();
    await expect(page.locator("#studioStatus")).toContainText(
      "Forest Pack ready",
      { timeout: 30000 },
    );
    const row = page
      .locator("#assetList .studio-row")
      .filter({ hasText: "forest-" + entry.file });
    await row
      .getByRole("button", { name: `Use as ${slot}`, exact: true })
      .click();
    await expect(page.locator("#studioStatus")).toContainText(
      `as ${slot}. Save`,
      { timeout: 20000 },
    );
  }
  await page.locator('[data-close="assetsDialog"]').click();
  for (const [slot, entry] of chosen)
    await expect(page.locator("#objectStatus-" + slot)).toContainText(
      entry.file,
    );
  await page.locator("#projectName").fill("All four forest types");
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
  for (const [slot, entry] of chosen)
    await expect(page.locator("#objectStatus-" + slot)).toContainText(
      entry.file,
    );
  await page.locator("#runnerPanel").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/forest-four-types.png" });
  expect(errors).toEqual([]);
});
