// Explicitly armed readiness gate. It never owns a camera or bypasses calibration.
export class HandsFreeStart {
  constructor() {
    this.disarm();
  }
  arm() {
    this.armed = true;
    this.since = null;
  }
  disarm() {
    this.armed = false;
    this.since = null;
  }
  update({ now, visible, calibrated, calibrating, state, allowed }) {
    if (!allowed || state === "finished") {
      this.disarm();
      return null;
    }
    if (!this.armed) return null;
    if (!visible) {
      this.since = null;
      return null;
    }
    if (["running", "countdown"].includes(state)) return null;
    this.since ??= now;
    if (now - this.since < 600) return null;
    if (!calibrated) return calibrating ? null : "calibrate";
    return "start";
  }
}
