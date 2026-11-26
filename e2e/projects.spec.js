import { test, expect } from "@playwright/test";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
test("client projects persist branding, settings and images across reload; duplicate, rename and delete safely", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto("/");
  await page.locator("#projectName").fill("Client Alpha");
  await page.locator("#brandTitle").fill("ALPHA EVENT");
  await page.locator("#brandPrimary").fill("#112233");
  await page.locator("#runMode").selectOption("steps");
  await page.locator("#runDifficulty").selectOption("hard");
  await page.locator("#jumpInput").selectOption("physical");
  await page.locator("#handsFreeEnabled").uncheck();
  await page.locator("#tune-lean").fill("0.25");
  await page
    .locator("#brandLogo")
    .setInputFiles({ name: "alpha.png", mimeType: "image/png", buffer: png });
  await expect(page.locator("#logoPreview")).toBeVisible();
  await page.locator("#saveProject").click();
  await expect(page.locator("#projectState")).toContainText("Saved locally");
  await page.reload();
  await page.locator("#openProjects").click();
  await expect(page.locator("#projectList .studio-row")).toHaveCount(1);
  await page
    .locator("#projectList button")
    .getByText("Open", { exact: true })
    .click();
  await expect(page.locator("#projectName")).toHaveValue("Client Alpha");
  await expect(page.locator("#brandTitle")).toHaveValue("ALPHA EVENT");
  await expect(page.locator("#brandPrimary")).toHaveValue("#112233");
  await expect(page.locator("#runMode")).toHaveValue("steps");
  await expect(page.locator("#runDifficulty")).toHaveValue("hard");
  await expect(page.locator("#jumpInput")).toHaveValue("physical");
  await expect(page.locator("#handsFreeEnabled")).not.toBeChecked();
  await expect(page.locator("#tune-lean")).toHaveValue("0.25");
  await expect(page.locator("#logoPreview")).toBeVisible();
  await expect(page.locator("#gameScore")).toHaveText("0");
  await expect(page.locator("#runnerState")).not.toHaveText("RUNNING");
  await page.locator("#openProjects").click();
  await page
    .locator("#projectList button")
    .getByText("Duplicate", { exact: true })
    .click();
  await expect(page.locator("#projectList .studio-row")).toHaveCount(2);
  await page.locator('[data-close="projectsDialog"]').click();
  await page.locator("#projectName").fill("Client Alpha renamed");
  await page.locator("#saveProject").click();
  await expect(page.locator("#projectState")).toContainText("Saved locally");
  await page.locator("#openAssets").click();
  await expect(page.locator("#assetList .studio-row")).toHaveCount(1);
  await page
    .locator("#assetList button")
    .getByText("Delete", { exact: true })
    .click();
  await expect(page.locator("#studioStatus")).toContainText(
    "assigned in the current editor",
  );
  await page.locator('[data-close="assetsDialog"]').click();
  await page.locator("#removeLogo").click();
  await page.locator("#saveProject").click();
  await expect(page.locator("#projectState")).toContainText("Saved locally");
  await page.locator("#openAssets").click();
  await page
    .locator("#assetList button")
    .getByText("Delete", { exact: true })
    .click();
  await expect(page.locator("#studioStatus")).toContainText(
    "used by a saved project",
  );
  await page.locator('[data-close="assetsDialog"]').click();
  await page.locator("#openProjects").click();
  await expect(page.locator("#projectList")).toContainText(
    "Client Alpha renamed",
  );
  const copy = page
    .locator("#projectList .studio-row")
    .filter({ has: page.locator("strong", { hasText: "Client Alpha copy" }) });
  await copy.getByText("Delete", { exact: true }).click();
  await expect(page.locator("#projectList .studio-row")).toHaveCount(1);
  await page.locator('[data-close="projectsDialog"]').click();
  await page.locator("#openAssets").click();
  await page
    .locator("#assetList button")
    .getByText("Delete", { exact: true })
    .click();
  await expect(page.locator("#assetList .studio-row")).toHaveCount(0);
  await page.locator('[data-close="assetsDialog"]').click();
  await page.locator("#templatesNav").click();
  await expect(page.locator("#templateList")).toContainText("Wonder Run");
  await page.locator("#templateList button").click();
  await expect(page.locator("#brandTitle")).toHaveValue("WONDER RUN");
  await expect(page.locator("#logoPreview")).toBeHidden();
  await expect(page.locator("#runDifficulty")).toHaveValue("normal");
  expect(errors).toEqual([]);
});
test("shared image library imports validated images and assigns them to a project", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/");
  await page.locator("#openAssets").click();
  await page.locator("#libraryFile").setInputFiles({
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.locator("#studioStatus")).toContainText("do not match");
  await expect(page.locator("#assetList .studio-row")).toHaveCount(0);
  await page.locator("#libraryFile").setInputFiles({
    name: "backdrop.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(page.locator("#assetList .studio-row")).toHaveCount(1);
  await page
    .locator("#assetList button")
    .getByText("Use as background", { exact: true })
    .click();
  await page.locator('[data-close="assetsDialog"]').click();
  await expect(page.locator("#backdropPreviewImage")).toBeVisible();
  await page.locator("#saveProject").click();
  await expect(page.locator("#projectState")).toContainText("Saved locally");
});
