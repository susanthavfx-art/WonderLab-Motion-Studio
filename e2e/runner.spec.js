import { test, expect } from "@playwright/test";
test("production runner: camera guard, keyboard modes, pause, reset and focus view", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Motion Lab");
  await page.locator("#playRunner").click();
  await expect(page.locator("#toast")).toContainText("Calibrate");
  await page.locator("#keyboardTab").click();
  await page.locator("#runMode").selectOption("steps");
  await page.locator("#playRunner").click();
  await expect(page.locator("#runnerState")).toHaveText("RUNNING", {
    timeout: 15000,
  });
  await expect(page.locator("#gameMessage")).toContainText("Run in place");
  await expect(page.locator("#gameScore")).toHaveText("0");
  await page.keyboard.down("w");
  await expect
    .poll(async () => Number(await page.locator("#gameScore").textContent()))
    .toBeGreaterThan(0);
  await page.keyboard.up("w");
  await page.keyboard.down("d");
  await expect(page.locator("#state-lean")).toHaveText("RIGHT");
  await page.keyboard.up("d");
  await page.keyboard.press("Space");
  await expect(page.locator("#state-jump")).toHaveText("ACTIVE");
  await page.keyboard.press("Escape");
  await expect(page.locator("#runnerState")).toHaveText("PAUSED");
  const score = await page.locator("#gameScore").textContent();
  const time = await page.locator("#gameTime").textContent();
  await page.waitForTimeout(500);
  await expect(page.locator("#gameScore")).toHaveText(score);
  await expect(page.locator("#gameTime")).toHaveText(time);
  await page.locator("#playRunner").click();
  await expect(page.locator("#runnerState")).toHaveText("COUNTDOWN");
  await page.locator("#guide").click();
  await expect(page.locator("#runnerState")).toHaveText("PAUSED");
  await page.locator("#gotIt").click();
  await page.locator("#runMode").selectOption("auto");
  await expect(page.locator("#runnerState")).toHaveText("READY");
  await expect(page.locator("#gameScore")).toHaveText("0");
  await page.locator("#playRunner").click();
  await expect(page.locator("#runnerState")).toHaveText("RUNNING", {
    timeout: 15000,
  });
  await expect
    .poll(async () => Number(await page.locator("#gameScore").textContent()))
    .toBeGreaterThan(0);
  await page.locator("#resetRunner").click();
  await expect(page.locator("#runnerState")).toHaveText("READY");
  await expect(page.locator("#gameLives")).toHaveText("♥ ♥ ♥");
  await page.locator("#expandRunner").click();
  await expect(page.locator("#runnerPanel")).toHaveClass(/focused/);
  await page.locator("#expandRunner").click();
  await expect(page.locator("#runnerPanel")).not.toHaveClass(/focused/);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
