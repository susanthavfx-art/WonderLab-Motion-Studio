import "./style.css";
import {
  createIcons,
  FlaskConical,
  Scan,
  LayoutGrid,
  Settings2,
  ArrowUpRight,
  Camera,
  Keyboard,
  RotateCcw,
  Check,
  ChevronRight,
  Play,
  Pause,
  MoveHorizontal,
  Activity,
  ArrowUp,
  ArrowDown,
  Hand,
  Footprints,
  Expand,
  ShieldCheck,
  CircleHelp,
  VideoOff,
} from "lucide";
import { startCamera } from "./motion/camera.js";
import {
  MotionEngine,
  defaults,
  quality,
  neutralActions,
} from "./motion/engine.js";
import { createRunner } from "./runner.js";
import { RunnerGame } from "./runner-game.js";
import { HandsFreeStart } from "./motion/hands-free.js";
const icons = {
  FlaskConical,
  Scan,
  LayoutGrid,
  Settings2,
  ArrowUpRight,
  Camera,
  Keyboard,
  RotateCcw,
  Check,
  ChevronRight,
  Play,
  Pause,
  MoveHorizontal,
  Activity,
  ArrowUp,
  ArrowDown,
  Hand,
  Footprints,
  Expand,
  ShieldCheck,
  CircleHelp,
  VideoOff,
};
const icon = (n) =>
  `<i data-lucide="${n.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}"></i>`;
