import { test, expect } from "@playwright/test";
test("production runner: camera guard, keyboard modes, pause, reset and focus view", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("#handsFreeEnabled").uncheck();
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
  await mockPoseCamera(page);
  await page.goto("/");
  await page.locator("#handsFreeEnabled").uncheck();
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
  // Same full-body pose, feet on floor: raise hands instead of physically jumping.
  await page.evaluate(() => {
    window.handsRaised = true;
  });
  await expect(page.locator("#state-jump")).toHaveText("ACTIVE");
  await expect(page.locator("#runnerState")).toHaveText("RUNNING");
  await page.waitForTimeout(700);
  await expect(page.locator("#state-jump")).toHaveText("IDLE");
  await page.locator("#jumpInput").selectOption("physical");
  await expect(page.locator("#runnerState")).toHaveText("PAUSED");
  await expect(page.locator("#title-jump")).toHaveText("Physical jump");
  await expect(page.locator("#tuneLabel-jump")).toHaveText(
    "Physical jump lift",
  );
  await page.evaluate(() => {
    window.handsRaised = false;
  });
  await page.waitForTimeout(350);
  await page.locator("#playRunner").click();
  await expect(page.locator("#runnerState")).toHaveText("RUNNING", {
    timeout: 15000,
  });
  await page.evaluate(() => {
    window.handsRaised = true;
  });
  await page.waitForTimeout(350);
  await expect(page.locator("#state-jump")).toHaveText("IDLE");
  await page.evaluate(() => {
    window.handsRaised = false;
    window.bodyLift = true;
  });
  await expect(page.locator("#state-jump")).toHaveText("ACTIVE");
  await expect(page.locator("#runnerState")).toHaveText("RUNNING");
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

async function mockPoseCamera(page) {
  await page.addInitScript(() => {
    window.cameraRequests = 0;
    window.poseVisible = true;
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
      async send(){if(window.poseVisible===false){this.cb({poseLandmarks:null});return;}const p=Array.from({length:33},()=>({x:.5,y:.4,visibility:.99}));
        for(const [i,x,y] of [[0,.5,.1],[11,.4,.3],[12,.6,.3],[13,.35,.4],[14,.65,.4],[15,.3,.5],[16,.7,.5],[23,.43,.55],[24,.57,.55],[25,.43,.73],[26,.57,.73],[27,.43,.92],[28,.57,.92]])Object.assign(p[i],{x,y});
        if(window.handsRaised){p[15].y=.23;p[16].y=.23;}
        if(window.bodyLift){for(const point of p)point.y-=.06;}
        this.cb({poseLandmarks:p});}
    };`,
    }),
  );
}

test("hands-free camera start calibrates without clicking and cancels safely", async ({
  page,
}) => {
  await mockPoseCamera(page);
  await page.goto("/");
  await page.evaluate(() => {
    window.poseVisible = false;
  });
  await page.locator("#expandRunner").click();
  await page.locator("#monitorEnable").click();
  await expect(page.locator("#monitorBadge")).toHaveText("LIVE", {
    timeout: 15000,
  });
  await expect(page.locator("#playRunner")).toHaveText("Cancel auto-start");
  await page.waitForTimeout(800);
  await expect(page.locator("#runnerState")).toHaveText("READY");
  // User steps back; no Calibrate or Start click is made.
  await page.evaluate(() => {
    window.poseVisible = true;
  });
  await expect(page.locator("#runnerState")).toHaveText("COUNTDOWN", {
    timeout: 15000,
  });
  await expect(page.locator("#gameScore")).toHaveText("0");
  // Losing the body aborts countdown and freezes the world.
  await page.evaluate(() => {
    window.poseVisible = false;
  });
  await expect(page.locator("#runnerState")).toHaveText("PAUSED");
  await page.waitForTimeout(600);
  await expect(page.locator("#gameScore")).toHaveText("0");
  await page.evaluate(() => {
    window.poseVisible = true;
  });
  await expect(page.locator("#runnerState")).toHaveText("COUNTDOWN", {
    timeout: 15000,
  });
  await expect(page.locator("#runnerState")).toHaveText("RUNNING", {
    timeout: 15000,
  });
  // Explicit operator pause must not auto-resume with the body still in view.
  await page.keyboard.press("Escape");
  await expect(page.locator("#runnerState")).toHaveText("PAUSED");
  await page.waitForTimeout(900);
  await expect(page.locator("#runnerState")).toHaveText("PAUSED");
  // Re-arm near computer, then step back; no fresh mouse click at full distance.
  await page.evaluate(() => {
    window.poseVisible = false;
  });
  await page.locator("#playRunner").click();
  await expect(page.locator("#playRunner")).toHaveText("Cancel auto-start");
  await page.evaluate(() => {
    window.poseVisible = true;
  });
  await expect(page.locator("#runnerState")).toHaveText("COUNTDOWN", {
    timeout: 15000,
  });
  await page.locator("#monitorStop").click();
  await expect(page.locator("#monitorBadge")).toHaveText("CAMERA OFF");
  await expect(page.locator("#playRunner")).toHaveText("Step back to start");
});

test("branding previews safe text, colours, raster images, replacement, focus and reset", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const hostile = "<img src=x onerror=alert(1)>";
  await page.locator("#brandTitle").fill(hostile);
  await expect(page.locator(".runner-label [data-brand-title]")).toHaveText(
    hostile,
  );
  await expect(
    page.locator(".runner-label [data-brand-title] img"),
  ).toHaveCount(0);
  await page.locator("#brandTitle").fill("ACME Motion Sprint");
  await page.locator("#brandPrimary").evaluate((el) => {
    el.value = "#f04466";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator("#brandAccent").evaluate((el) => {
    el.value = "#2544aa";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator("#brandBackground").evaluate((el) => {
    el.value = "#e9d8ff";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#runner")).toHaveCSS(
    "background-color",
    "rgb(233, 216, 255)",
  );
  await expect(page.locator("#primaryHex")).toHaveText("#f04466");
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 80;
    c.height = 40;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ff3300";
    ctx.fillRect(0, 0, 80, 40);
    return c.toDataURL().split(",")[1];
  });
  const asset = {
    name: "acme.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  };
  await page.locator("#brandLogo").setInputFiles(asset);
  await expect(page.locator("#logoPreview")).toBeVisible();
  await expect(page.locator(".game-logo")).toHaveJSProperty("naturalWidth", 80);
  await page.locator("#brandBackdrop").setInputFiles(asset);
  await expect(page.locator("#gameBackdrop")).toBeVisible();
  const oldLogo = await page.locator("#logoPreview").getAttribute("src");
  await page.locator("#brandLogo").setInputFiles({
    name: "broken.png",
    mimeType: "image/png",
    buffer: Buffer.from("not a raster"),
  });
  await expect(page.locator("#brandStatus")).toContainText("contents");
  await expect(page.locator("#logoPreview")).toHaveAttribute("src", oldLogo);
  await page.locator("#expandRunner").click();
  await expect(page.locator(".game-logo")).toBeInViewport();
  await expect(page.locator(".runner-label [data-brand-title]")).toHaveText(
    "ACME Motion Sprint",
  );
  await page.locator("#expandRunner").click();
  await page.locator("#keyboardTab").click();
  await page.locator("#playRunner").click();
  await expect(page.locator("#runnerState")).toHaveText("COUNTDOWN");
  await page.locator("#brandTitle").fill("Edited title");
  await expect(page.locator("#runnerState")).toHaveText("PAUSED");
  await page.locator("#removeLogo").click();
  await expect(page.locator(".game-logo")).toBeHidden();
  await page.locator("#removeBackdrop").click();
  await expect(page.locator("#gameBackdrop")).toBeHidden();
  await page.locator("#resetBrand").click();
  await expect(page.locator("#brandTitle")).toHaveValue("WONDER RUN");
  await expect(page.locator("#brandPrimary")).toHaveValue("#d6f65c");
  await expect(page.locator(".runner-label [data-brand-title]")).toHaveText(
    "WONDER RUN",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
