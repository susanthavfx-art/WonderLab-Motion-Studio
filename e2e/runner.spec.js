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

test("game-side camera monitor shares capture, calibration, mirroring and stop in focus view", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.cameraRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => {
      window.cameraRequests++;
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#325c40";
      ctx.fillRect(0, 0, 640, 480);
      return canvas.captureStream(15);
    };
  });
  // Exercise the production capture/UI lifecycle, with deterministic synthetic
  // pose results instead of a real human or network-fetched ML inference.
  await page.route("**/assets/pose-*.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `
    window.Pose=class {
      setOptions(){} onResults(cb){this.cb=cb;} async initialize(){} async close(){}
      async send(){const p=Array.from({length:33},()=>({x:.5,y:.4,visibility:.99}));
        for(const [i,x,y] of [[0,.5,.1],[11,.4,.3],[12,.6,.3],[13,.35,.4],[14,.65,.4],[15,.3,.5],[16,.7,.5],[23,.43,.55],[24,.57,.55],[25,.43,.73],[26,.57,.73],[27,.43,.92],[28,.57,.92]])Object.assign(p[i],{x,y});
        this.cb({poseLandmarks:p});}
    };`,
    }),
  );
  await page.goto("/");
  await page.locator("#expandRunner").click();
  await expect(page.locator("#monitorEnable")).toBeInViewport();
  await page.locator("#monitorEnable").click();
  await expect(page.locator("#monitorBadge")).toHaveText("LIVE", {
    timeout: 15000,
  });
  await expect(page.locator("#monitor-torso")).toHaveText("Torso ✓");
  await expect(page.locator("#monitorCanvas")).toBeVisible();
  await expect(page.locator("#monitorCanvas")).toBeInViewport();
  await expect(page.locator("#runner")).toBeInViewport();
  expect(await page.evaluate(() => window.cameraRequests)).toBe(1);
  const boxes = await page.evaluate(() => ({
    game: document.getElementById("runner").getBoundingClientRect().toJSON(),
    monitor: document
      .querySelector(".runner-monitor")
      .getBoundingClientRect()
      .toJSON(),
  }));
  expect(boxes.monitor.x).toBeGreaterThanOrEqual(boxes.game.right);
  await page.locator("#monitorCalibrate").click();
  await expect(page.locator("#monitorStatus")).toContainText("Calibrated", {
    timeout: 15000,
  });
  expect(await page.evaluate(() => window.cameraRequests)).toBe(1);
  expect(
    await page
      .locator("#monitorCanvas")
      .evaluate((c) => c.getContext("2d").getImageData(0, 0, 1, 1).data[3]),
  ).toBe(255);
  await expect(page.locator("#monitorCanvas")).toHaveCSS(
    "transform",
    "matrix(-1, 0, 0, 1, 0, 0)",
  );
  await page.evaluate(() => {
    document.getElementById("mirror").click();
  });
  await expect(page.locator("#monitorCanvas")).toHaveCSS("transform", "none");
  await page.locator("#playRunner").click();
  await expect(page.locator("#runnerState")).toHaveText("RUNNING", {
    timeout: 15000,
  });
  await page.locator("#monitorStop").click();
  await expect(page.locator("#runnerState")).toHaveText("PAUSED");
  await expect(page.locator("#monitorCanvas")).toBeHidden();
  await expect(page.locator("#monitorBadge")).toHaveText("CAMERA OFF");
  await expect(page.locator("#monitorCalibrate")).toBeDisabled();
  await page.locator("#monitorKeyboard").click();
  await expect(page.locator("#monitorBadge")).toHaveText("KEYBOARD");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