const $ = (id) => document.getElementById(id);
const cards = [
  ["lean", "Lean", "MoveHorizontal", "A / D"],
  ["squat", "Squat", "ArrowDown", "S / ↓"],
  ["jump", "Jump", "ArrowUp", "Space"],
  ["swing", "Hand swing", "Hand", "J"],
  ["run", "Run in place", "Footprints", "Hold W"],
];
document.querySelector("#app").innerHTML = `
<aside class="sidebar"><a class="brand" href="./" aria-label="WonderLab home"><span class="brand-mark">w<span>·</span></span><div>WonderLab<small>MOTION STUDIO</small></div></a>
<div class="workspace-label">WORKSPACE <span>INTERNAL</span></div><nav><button class="nav-item" id="projectsNav">${icon("LayoutGrid")} Projects <span class="soon">Soon</span></button><button class="nav-item selected" id="labNav">${icon("Scan")} Motion Lab <span class="nav-dot"></span></button><button class="nav-item" id="templatesNav">${icon("FlaskConical")} Game templates <span class="soon">Soon</span></button></nav>
<div class="sidebar-note"><div class="note-orb">${icon("Activity")}</div><h3>Made to move.</h3><p>Turn real-world movement into playful brand experiences.</p><span>YOUR NEXT BIG IDEA STARTS HERE ↗</span></div>
<button class="nav-item settings-nav" id="setupNav">${icon("Settings2")} Lab settings</button><div class="profile"><span>W</span><div>WonderLab workspace<small>Personal · Local development</small></div></div></aside>
<div class="shell"><header class="topbar"><div>Workspace ${icon("ChevronRight")} <strong>Motion Lab</strong></div><span class="build-tag"><span></span> Prototype v0.2</span></header>
<main><div class="page-heading"><div><div class="eyebrow">THE MOVEMENT WORKBENCH</div><h1>Motion Lab<span> /</span></h1><p>Find your stance. Fine-tune your movement. Bring your game to life.</p></div><button class="button secondary" id="guide">${icon("CircleHelp")} Setup guide</button></div>
<div class="lab-banner"><span class="banner-icon">${icon("FlaskConical")}</span><div><strong>A little movement. A lot of possibility.</strong><p>Test your inputs here before connecting them to a game. Real webcam validation is required.</p></div><span class="experimental">EXPERIMENTAL</span></div>
<div class="workspace-grid"><section class="panel capture-panel"><div class="panel-heading"><div><h2>${icon("Scan")} Motion capture</h2><span class="section-sub">Your body is the controller</span></div><span class="status-pill" id="captureBadge"><b></b> CAMERA OFF</span></div>
<div class="camera-stage" id="cameraStage"><canvas id="overlay"></canvas><div class="frame-corner tl"></div><div class="frame-corner tr"></div><div class="frame-corner bl"></div><div class="frame-corner br"></div><div class="camera-empty" id="cameraEmpty"><div class="body-scan"><svg viewBox="0 0 140 170" fill="none"><circle cx="70" cy="26" r="14"/><path d="M70 43v57m-32-47 32 9 32-9M38 53 22 85m80-32 16 32m-48 15-20 48m20-48 20 48"/><path class="scan-line" d="M10 77h120"/></svg></div><h3>Step into your next idea.</h3><p>Connect your webcam to see your movement<br>translated into game-ready inputs.</p><button class="button primary" id="enableCamera">${icon("Camera")} Enable webcam ${icon("ArrowUpRight")}</button><span class="privacy">${icon("ShieldCheck")} Processed on your device. Never uploaded.</span></div>
<div class="stage-top"><span id="sourceLabel">NO INPUT CONNECTED</span><span id="fpsLabel">— FPS</span></div><div class="stage-bottom" id="frameHint">Keep your whole body in view, from head to toe.</div></div>
<div class="capture-toolbar"><div class="segmented"><button id="webcamTab" class="active">${icon("Camera")} Webcam</button><button id="keyboardTab">${icon("Keyboard")} Keyboard test</button></div><button class="icon-button" id="stopCamera" title="Stop webcam" aria-label="Stop webcam">${icon("VideoOff")}</button><label class="mirror-label"><input type="checkbox" id="mirror" checked> Mirror</label></div>
<div class="capture-status"><span id="statusDot" class="dot"></span><span id="statusText" role="status" aria-live="polite">Camera is off. Enable your webcam or try keyboard inputs.</span></div></section>
<aside class="right-stack"><section class="panel calibration-panel"><div class="small-heading"><h2><span class="step-number">01</span> Find your baseline</h2><span id="calibrationBadge" class="mini-badge">NOT SET</span></div><p>Stand comfortably, arms relaxed. Make sure your hands and feet are visible.</p><div class="body-checks">${[
  ["torso", "Upper body"],
  ["hands", "Hands & arms"],
  ["legs", "Legs & feet"],
]
  .map(
    ([id, label]) =>
      `<div><span id="check-${id}" class="check-circle">${icon("Check")}</span>${label}<span id="quality-${id}">Waiting</span></div>`,
  )
  .join(
    "",
  )}</div><button class="button dark full" id="calibrate">${icon("Scan")} Calibrate stance</button><div class="calibration-progress"><div id="calibrationProgress"></div></div><small id="calibrationHelp">A stable 2-second stance sets your neutral position.</small></section>
<section class="panel tips-panel"><div class="tips-title">${icon("Activity")} A better tracking setup</div><ul><li>Step back until your entire body fits.</li><li>Use even lighting and a clear space.</li><li>One person in the camera at a time.</li></ul><div>Start around 2–3 m away; adjust to your camera.</div></section></aside></div>
<section class="inputs-section"><div class="section-title"><div><h2>Movement inputs <span>05</span></h2><p>Live signals, ready to map to your game.</p></div><span class="signal-label"><span class="dot" id="signalDot"></span><span id="signalText">Waiting for input</span></span></div><div class="movement-grid">${cards.map(([id, title, ic, key]) => `<article class="movement-card" id="card-${id}"><div class="movement-top"><span class="movement-icon">${icon(ic)}</span><span class="input-state" id="state-${id}">IDLE</span></div><h3>${title}</h3><div class="input-value" id="value-${id}">${id === "lean" ? "0.00" : id === "run" ? "0" : "—"}<small>${id === "run" ? " steps/min" : id === "lean" ? " neutral" : ""}</small></div><div class="meter"><div id="meter-${id}"></div></div><div class="key-hint"><span>${key}</span><span>${id === "lean" ? "Continuous" : id === "run" ? "Cadence" : id === "squat" ? "Hold" : "Trigger"}</span></div></article>`).join("")}</div></section>
<div class="bottom-grid"><section class="panel runner-panel" id="runnerPanel"><div class="panel-heading"><div><h2>${icon("Play")} Wonder Run</h2><span class="section-sub">Three lanes. Real movement. One minute to make it count.</span></div><button class="button secondary compact" id="expandRunner">${icon("Expand")} Focus view</button></div>
<div class="runner-playtest-layout"><div class="runner-stage" id="runner"><div class="runner-label"><span>WONDER RUN</span><small id="runnerSource">WEBCAM · FULL BODY REQUIRED</small></div><span class="runner-state" id="runnerState">READY</span>
<div class="runner-hud"><span>SCORE <b id="gameScore">0</b></span><span>LIVES <b id="gameLives">♥ ♥ ♥</b></span><span>TIME <b id="gameTime">60s</b></span><span>PICKUPS <b id="gameCoins">0</b></span></div>
<div class="game-message" id="gameMessage" role="status" aria-live="polite"></div><div class="game-feedback" id="gameFeedback"></div>
<div class="game-results" id="gameResults" hidden><span>SESSION RESULTS</span><h3 id="resultTitle">Run complete</h3><strong id="resultScore">0</strong><p id="resultDetails"></p><button class="button primary" id="replayRunner">Play again ↗</button></div></div>
<aside class="runner-monitor" aria-label="Live webcam playtest monitor"><div class="monitor-heading"><strong>${icon("Camera")} Your movement</strong><span id="monitorBadge">CAMERA OFF</span></div><div class="monitor-preview" id="monitorPreview"><canvas id="monitorCanvas" aria-label="Mirrored live webcam and skeleton preview"></canvas><p id="monitorEmpty">Enable webcam to see your full body here while you play.</p></div><p id="monitorStatus" role="status">Enable webcam, then calibrate.</p><div class="monitor-quality" aria-label="Body visibility"><span id="monitor-torso">Torso —</span><span id="monitor-hands">Hands —</span><span id="monitor-legs">Feet —</span></div><div class="monitor-actions"><button class="button dark compact" id="monitorEnable">Enable webcam</button><button class="button secondary compact" id="monitorStop" aria-label="Stop webcam from game view">Stop</button><button class="button primary compact" id="monitorCalibrate">Calibrate stance</button><button class="text-button" id="monitorKeyboard">Use keyboard instead</button></div><small>Same camera · on-device only · no video stored</small></aside></div>
<div class="handsfree-bar"><label><input type="checkbox" id="handsFreeEnabled" checked> Hands-free webcam start</label><span id="handsFreeStatus" role="status">Enable webcam, then step back. Auto-calibrate → 3–2–1 → run.</span></div><div class="runner-toolbar"><select id="runMode" aria-label="Runner mode"><option value="auto">B · Auto-run</option><option value="steps">A · Run in place</option></select><select id="runDifficulty" aria-label="Runner difficulty"><option value="easy">Easy · 6 m/s</option><option value="normal">Normal · 8 m/s</option><option value="hard">Hard · 10 m/s</option></select><button class="button dark compact" id="playRunner">▶ Start run</button><button class="button secondary compact" id="resetRunner">${icon("RotateCcw")} Reset</button></div>
<p class="runner-footnote">Lean / A-D: lanes · Space: jump orange blocks · S: duck blue bars · W: run in mode A · Escape: pause. Gold pickups +100; clear a row +50.</p><div class="runner-session" id="gameSession">60-second run · 3 lives · Seed 2026 · Mode changes reset the run</div></section>
<section class="panel tuning-panel" id="tuningPanel"><div class="small-heading"><h2>${icon("Settings2")} Input sensitivity</h2><button class="text-button" id="resetThresholds">Reset</button></div><p>Starting points, not universal settings. Tune for your camera and player.</p>${[
  ["lean", "Lean dead zone", 0.05, 0.4, 0.01],
  ["squat", "Squat depth", 0.1, 0.5, 0.01],
  ["jump", "Jump lift", 0.06, 0.3, 0.01],
  ["swing", "Swing velocity", 1, 6, 0.1],
  ["step", "Step height", 0.08, 0.4, 0.01],
]
  .map(
    ([id, label, min, max, step]) =>
      `<label class="slider-label" for="tune-${id}"><span>${label}</span><output id="out-${id}">${defaults[id].toFixed(2)}</output></label><input id="tune-${id}" type="range" min="${min}" max="${max}" step="${step}" value="${defaults[id]}">`,
  )
  .join(
    "",
  )}<div class="tune-note">${icon("ShieldCheck")} Settings apply to this session only.</div></section></div>
<footer><span><span class="footer-dot"></span> Built for real-world play.</span><span>WonderLab Motion Studio <b>·</b> Motion Lab / 001</span></footer></main></div>
<dialog id="guideDialog"><div class="dialog-heading"><h2>Your first motion test</h2><button id="closeGuide" class="icon-button" aria-label="Close guide">✕</button></div><ol><li>Allow camera access on this HTTPS page. If embedded-camera permissions are blocked, open the preview in its own tab.</li><li>Frame your head, relaxed hands, knees and feet with room to move. Keep the floor clear.</li><li>Hands-free start is on by default: enable webcam, step back into full view and hold still. Calibration runs automatically, followed by a 3–2–1 countdown. Pause/Escape cancels auto-start; press Step back to start before returning to your stance. Disable Hands-free start for manual Motion Lab tests.</li><li>Try lean, squat, small optional jump, hand swing and alternating steps. Detectors are experimental; check false triggers and missed actions.</li><li>Use Keyboard test without a camera: A/D lean, S crouch, Space jump, J swing, hold W to simulate steps. Escape pauses the game. Lean chooses a lane; orange blocks need a jump, blue bars need a squat. Mode A needs W or running in place.</li></ol><p>One player only. No video is stored or uploaded. Stop the camera when finished. Recalibrate for each player or camera position. Avoid jumping if unsafe.</p><button class="button dark full" id="gotIt">Got it, let’s move ${icon("ArrowUpRight")}</button></dialog><div id="toast" role="status"></div>`;
const keyboardEmptyMarkup = `<div class="keyboard-visual">${icon("Keyboard")}</div><h3>Your keyboard. Your controller.</h3><p>No camera needed. Test the same game inputs<br>with a few familiar keys.</p><div class="keyboard-map"><span>A / D <small>Lean</small></span><span>W <small>Run</small></span><span>S <small>Squat</small></span><span>Space <small>Jump</small></span><span>J <small>Swing</small></span></div><span class="privacy">SIMULATED INPUTS · NOT WEBCAM TRACKING</span>`;
const keyboardView = document.createElement("div");
keyboardView.id = "keyboardView";
keyboardView.className = "camera-empty";
keyboardView.hidden = true;
keyboardView.innerHTML = keyboardEmptyMarkup;
$("cameraStage").append(keyboardView);
createIcons({ icons });
const engine = new MotionEngine();
const game = new RunnerGame();
const handsFree = new HandsFreeStart();
const runner = createRunner($("runner"));
if (runner.error) $("runnerState").textContent = runner.error;
let camera = null,
  controller = null,
  generation = 0,
  source = "webcam",
  starting = false,
  lastLandmarks = null,
  lastFrameAt = 0,
  fps = 0,
  actions = neutralActions(),
  last = performance.now(),
  calibrating = false,
  lastJump = 0,
  lastSwing = 0;
