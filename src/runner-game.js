// Pure, fixed-step runner simulation. Metres/seconds; no browser or tracker dependencies.
export const LEVELS = {
  easy: { speed: 6, gap: 22 },
  normal: { speed: 8, gap: 22 },
  hard: { speed: 10, gap: 22 },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function makeCourse(seed = 2026, gap = 22, length = 120) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  return Array.from({ length }, (_, id) => {
    const lane = Math.floor(random() * 3) - 1;
    return {
      id,
      distance: 30 + id * gap,
      lane,
      type: id % 2 ? "bar" : "block",
      coinLane: ((lane + 1 + 1) % 3) - 1,
    };
  });
}
export class RunnerGame {
  constructor() {
    this.reset();
  }
  reset({
    mode = "auto",
    difficulty = "easy",
    seed = 2026,
    duration = 60,
    course,
  } = {}) {
    this.mode = mode === "steps" ? "steps" : "auto";
    this.difficulty = LEVELS[difficulty] ? difficulty : "easy";
    this.duration = duration;
    this.course = (course ?? makeCourse(seed, LEVELS[this.difficulty].gap)).map(
      (row) => ({ ...row }),
    );
    this.state = "ready";
    this.reason = "";
    this.countdown = 3;
    this.time = 0;
    this.distance = 0;
    this.speed = 0;
    this.x = 0;
    this.lane = 0;
    this.jumpTime = -1;
    this.height = 0;
    this.squat = false;
    this.lives = 3;
    this.coins = 0;
    this.cleared = 0;
    this.score = 0;
    this.nextRow = 0;
    this.feedback = "";
    this.feedbackTime = 0;
    this.accumulator = 0;
    this.pendingJump = false;
    this.jumpCarrySpeed = 0;
    this.jumpCarryTime = 0;
  }
  start() {
    if (this.state === "ready" || this.state === "paused") {
      this.state = "countdown";
      this.countdown = 3;
      this.reason = "";
      this.accumulator = 0;
      this.pendingJump = false;
    }
  }
  pause(reason = "Paused by operator") {
    if (["running", "countdown"].includes(this.state)) {
      this.state = "paused";
      this.reason = reason;
      this.pendingJump = false;
      this.accumulator = 0;
    }
  }
  update(dt, a) {
    if (!["running", "countdown"].includes(this.state)) return;
    if (!a.valid) {
      this.pause("Tracking lost · Show your full body, then resume");
      return;
    }
    if (!Number.isFinite(dt) || dt <= 0) return;
    // Never fast-forward after a stalled/backgrounded browser frame.
    this.accumulator += Math.min(dt, 0.1);
    if (this.state === "running" && a.jump) this.pendingJump = true;
    while (
      this.accumulator + 1e-9 >= 1 / 120 &&
      ["running", "countdown"].includes(this.state)
    ) {
      this.accumulator -= 1 / 120;
      this.tick(1 / 120, a);
    }
  }
  tick(dt, a) {
    if (this.state === "countdown") {
      this.countdown -= dt;
      if (this.countdown <= 1e-8) {
        this.countdown = 0;
        this.state = "running";
      }
      return;
    }
    const lean = clamp(Number(a.lean) || 0, -1, 1);
    if (lean < -0.35) this.lane = -1;
    else if (lean > 0.35) this.lane = 1;
    else if (Math.abs(lean) < 0.18) this.lane = 0;
    const target = this.lane * 2.2;
    this.x += clamp(target - this.x, -dt * 10, dt * 10);
    if (this.pendingJump && this.jumpTime < 0 && !a.squat) {
      this.jumpTime = 0;
      // Let players interrupt their steps for the hands-up gesture. Never
      // create forward speed from an idle jump, or carry through tracking loss.
      this.jumpCarrySpeed = this.speed;
      this.jumpCarryTime = 1.05;
    }
    this.pendingJump = false;
    if (this.jumpTime >= 0) {
      this.jumpTime += dt;
      if (this.jumpTime >= 0.85) this.jumpTime = -1;
    }
    this.height =
      this.jumpTime >= 0 ? Math.sin((this.jumpTime / 0.85) * Math.PI) * 1.7 : 0;
    this.squat = !!a.squat && this.height < 0.15;
    const max = LEVELS[this.difficulty].speed;
    const intensity = clamp(Number(a.intensity) || 0, 0, 1);
    this.jumpCarryTime = Math.max(0, this.jumpCarryTime - dt);
    const targetSpeed =
      this.mode === "auto"
        ? max
        : Math.max(
            intensity * max,
            this.jumpCarryTime > 0 ? this.jumpCarrySpeed : 0,
          );
    this.speed += clamp(targetSpeed - this.speed, -dt * max * 2, dt * max * 2);
    this.distance += this.speed * dt;
    this.time = Math.min(this.duration, this.time + dt);
    this.feedbackTime = Math.max(0, this.feedbackTime - dt);
    // Each row resolves once at its contact plane, independent of render FPS.
    while (
      this.nextRow < this.course.length &&
      this.distance >= this.course[this.nextRow].distance
    ) {
      const row = this.course[this.nextRow++];
      const sameLane = Math.abs(this.x - row.lane * 2.2) < 0.85;
      const safe = row.type === "block" ? this.height >= 0.85 : this.squat;
      if (sameLane && !safe) {
        this.lives--;
        this.feedback = "Collision · −1 life";
      } else {
        this.cleared++;
        this.feedback = sameLane
          ? row.type === "block"
            ? "Clean jump! +50"
            : "Nice duck! +50"
          : "Obstacle avoided +50";
      }
      if (Math.abs(this.x - row.coinLane * 2.2) < 0.85) {
        this.coins++;
        this.feedback = "Pickup collected! +100";
      }
      this.feedbackTime = 1.5;
      if (this.lives <= 0) {
        this.state = "finished";
        this.reason = "Out of lives";
        break;
      }
    }
    this.score =
      Math.floor(this.distance) + this.coins * 100 + this.cleared * 50;
    if (this.time >= this.duration) {
      this.state = "finished";
      this.reason = "Run complete";
    }
  }
}
