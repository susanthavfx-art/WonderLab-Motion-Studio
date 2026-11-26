import { HandsUpJump } from "./hands-up-jump.js";
import { PhysicalJump } from "./physical-jump.js";
export const defaults = {
  lean: 0.15,
  squat: 0.22,
  jump: 0.12,
  swing: 2.8,
  step: 0.16,
};
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const groups = {
  torso: [11, 12, 23, 24],
  hands: [13, 14, 15, 16],
  legs: [25, 26, 27, 28],
};
export function visible(p, ids) {
  return (
    !!p &&
    ids.every(
      (i) =>
        p[i] &&
        p[i].visibility > 0.55 &&
        p[i].x > 0.015 &&
        p[i].x < 0.985 &&
        p[i].y > 0.015 &&
        p[i].y < 0.985,
    )
  );
}
export function quality(p) {
  const q = Object.fromEntries(
    Object.entries(groups).map(([k, v]) => [k, visible(p, v)]),
  );
  q.full = q.torso && q.hands && q.legs && visible(p, [0]);
  return q;
}
const avg = (p, a, b, key) => (p[a][key] + p[b][key]) / 2;
function features(p) {
  const hip = avg(p, 23, 24, "y"),
    shoulder = avg(p, 11, 12, "y");
  return {
    hip,
    ankle: avg(p, 27, 28, "y"),
    scale: Math.max(0.06, hip - shoulder),
    tilt:
      (avg(p, 11, 12, "x") - avg(p, 23, 24, "x")) /
      Math.max(0.06, hip - shoulder),
    knee: [p[25].y - hip, p[26].y - hip],
  };
}
export const neutralActions = () => ({
  lean: 0,
  squat: false,
  jump: false,
  swing: false,
  cadence: 0,
  intensity: 0,
  valid: false,
});
export class MotionEngine {
  constructor() {
    this.handsUp = new HandsUpJump();
    this.physicalJump = new PhysicalJump();
    this.jumpMode = "hands";
    this.thresholds = { ...defaults };
    this.profile = null;
    this.samples = null;
    this.reset();
  }
  setJumpMode(mode) {
    if (!["hands", "physical"].includes(mode))
      throw new Error("Unknown jump input");
    this.jumpMode = mode;
    this.reset();
  }
  reset() {
    this.previous = null;
    this.steps = [];
    this.lastSide = -1;
    this.lastStep = -Infinity;
    this.lastSwing = -Infinity;
    this.handsUp.reset();
    this.physicalJump.reset();
    this.squatting = false;
    this.lastTime = null;
    this.actions = neutralActions();
  }
  calibrate() {
    this.profile = null;
    this.samples = [];
    this.reset();
  }
  cancelCalibration() {
    this.samples = null;
    this.reset();
  }
  update(p, now) {
    const q = quality(p);
    if (!q.full) {
      if (this.samples) this.samples = [];
      this.reset();
      return { q, actions: this.actions, progress: 0 };
    }
    const f = features(p);
    if (this.samples) {
      const last = this.samples.at(-1);
      const first = this.samples[0];
      if (
        last &&
        (now - last.time > 250 ||
          now <= last.time ||
          Math.abs(f.hip - last.hip) > 0.015 ||
          Math.abs(f.tilt - last.tilt) > 0.08 ||
          Math.abs(f.hip - first.hip) > 0.025 ||
          Math.abs(f.ankle - first.ankle) > 0.025 ||
          Math.abs(f.scale - first.scale) > 0.025 ||
          Math.abs(f.tilt - first.tilt) > 0.12)
      )
        this.samples = [];
      this.samples.push({ ...f, time: now });
      const duration = now - this.samples[0].time;
      if (duration >= 2000 && this.samples.length >= 20) {
        const mean = (key) =>
          this.samples.reduce((s, v) => s + v[key], 0) / this.samples.length;
        this.profile = {
          hip: mean("hip"),
          ankle: mean("ankle"),
          scale: mean("scale"),
          tilt: mean("tilt"),
          knee: [0, 1].map(
            (i) =>
              this.samples.reduce((s, v) => s + v.knee[i], 0) /
              this.samples.length,
          ),
        };
        this.samples = null;
        this.reset();
      } else
        return {
          q,
          actions: neutralActions(),
          progress: clamp(duration / 2000, 0, 1),
        };
    }
    if (!this.profile) return { q, actions: neutralActions(), progress: 0 };
    const b = this.profile,
      t = this.thresholds;
    if (
      this.lastTime !== null &&
      (now <= this.lastTime || now - this.lastTime > 350)
    )
      this.reset();
    const dt = this.lastTime === null ? 0 : (now - this.lastTime) / 1000;
    this.lastTime = now;
    const leanRaw = -(f.tilt - b.tilt); // mirrored preview: lean toward screen-right is positive
    const target =
      Math.abs(leanRaw) < t.lean
        ? 0
        : clamp((leanRaw - Math.sign(leanRaw) * t.lean) * 2.5, -1, 1);
    const lean =
      this.actions.lean +
      (target - this.actions.lean) * (dt ? 1 - Math.exp(-12 * dt) : 1);
    const drop = (f.hip - b.hip) / b.scale;
    const kneeCompression =
      (b.knee[0] + b.knee[1] - f.knee[0] - f.knee[1]) / (2 * b.scale);
    this.squatting =
      drop > (this.squatting ? t.squat * 0.6 : t.squat) &&
      kneeCompression > 0.06;
    const jump =
      this.jumpMode === "physical"
        ? this.physicalJump.update(p, now, b, t.jump, this.squatting)
        : this.handsUp.update(p, now, b.scale, t.jump, this.squatting);
    let swing = false;
    if (
      this.previous &&
      dt > 0.008 &&
      dt < 0.25 &&
      now - this.lastSwing > 450
    ) {
      const speed = Math.max(
        ...[15, 16].map(
          (i) =>
            Math.hypot(
              p[i].x -
                p[i === 15 ? 11 : 12].x -
                (this.previous[i].x - this.previous[i === 15 ? 11 : 12].x),
              p[i].y -
                p[i === 15 ? 11 : 12].y -
                (this.previous[i].y - this.previous[i === 15 ? 11 : 12].y),
            ) /
            (dt * b.scale),
        ),
      );
      if (speed > t.swing) {
        swing = true;
        this.lastSwing = now;
      }
    }
    const lifts = b.knee.map((v, i) => (v - f.knee[i]) / b.scale);
    const side = lifts[0] > lifts[1] ? 0 : 1;
    if (
      !this.squatting &&
      lifts[side] > t.step &&
      lifts[1 - side] < t.step * 0.65 &&
      side !== this.lastSide &&
      now - this.lastStep > 180
    ) {
      this.steps.push(now);
      this.lastSide = side;
      this.lastStep = now;
    }
    this.steps = this.steps.filter((v) => now - v < 3000);
    const age = now - this.lastStep;
    const cadence =
      this.steps.length >= 2
        ? Math.min(
            240,
            ((this.steps.length - 1) * 60000) /
              Math.max(250, this.steps.at(-1) - this.steps[0]),
          ) * clamp(1 - Math.max(0, age - 450) / 900, 0, 1)
        : 0;
    this.previous = p.map((v) => ({ ...v }));
    this.actions = {
      lean,
      squat: this.squatting,
      jump,
      swing,
      cadence,
      intensity: clamp(cadence / 120, 0, 1),
      valid: true,
    };
    return { q, actions: this.actions, progress: 1 };
  }
}