const keys = new Set();
let keyJump = false,
  keySwing = false;
function toast(text) {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("toast").classList.remove("show"), 4000);
}
function status(text, live = false) {
  $("statusText").textContent = text;
  $("statusDot").classList.toggle("live", live);
}
function resetMotion() {
  handsFree.disarm();
  game.pause("Camera or calibration changed · Recalibrate and resume");
  engine.profile = null;
  engine.cancelCalibration();
  lastLandmarks = null;
  actions = neutralActions();
  calibrating = false;
  $("calibrationBadge").textContent = "NOT SET";
  $("calibrationBadge").classList.remove("ready");
  $("calibrationProgress").style.width = "0%";
  $("calibrationHelp").textContent =
    "A stable 2-second stance sets your neutral position.";
  $("calibrate").textContent = "Calibrate stance";
}
function stop() {
  generation++;
  controller?.abort();
  controller = null;
  camera?.stop();
  camera = null;
  starting = false;
  $("enableCamera").disabled = false;
  $("enableCamera").textContent = "Enable webcam ↗";
  $("cameraEmpty").hidden = false;
  $("cameraStage").querySelector("video")?.remove();
  $("captureBadge").innerHTML = "<b></b> CAMERA OFF";
  $("captureBadge").classList.remove("connected");
  resetMotion();
  clearOverlay();
  setQuality(null);
  status("Camera is off. Enable your webcam or try keyboard inputs.");
}
function setSource(next) {
  if (source !== next) {
    stop();
    keys.clear();
    keyJump = keySwing = false;
    game.pause("Paused · Press Resume when ready");
  }
  source = next;
  $("keyboardTab").classList.toggle("active", next === "keyboard");
  $("webcamTab").classList.toggle("active", next === "webcam");
  $("sourceLabel").textContent =
    next === "keyboard" ? "KEYBOARD SIMULATION" : "NO INPUT CONNECTED";
  $("calibrate").disabled = next === "keyboard";
  $("cameraEmpty").hidden = next === "keyboard";
  keyboardView.hidden = next !== "keyboard";
  if (next === "keyboard") {
    status(
      "Keyboard test active. Click outside controls, then use A / D, S, Space, J and W.",
      true,
    );
    $("frameHint").textContent =
      "Keyboard simulation · no camera or calibration required.";
  } else
    $("frameHint").textContent =
      "Keep your whole body in view, from head to toe.";
}
async function enable() {
  if (starting || camera) return;
  if (source === "keyboard") setSource("webcam");
  starting = true;
  const token = ++generation;
  controller = new AbortController();
  $("enableCamera").disabled = true;
  $("enableCamera").textContent = "Connecting…";
  try {
    const result = await startCamera({
      signal: controller.signal,
      onStatus: (t) => {
        if (token === generation) status(t);
      },
    });
    if (token !== generation) {
      result.stop();
      return;
    }
    camera = result;
    resetMotion();
    if ($("handsFreeEnabled").checked) handsFree.arm();
    camera.video.className = "live-video";
    $("cameraStage").prepend(camera.video);
    $("cameraEmpty").hidden = true;
    $("captureBadge").innerHTML = "<b></b> CAMERA LIVE";
    $("captureBadge").classList.add("connected");
    $("sourceLabel").textContent = "ON-DEVICE POSE · LIVE";
    status("Camera ready. Frame your whole body, then calibrate.", true);
  } catch (e) {
    if (token === generation) {
      stop();
      status(e.message || "Camera could not start. Try keyboard test.");
      toast("Camera unavailable. You can still use Keyboard test.");
    }
  } finally {
    if (token === generation) {
      starting = false;
      $("enableCamera").disabled = false;
      $("enableCamera").textContent = "Enable webcam ↗";
    }
  }
}
$("enableCamera").onclick = enable;
$("webcamTab").onclick = () => setSource("webcam");
$("keyboardTab").onclick = () => setSource("keyboard");
$("stopCamera").onclick = () => {
  stop();
  if (source === "keyboard") setSource("webcam");
};
// Monitor controls proxy the existing lifecycle; never open a second camera stream.
$("monitorEnable").onclick = enable;
$("monitorStop").onclick = () => $("stopCamera").click();
$("monitorCalibrate").onclick = () => {
  $("calibrate").click();
  document.activeElement?.blur();
};
$("monitorKeyboard").onclick = () => {
  setSource("keyboard");
  document.activeElement?.blur();
};
$("mirror").onchange = () => {
  $("cameraStage").classList.toggle("unmirrored", !$("mirror").checked);
};
function beginCalibration() {
  if (!camera?.ready || !quality(camera.landmarks).full) {
    toast(
      "Show your head, shoulders, hands, knees and feet before calibrating.",
    );
    return;
  }
  engine.calibrate();
  calibrating = true;
  game.pause("Paused · Press Resume when ready");
  $("calibrationBadge").textContent = "HOLD STILL";
  $("calibrationBadge").classList.remove("ready");
  $("calibrate").textContent = "Restart calibration";
  $("calibrationHelp").textContent =
    "Hold still. Movement or hidden joints resets the timer.";
  lastLandmarks = null;
}
$("calibrate").onclick = () => {
  if ($("handsFreeEnabled").checked && camera) handsFree.arm();
  beginCalibration();
};
for (const id of Object.keys(defaults))
  $("tune-" + id).oninput = (e) => {
    handsFree.disarm();
    game.pause("Sensitivity changed · Re-arm when ready");
    engine.thresholds[id] = Number(e.target.value);
    $("out-" + id).textContent = Number(e.target.value).toFixed(2);
    engine.reset();
  };
