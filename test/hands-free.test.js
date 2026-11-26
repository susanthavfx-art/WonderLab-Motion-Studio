import { test } from "node:test";
import assert from "node:assert/strict";
import { HandsFreeStart } from "../src/motion/hands-free.js";
const input = {
  now: 0,
  visible: true,
  calibrated: false,
  calibrating: false,
  state: "ready",
  allowed: true,
};
test("explicit arm and stable visibility are required before calibration", () => {
  const g = new HandsFreeStart();
  assert.equal(g.update(input), null);
  g.arm();
  assert.equal(g.update(input), null);
  assert.equal(g.update({ ...input, now: 599 }), null);
  assert.equal(g.update({ ...input, now: 600 }), "calibrate");
});
test("calibration must complete before start; calibration not repeatedly restarted", () => {
  const g = new HandsFreeStart();
  g.arm();
  g.update(input);
  assert.equal(g.update({ ...input, now: 1000, calibrating: true }), null);
  assert.equal(g.update({ ...input, now: 3000, calibrated: true }), "start");
  assert.equal(
    g.update({ ...input, now: 3100, calibrated: true, state: "countdown" }),
    null,
  );
});
test("visibility loss resets hold and restart requires full countdown via start", () => {
  const g = new HandsFreeStart();
  g.arm();
  g.update(input);
  g.update({ ...input, now: 500, visible: false });
  assert.equal(
    g.update({ ...input, now: 600, calibrated: true, state: "paused" }),
    null,
  );
  assert.equal(
    g.update({ ...input, now: 1200, calibrated: true, state: "paused" }),
    "start",
  );
});
test("operator disarm blocks automatic restart even with a valid body", () => {
  const g = new HandsFreeStart();
  g.arm();
  g.update(input);
  g.disarm();
  assert.equal(
    g.update({ ...input, now: 10000, calibrated: true, state: "paused" }),
    null,
  );
  assert.equal(g.armed, false);
});
test("keyboard, stop, background/modal exclusion disarm gate", () => {
  const g = new HandsFreeStart();
  g.arm();
  g.update({ ...input, allowed: false });
  assert.equal(g.armed, false);
  assert.equal(g.update({ ...input, now: 5000, calibrated: true }), null);
});
test("finished run never automatically replays", () => {
  const g = new HandsFreeStart();
  g.arm();
  g.update({ ...input, state: "finished" });
  assert.equal(g.armed, false);
  assert.equal(g.update({ ...input, now: 5000, calibrated: true }), null);
});
