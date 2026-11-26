import { test } from "node:test";
import assert from "node:assert/strict";
import { HandsUpJump } from "../src/motion/hands-up-jump.js";
const p = (left = 0.5, right = 0.5) => ({
  11: { y: 0.3 },
  12: { y: 0.3 },
  15: { y: left },
  16: { y: right },
});
function armed() {
  const g = new HandsUpJump();
  g.update(p(), 0, 0.25, 0.12);
  g.update(p(), 150, 0.25, 0.12);
  return g;
}
test("one hand, jitter or a brief raise do not trigger", () => {
  const g = armed();
  assert.equal(g.update(p(0.24, 0.5), 200, 0.25, 0.12), false);
  assert.equal(g.update(p(0.28, 0.28), 350, 0.25, 0.12), false);
  assert.equal(g.update(p(0.24, 0.24), 400, 0.25, 0.12), false);
  assert.equal(g.update(p(), 450, 0.25, 0.12), false);
});
test("loss/reset while raised requires lowering before any new jump", () => {
  const g = armed();
  g.update(p(0.24, 0.24), 200, 0.25, 0.12);
  assert.equal(g.update(p(0.24, 0.24), 300, 0.25, 0.12), true);
  g.reset();
  for (let t = 400; t <= 1000; t += 100)
    assert.equal(g.update(p(0.24, 0.24), t, 0.25, 0.12), false);
  g.update(p(), 1100, 0.25, 0.12);
  g.update(p(), 1250, 0.25, 0.12);
  g.update(p(0.24, 0.24), 1300, 0.25, 0.12);
  assert.equal(g.update(p(0.24, 0.24), 1400, 0.25, 0.12), true);
});
test("squat plus raised hands cannot trigger a jump", () => {
  const g = armed();
  g.update(p(0.24, 0.24), 200, 0.25, 0.12, true);
  assert.equal(g.update(p(0.24, 0.24), 400, 0.25, 0.12, true), false);
});
