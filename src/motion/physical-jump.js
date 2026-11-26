// Monocular estimate, not ground-contact measurement. Both feet AND hips must
// rise relative to calibration. Reacquisition in mid-air must not emit a jump.
export class PhysicalJump {
  constructor() {
    this.reset();
  }
  reset() {
    this.armed = false;
    this.groundedSince = null;
  }
  update(p, now, baseline, margin, squat = false) {
    const feetLift =
      (baseline.ankle - Math.max(p[27].y, p[28].y)) / baseline.scale;
    const hipLift = (baseline.hip - (p[23].y + p[24].y) / 2) / baseline.scale;
    const grounded =
      Math.abs(baseline.ankle - p[27].y) / baseline.scale < margin * 0.5 &&
      Math.abs(baseline.ankle - p[28].y) / baseline.scale < margin * 0.5 &&
      Math.abs(hipLift) < margin * 0.5;
    if (grounded) {
      this.groundedSince ??= now;
      if (now - this.groundedSince >= 150) this.armed = true;
    } else this.groundedSince = null;
    if (this.armed && !squat && feetLift > margin && hipLift > margin) {
      this.armed = false;
      this.groundedSince = null;
      return true;
    }
    return false;
  }
}
