import { test } from "node:test";
import assert from "node:assert/strict";
import { PhysicalJump } from "../src/motion/physical-jump.js";
const b = { hip: 0.55, ankle: 0.9, scale: 0.25 };
const pose = (hip = 0.55, left = 0.9, right = 0.9) => ({
  23: { y: hip },
  24: { y: hip },
  27: { y: left },
  28: { y: right },
});
function armed() {
  const g = new PhysicalJump();
  g.update(pose(), 0, b, 0.12);
  g.update(pose(), 150, b, 0.12);
  return g;
}
test("physical jump emits once and re-arms only after stable landing", () => {
  const g = armed();
  const air = pose(0.49, 0.84, 0.84);
  assert.equal(g.update(air, 200, b, 0.12), true);
  assert.equal(g.update(air, 400, b, 0.12), false);
  g.update(pose(), 500, b, 0.12);
  assert.equal(g.update(air, 550, b, 0.12), false);
  g.update(pose(), 600, b, 0.12);
  g.update(pose(), 800, b, 0.12);
  assert.equal(g.update(air, 850, b, 0.12), true);
});
test("one foot, running knees, or squat/stand without both-foot lift cannot jump", () => {
  for (const p of [
    pose(0.49, 0.84, 0.9),
    pose(0.49, 0.9, 0.84),
    pose(0.55),
    pose(0.65),
  ])
    assert.equal(armed().update(p, 200, b, 0.12), false);
  assert.equal(
    armed().update(pose(0.49, 0.84, 0.84), 200, b, 0.12, true),
    false,
  );
});
test("reset in air does not fire until grounded first", () => {
  const g = armed();
  g.reset();
  const air = pose(0.49, 0.84, 0.84);
  assert.equal(g.update(air, 200, b, 0.12), false);
  assert.equal(g.update(air, 500, b, 0.12), false);
  g.update(pose(), 600, b, 0.12);
  g.update(pose(), 800, b, 0.12);
  assert.equal(g.update(air, 900, b, 0.12), true);
});
