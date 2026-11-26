import { test } from "node:test";
import assert from "node:assert/strict";
import { RunnerGame, makeCourse, LEVELS } from "../src/runner-game.js";
const neutral = {
  valid: true,
  lean: 0,
  intensity: 1,
  squat: false,
  jump: false,
};
function advance(g, seconds, a = neutral, fps = 120) {
  for (let i = 0; i < Math.round(seconds * fps); i++) g.update(1 / fps, a);
}
function running(options = {}) {
  const g = new RunnerGame();
  g.reset(options);
  g.start();
  advance(g, 3);
  assert.equal(g.state, "running");
  return g;
}
test("stable seeded course has safe alternative lanes and >=2s spacing at max speed", () => {
  assert.deepEqual(makeCourse(123), makeCourse(123));
  assert.notDeepEqual(makeCourse(1), makeCourse(2));
  for (const [level, c] of Object.entries(LEVELS)) {
    const rows = makeCourse(4, c.gap);
    for (let i = 0; i < rows.length; i++) {
      assert.notEqual(rows[i].coinLane, rows[i].lane);
      assert.ok([-1, 0, 1].includes(rows[i].lane));
      if (i)
        assert.ok(
          (rows[i].distance - rows[i - 1].distance) / c.speed >= 2,
          level,
        );
    }
  }
});
test("countdown consumes no session time or distance", () => {
  const g = new RunnerGame();
  g.start();
  advance(g, 2);
  assert.equal(g.state, "countdown");
  assert.equal(g.distance, 0);
  assert.equal(g.time, 0);
});
test("A stands still without steps; B automatically moves", () => {
  const a = running({ mode: "steps" }),
    b = running();
  advance(a, 2, { ...neutral, intensity: 0 });
  advance(b, 2, { ...neutral, intensity: 0 });
  assert.equal(a.distance, 0);
  assert.ok(b.distance > 10);
  advance(a, 1);
  assert.ok(a.distance > 4);
  advance(a, 1, { ...neutral, intensity: 0 });
  assert.equal(a.speed, 0);
  const d = a.distance;
  advance(a, 1, { ...neutral, intensity: 0 });
  assert.equal(a.distance, d);
});
test("lanes use hysteresis and a bounded transition, not teleports", () => {
  const g = running();
  g.update(1 / 120, { ...neutral, lean: 1 });
  assert.equal(g.lane, 1);
  assert.ok(g.x < 0.1);
  advance(g, 0.5, { ...neutral, lean: 0.25 });
  assert.equal(g.x, 2.2);
  advance(g, 0.5);
  assert.equal(g.x, 0);
});
test("each missed obstacle costs one life, and only once", () => {
  const g = running({
    course: [{ distance: 1, lane: 0, type: "block", coinLane: 1 }],
  });
  advance(g, 1);
  assert.equal(g.lives, 2);
  advance(g, 1);
  assert.equal(g.lives, 2);
});
test("jump clears block and neutral collision fails", () => {
  const g = running({
    course: [{ distance: 1, lane: 0, type: "block", coinLane: 1 }],
  });
  g.update(1 / 120, { ...neutral, jump: true });
  advance(g, 0.5);
  assert.equal(g.lives, 3);
  assert.equal(g.cleared, 1);
  advance(g, 1);
  assert.equal(g.height, 0);
});
test("squat clears bar but not a block", () => {
  for (const type of ["bar", "block"]) {
    const g = running({
      course: [{ distance: 1, lane: 0, type, coinLane: 1 }],
    });
    advance(g, 1, { ...neutral, squat: true });
    assert.equal(g.lives, type === "bar" ? 3 : 2);
  }
});
test("jump cannot bypass a bar as a squat", () => {
  const g = running({
    course: [{ distance: 1, lane: 0, type: "bar", coinLane: 1 }],
  });
  g.update(1 / 120, { ...neutral, jump: true });
  advance(g, 0.5, { ...neutral, squat: true });
  assert.equal(g.lives, 2);
});
test("pickup only resolves in its lane and once", () => {
  const g = running({
    course: [{ distance: 4, lane: -1, type: "block", coinLane: 1 }],
  });
  advance(g, 2, { ...neutral, lean: 1 });
  assert.equal(g.coins, 1);
  assert.equal(g.cleared, 1);
  assert.equal(g.score, Math.floor(g.distance) + 150);
});
test("tracking loss freezes time, distance, jump, score and requires manual resume countdown", () => {
  const g = running();
  advance(g, 1);
  g.pause("Lost");
  const snapshot = JSON.stringify(g);
  advance(g, 4);
  assert.equal(JSON.stringify(g), snapshot);
  g.start();
  assert.equal(g.state, "countdown");
  g.update(0.05, { ...neutral, valid: false });
  assert.equal(g.state, "paused");
  const d = g.distance;
  advance(g, 3);
  assert.equal(g.distance, d);
});
test("ends on lives or timer and reset removes all session state", () => {
  const g = running({
    course: [1, 2, 3].map((distance) => ({
      distance,
      lane: 0,
      type: "block",
      coinLane: 1,
    })),
  });
  advance(g, 2);
  assert.equal(g.state, "finished");
  assert.equal(g.lives, 0);
  const score = g.score;
  advance(g, 2);
  assert.equal(g.score, score);
  g.reset();
  assert.equal(g.state, "ready");
  assert.equal(g.lives, 3);
  assert.equal(g.distance, 0);
  const timed = running({ duration: 1, course: [] });
  advance(timed, 2);
  assert.equal(timed.state, "finished");
  assert.equal(timed.time, 1);
});
test("simulation agrees across 30, 60 and 120 render FPS", () => {
  const results = [30, 60, 120].map((fps) => {
    const g = running({ course: [] });
    advance(g, 10, neutral, fps);
    return g;
  });
  for (const g of results) {
    assert.ok(Math.abs(g.distance - results[0].distance) < 1e-7);
    assert.equal(g.score, results[0].score);
  }
});
