import { test } from "node:test";
import assert from "node:assert/strict";
import { MotionEngine, quality, neutralActions } from "../src/motion/engine.js";
function pose() {
  const p = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.4,
    visibility: 0.99,
  }));
  const set = (i, x, y) => Object.assign(p[i], { x, y });
  set(0, 0.5, 0.1);
  set(11, 0.4, 0.3);
  set(12, 0.6, 0.3);
  set(13, 0.35, 0.4);
  set(14, 0.65, 0.4);
  set(15, 0.3, 0.5);
  set(16, 0.7, 0.5);
  set(23, 0.43, 0.55);
  set(24, 0.57, 0.55);
  set(25, 0.43, 0.73);
  set(26, 0.57, 0.73);
  set(27, 0.43, 0.92);
  set(28, 0.57, 0.92);
  return p;
}
function calibrated() {
  const e = new MotionEngine();
  e.calibrate();
  for (let t = 0; t <= 2100; t += 50) e.update(pose(), t);
  assert.ok(e.profile);
  return e;
}
test("visibility requires head, arms, knees and feet inside the frame", () => {
  const p = pose();
  assert.equal(quality(p).full, true);
  p[27].visibility = 0.2;
  assert.equal(quality(p).full, false);
  p[27].visibility = 0.99;
  p[0].y = 0;
  assert.equal(quality(p).full, false);
  assert.equal(quality(null).full, false);
});
test("no actions before calibration", () => {
  assert.deepEqual(
    new MotionEngine().update(pose(), 0).actions,
    neutralActions(),
  );
});
test("calibration collects two seconds and averages neutral stance", () => {
  const e = calibrated();
  assert.ok(Math.abs(e.profile.scale - 0.25) < 0.001);
  assert.ok(Math.abs(e.profile.hip - 0.55) < 0.001);
});
test("hidden foot resets calibration collection", () => {
  const e = new MotionEngine();
  e.calibrate();
  for (let t = 0; t < 1800; t += 50) e.update(pose(), t);
  const p = pose();
  p[27].visibility = 0;
  e.update(p, 1800);
  e.update(pose(), 2000);
  assert.equal(e.profile, null);
  assert.equal(e.samples.length, 1);
});
test("unstable calibration resets accumulation", () => {
  const e = new MotionEngine();
  e.calibrate();
  e.update(pose(), 0);
  const p = pose();
  p[23].y += 0.04;
  p[24].y += 0.04;
  e.update(p, 50);
  assert.equal(e.samples.length, 1);
});
test("idle pose creates no events over 30 seconds", () => {
  const e = calibrated();
  for (let t = 2200; t < 32200; t += 50) {
    const a = e.update(pose(), t).actions;
    assert.equal(a.jump, false);
    assert.equal(a.swing, false);
    assert.equal(a.squat, false);
    assert.equal(a.cadence, 0);
    assert.equal(a.lean, 0);
  }
});
test("lean follows mirrored direction; small jitter stays neutral", () => {
  const e = calibrated();
  const p = pose();
  p[11].x -= 0.1;
  p[12].x -= 0.1;
  assert.ok(e.update(p, 2200).actions.lean > 0);
  e.reset();
  assert.equal(e.update(pose(), 2300).actions.lean, 0);
});
test("squat is held and clears on neutral return", () => {
  const e = calibrated();
  const p = pose();
  p[23].y += 0.1;
  p[24].y += 0.1;
  assert.equal(e.update(p, 2200).actions.squat, true);
  assert.equal(e.update(pose(), 2250).actions.squat, false);
});
test("jump emits once per lift and cannot trigger with one foot", () => {
  const e = calibrated();
  const p = pose();
  for (const i of [23, 24, 27, 28]) p[i].y -= 0.06;
  assert.equal(e.update(p, 2200).actions.jump, true);
  assert.equal(e.update(p, 2250).actions.jump, false);
  e.update(pose(), 2300);
  assert.equal(e.update(p, 2350).actions.jump, true);
  e.update(pose(), 2400);
  p[28].y = 0.92;
  assert.equal(e.update(p, 2450).actions.jump, false);
});
test("swing emits with cooldown, no replay each inference", () => {
  const e = calibrated();
  e.update(pose(), 2200);
  const p = pose();
  p[15].x -= 0.1;
  assert.equal(e.update(p, 2250).actions.swing, true);
  assert.equal(e.update(pose(), 2300).actions.swing, false);
});
test("alternating knees yield cadence, which decays on stopping", () => {
  const e = calibrated();
  e.update(pose(), 2200);
  const left = pose();
  left[25].y -= 0.07;
  const right = pose();
  right[26].y -= 0.07;
  e.update(left, 2400);
  e.update(pose(), 2500);
  const a = e.update(right, 2700).actions;
  assert.ok(a.cadence > 0);
  for (let t = 2800; t <= 3800; t += 100) e.update(pose(), t);
  assert.equal(e.actions.cadence, 0);
});
test("simultaneous knees do not count as steps", () => {
  const e = calibrated();
  const p = pose();
  p[25].y -= 0.08;
  p[26].y -= 0.08;
  for (let t = 2200; t < 3000; t += 50)
    assert.equal(e.update(p, t).actions.cadence, 0);
});
test("loss clears state without erasing neutral profile", () => {
  const e = calibrated();
  assert.equal(e.update(null, 2300).actions.valid, false);
  assert.ok(e.profile);
  assert.equal(e.update(pose(), 2400).actions.swing, false);
});
test("timestamp gap resets temporal history", () => {
  const e = calibrated();
  e.update(pose(), 2200);
  const p = pose();
  p[15].x -= 0.2;
  assert.equal(e.update(p, 5000).actions.swing, false);
});
