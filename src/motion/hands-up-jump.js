// Comfortable, in-frame gesture: both wrists above their shoulders, not above head.
// Lower BOTH hands to re-arm. Pose loss resets the detector to unarmed.
export class HandsUpJump {
  constructor() {
    this.reset();
  }
  reset() {
    this.armed = false;
    this.lowerSince = null;
    this.raiseSince = null;
  }
  update(p, now, scale, margin, squat = false) {
    const lowered =
      p[15].y > p[11].y + 0.02 * scale && p[16].y > p[12].y + 0.02 * scale;
    if (lowered) {
      this.lowerSince ??= now;
      this.raiseSince = null;
      if (now - this.lowerSince >= 150) this.armed = true;
      return false;
    }
    this.lowerSince = null;
    const raised =
      p[15].y < p[11].y - margin * scale && p[16].y < p[12].y - margin * scale;
    if (!raised || squat) {
      this.raiseSince = null;
      return false;
    }
    this.raiseSince ??= now;
    if (this.armed && now - this.raiseSince >= 100) {
      this.armed = false;
      this.raiseSince = null;
      return true;
    }
    return false;
  }
}