$("resetThresholds").onclick = () => {
  handsFree.disarm();
  game.pause("Sensitivity changed · Re-arm when ready");
  engine.thresholds = { ...defaults };
  engine.reset();
  for (const [id, v] of Object.entries(defaults)) {
    $("tune-" + id).value = v;
    $("out-" + id).textContent = v.toFixed(2);
  }
  toast("Sensitivity reset to starting values.");
};
function resetGame() {
  handsFree.disarm();
  game.reset({
    mode: $("runMode").value,
    difficulty: $("runDifficulty").value,
  });
  keys.clear();
  keyJump = keySwing = false;
  $("gameResults").hidden = true;
}
function playGame() {
  if (runner.error) {
    toast(runner.error);
    return;
  }
  if (["running", "countdown"].includes(game.state)) {
    handsFree.disarm();
    game.pause();
    return;
  }
  if (handsFree.armed && !["running", "countdown"].includes(game.state)) {
    handsFree.disarm();
    return;
  }
  if (game.state === "finished") resetGame();
  if (source === "webcam" && $("handsFreeEnabled").checked) {
    handsFree.arm();
    toast(
      "Step back into full view. Hold still for calibration and the 3–2–1 countdown.",
    );
    document.activeElement?.blur();
    return;
  }
  if (source === "webcam" && (!engine.profile || !actions.valid)) {
    toast(
      "Calibrate a visible full body first, or enable Hands-free webcam start.",
    );
    return;
  }
  game.start();
  document.activeElement?.blur();
}
$("handsFreeEnabled").onchange = () => {
  if (!$("handsFreeEnabled").checked) {
    handsFree.disarm();
    if (game.state === "countdown") game.pause("Auto-start disabled");
  } else if (
    camera &&
    source === "webcam" &&
    !["running", "finished"].includes(game.state)
  )
    handsFree.arm();
};
$("playRunner").onclick = playGame;
$("resetRunner").onclick = resetGame;
$("replayRunner").onclick = playGame;
$("runMode").onchange = resetGame;
$("runDifficulty").onchange = resetGame;
$("expandRunner").onclick = () => {
  const expanded = $("runnerPanel").classList.toggle("focused");
  $("expandRunner").textContent = expanded ? "↙ Exit focus" : "↗ Focus view";
  $("runnerPanel").scrollIntoView({ behavior: "smooth", block: "start" });
};
const openGuide = () => {
  handsFree.disarm();
  game.pause("Setup guide open · Resume when ready");
  $("guideDialog").showModal();
};
$("guide").onclick = openGuide;
$("closeGuide").onclick = () => $("guideDialog").close();
$("gotIt").onclick = () => $("guideDialog").close();
$("projectsNav").onclick = () =>
  toast(
    "Project saving and branding are planned for the project-editor milestone.",
  );
$("templatesNav").onclick = () =>
  toast("Wonder Run is ready below. Project saving and branding come next.");
$("labNav").onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
$("setupNav").onclick = () => {
  $("tuningPanel").scrollIntoView({ behavior: "smooth", block: "center" });
};
const controlled = (e) =>
  ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(e.target.tagName) ||
  $("guideDialog").open;
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    handsFree.disarm();
    game.pause("Paused · Press Resume when ready");
    keys.clear();
    return;
  }
  if (source !== "keyboard" || controlled(e)) return;
  const k = e.key.toLowerCase();
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k))
    e.preventDefault();
  keys.add(k);
  if (!e.repeat && k === " ") keyJump = true;
  if (!e.repeat && k === "j") keySwing = true;
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
function blur() {
  handsFree.disarm();
  keys.clear();
  keyJump = keySwing = false;
  game.pause("Paused · Press Resume when ready");
  engine.reset();
  actions = neutralActions();
}
window.addEventListener("blur", blur);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) blur();
});
window.addEventListener("pagehide", () => {
  stop();
  runner.dispose?.();
});
function setQuality(p) {
  const q = quality(p);
  for (const k of ["torso", "hands", "legs"]) {
    $("check-" + k).classList.toggle("visible", q[k]);
    $("quality-" + k).textContent = q[k] ? "In view" : "Waiting";
    $("quality-" + k).classList.toggle("good", q[k]);
  }
  return q;
}
const ctx = $("overlay").getContext("2d");
const links = [
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 31],
  [28, 32],
];
function clearOverlay() {
  ctx.clearRect(0, 0, $("overlay").width, $("overlay").height);
}
function drawPose(p) {
  const canvas = $("overlay"),
    v = camera.video;
  canvas.width = v.videoWidth || 640;
  canvas.height = v.videoHeight || 480;
  clearOverlay();
  if (!p) return;
  ctx.strokeStyle = "#d6f65c";
  ctx.fillStyle = "#e9ff98";
  ctx.lineWidth = 3;
  for (const [a, b] of links) {
    if (p[a]?.visibility > 0.55 && p[b]?.visibility > 0.55) {
      ctx.beginPath();
      ctx.moveTo(p[a].x * canvas.width, p[a].y * canvas.height);
      ctx.lineTo(p[b].x * canvas.width, p[b].y * canvas.height);
      ctx.stroke();
    }
  }
  for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32])
    if (p[i]?.visibility > 0.55) {
      ctx.beginPath();
      ctx.arc(p[i].x * canvas.width, p[i].y * canvas.height, 4, 0, Math.PI * 2);
      ctx.fill();
    }
}
function updateCards(a, now) {
  if (a.jump) lastJump = now;
  if (a.swing) lastSwing = now;
  const vals = {
    lean: Math.abs(a.lean),
    squat: a.squat ? 1 : 0,
    jump: now - lastJump < 450 && lastJump > 0 ? 1 : 0,
    swing: now - lastSwing < 450 && lastSwing > 0 ? 1 : 0,
    run: a.intensity,
  };
  for (const [id] of cards) {
    const active = vals[id] > 0.05;
    $("card-" + id).classList.toggle("detected", active);
    $("state-" + id).textContent = active
      ? id === "lean"
        ? a.lean < 0
          ? "LEFT"
          : "RIGHT"
        : "ACTIVE"
      : "IDLE";
    $("value-" + id).innerHTML =
      id === "lean"
        ? `${a.lean.toFixed(2)}<small> ${active ? "steer" : "neutral"}</small>`
        : id === "run"
          ? `${Math.round(a.cadence)}<small> steps/min</small>`
          : active
            ? id === "squat"
              ? "Held"
              : "Detected"
            : "—";
    $("meter-" + id).style.width = `${Math.min(1, vals[id]) * 100}%`;
  }
}
function updateGameUI(a) {
  $("gameScore").textContent = game.score.toLocaleString();
  $("gameLives").textContent = "♥ ".repeat(game.lives).trim() || "—";
  $("gameTime").textContent = `${Math.ceil(game.duration - game.time)}s`;
  $("gameCoins").textContent = game.coins;
  $("runnerSource").textContent =
    (source === "keyboard" ? "KEYBOARD SIMULATION" : "WEBCAM CONTROLS") +
    " · " +
    (game.mode === "auto" ? "B / AUTO-RUN" : "A / RUN IN PLACE");
  $("runnerState").textContent = runner.error
    ? "WEBGL UNAVAILABLE"
    : game.state.toUpperCase();
  $("gameMessage").textContent = runner.error
    ? runner.error
    : game.state === "countdown"
      ? String(Math.max(1, Math.ceil(game.countdown)))
      : game.state === "ready"
        ? handsFree.armed
          ? "Step back · Full body visible → hold steady → 3–2–1"
          : "Ready? Choose your mode and start."
        : game.state === "paused"
          ? handsFree.armed
            ? "Step back into full view · Countdown will restart"
            : game.reason
          : game.state === "running" &&
              game.mode === "steps" &&
              game.speed < 0.1
            ? "Run in place or hold W to move"
            : "";
  $("gameMessage").classList.toggle("counting", game.state === "countdown");
  $("gameFeedback").textContent = game.feedbackTime > 0 ? game.feedback : "";
  $("playRunner").textContent = ["running", "countdown"].includes(game.state)
    ? "Ⅱ Pause"
    : handsFree.armed
      ? "Cancel auto-start"
      : source === "webcam" && $("handsFreeEnabled").checked
        ? game.state === "finished"
          ? "Step back to replay"
          : "Step back to start"
        : game.state === "paused"
          ? "▶ Resume"
          : game.state === "finished"
            ? "↻ Play again"
            : "▶ Start run";
  $("gameResults").hidden = game.state !== "finished";
  if (game.state === "finished") {
    $("resultTitle").textContent = game.reason;
    $("resultScore").textContent = game.score.toLocaleString();
    $("resultDetails").textContent =
      `${Math.floor(game.distance)} m · ${game.coins} pickups · ${game.cleared} rows cleared · ${game.time.toFixed(1)} s · ${source === "keyboard" ? "Keyboard" : "Webcam"}`;
  }
  $("gameSession").textContent =
    `${Math.floor(game.distance)} m · ${game.speed.toFixed(1)} m/s · ${game.difficulty} · Seed 2026 · Mode/difficulty changes reset the run`;
  $("runner").classList.toggle(
    "collision",
    game.feedbackTime > 1.1 && game.feedback.startsWith("Collision"),
  );
}
const monitorContext = $("monitorCanvas").getContext("2d");
let monitorFrame = -1;
function updateMonitor(a) {
  const live = !!camera;
  const q = quality(live && camera.ready ? camera.landmarks : null);
  const mirrored = $("mirror").checked;
  $("monitorCanvas").style.transform = mirrored ? "scaleX(-1)" : "none";
  $("monitorCanvas").setAttribute(
    "aria-label",
    `${mirrored ? "Mirrored" : "Unmirrored"} live webcam and skeleton preview`,
  );
  $("monitorBadge").textContent =
    source === "keyboard"
      ? "KEYBOARD"
      : starting
        ? "CONNECTING"
        : live
          ? "LIVE"
          : "CAMERA OFF";
  $("monitorBadge").classList.toggle("good", live && a.valid);
  $("monitorEmpty").hidden = live;
  $("monitorCanvas").hidden = !live;
  $("monitorEmpty").textContent =
    source === "keyboard"
      ? "Keyboard test active. Enable webcam here to return to motion controls."
      : "Enable webcam to see your full body here while you play.";
  $("monitorEnable").hidden = live;
  $("monitorEnable").disabled = starting;
  $("monitorStop").hidden = !live && !starting;
  $("monitorCalibrate").disabled = !live || !q.full || starting;
  $("monitorCalibrate").textContent = calibrating
    ? "Restart calibration"
    : engine.profile
      ? "Recalibrate"
      : "Calibrate stance";
  $("monitorKeyboard").hidden = source === "keyboard";
  $("monitorStatus").textContent =
    source === "keyboard"
      ? "A/D lean · S squat · Space jump · W run"
      : starting
        ? $("statusText").textContent
        : !live
          ? $("statusText").textContent
          : calibrating
            ? `Hold steady · ${Math.round((engine.samples?.length ? Math.min(1, (engine.samples.at(-1).time - engine.samples[0].time) / 2000) : 0) * 100)}%`
            : !q.full
              ? "Tracking incomplete · Show head, hands, knees and feet"
              : !engine.profile
                ? "Full body visible · Calibrate your neutral stance"
                : a.valid
                  ? "Calibrated · Full body tracked"
                  : "Waiting for fresh tracking · Game paused";
  for (const [id, label] of [
    ["torso", "Torso"],
    ["hands", "Hands"],
    ["legs", "Feet"],
  ]) {
    $("monitor-" + id).textContent = `${label} ${q[id] ? "✓" : "—"}`;
    $("monitor-" + id).classList.toggle("good", q[id]);
  }
  if (!live) {
    monitorFrame = -1;
    monitorContext.clearRect(
      0,
      0,
      $("monitorCanvas").width,
      $("monitorCanvas").height,
    );
    return;
  }
  // Draw only visible monitors at video-frame cadence. Copy original overlay pixels,
  // not a second tracker; CSS applies the same mirroring to video and skeleton.
  const rect = $("monitorCanvas").getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > innerHeight || camera.video.readyState < 2)
    return;
  if (monitorFrame === camera.video.currentTime) return;
  monitorFrame = camera.video.currentTime;
  const canvas = $("monitorCanvas");
  const width = camera.video.videoWidth || 640,
    height = camera.video.videoHeight || 480;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  monitorContext.drawImage(camera.video, 0, 0, width, height);
  if (camera.ready) monitorContext.drawImage($("overlay"), 0, 0, width, height);
}
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  let a = neutralActions();
  if (source === "keyboard") {
    const down = (...k) => k.some((x) => keys.has(x));
    a = {
      lean: Number(down("d", "arrowright")) - Number(down("a", "arrowleft")),
      squat: down("s", "arrowdown"),
      jump: keyJump,
      swing: keySwing,
      cadence: down("w", "arrowup") ? 150 : 0,
      intensity: down("w", "arrowup") ? 1 : 0,
      valid: true,
    };
    keyJump = keySwing = false;
    $("sourceLabel").textContent = "KEYBOARD SIMULATION";
    $("fpsLabel").textContent = "SIMULATED";
  } else if (camera) {
    if (camera.failed) {
      stop();
      status("Camera disconnected or tracking stopped. Reconnect to retry.");
    } else if (camera.ready && camera.landmarks !== lastLandmarks) {
      const age = lastFrameAt ? now - lastFrameAt : 0;
      lastFrameAt = now;
      if (age) fps = fps * 0.8 + (1000 / age) * 0.2;
      lastLandmarks = camera.landmarks;
      const result = engine.update(lastLandmarks, now);
      actions = result.actions;
      a = actions;
      setQuality(lastLandmarks);
      drawPose(lastLandmarks);
      $("calibrationProgress").style.width = `${result.progress * 100}%`;
      if (calibrating && engine.profile) {
        calibrating = false;
        $("calibrationBadge").textContent = "CALIBRATED";
        $("calibrationBadge").classList.add("ready");
        $("calibrate").textContent = "Recalibrate stance";
        $("calibrationHelp").textContent =
          "Baseline set. Recalibrate for a new player or camera position.";
        status(
          "Calibrated. Try your movements and check the input cards.",
          true,
        );
      }
      $("frameHint").textContent = result.q.full
        ? engine.profile
          ? "Full body visible · Try a movement"
          : "Full body visible · Ready to calibrate"
        : "Step back · Keep head, hands, knees and feet visible";
    } else if (now - lastFrameAt < 500 && camera.ready) {
      a = { ...actions, jump: false, swing: false };
    } else {
      actions = neutralActions();
      engine.reset();
      if (calibrating) engine.samples = [];
      setQuality(null);
      clearOverlay();
      $("calibrationProgress").style.width = "0%";
      $("frameHint").textContent =
        "Tracking lost · Move fully into view. Preview paused.";
      game.pause("Paused · Press Resume when ready");
    }
    $("fpsLabel").textContent =
      `${Math.round(fps)} FPS · ${Math.max(0, Math.round(now - lastFrameAt))} ms`;
  } else {
    $("fpsLabel").textContent = "— FPS";
  }
  if (source === "webcam" && !a.valid)
    game.pause("Tracking unavailable · Show your full body, then resume");
  $("signalDot").classList.toggle("live", a.valid);
  $("signalText").textContent =
    source === "keyboard"
      ? "Keyboard simulation"
      : a.valid
        ? "Live motion signals"
        : "Waiting for calibrated pose";
  updateCards(a, now);
  const readyForHandsFree =
    source === "webcam" &&
    !!camera?.ready &&
    now - lastFrameAt < 250 &&
    quality(camera.landmarks).full;
  if (handsFree.armed && game.state === "countdown" && !readyForHandsFree)
    game.pause("Full body tracking interrupted · Countdown will restart");
  const autoAction = handsFree.update({
    now,
    visible: readyForHandsFree,
    calibrated: !!engine.profile && a.valid,
    calibrating,
    state: game.state,
    allowed:
      source === "webcam" &&
      !!camera &&
      $("handsFreeEnabled").checked &&
      !runner.error &&
      !document.hidden &&
      document.hasFocus() &&
      !$("guideDialog").open,
  });
  if (autoAction === "calibrate") beginCalibration();
  if (autoAction === "start") game.start();
  $("handsFreeStatus").textContent =
    source === "keyboard"
      ? "Keyboard mode · Manual start"
      : !$("handsFreeEnabled").checked
        ? "Manual webcam start"
        : !handsFree.armed
          ? "Auto-start off until you enable webcam or press Step back to start"
          : calibrating
            ? "Hold still · Calibrating your stance…"
            : game.state === "countdown"
              ? "Keep your full body visible · 3–2–1 countdown"
              : game.state === "running"
                ? "Hands-free active · Tracking loss pauses, full-body return restarts countdown"
                : "Step back · Show head, hands, knees and feet. Hold still.";
  game.update(dt, a);
  runner.draw(game);
  updateGameUI(a);
  updateMonitor(a);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
