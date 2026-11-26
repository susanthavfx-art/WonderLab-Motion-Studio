# WonderLab Motion Studio — practical MVP

## Product boundary

Single operator, single camera, single player, desktop Chrome/Edge first. An internal tool for producing branded event games, not a public SaaS or a no-code arbitrary-game engine. First template: a three-lane parkour runner with two selectable running modes. Existing Snow/Badminton migrations come later.

Build local-first: no backend needed for proving motion and gameplay. Supabase/cloud libraries can be added after local project files and event reliability work. No login, payments, multiplayer, generative assets or arbitrary scripting in this MVP.

## Proposed architecture

Use TypeScript + Vite + React for editor controls; Three.js for the runner. Use a pose-provider interface, initially adapting the known local MediaPipe Pose lite integration. Evaluate Tasks Vision as a separate spike rather than block the first vertical slice on migration. Pin verified dependencies at implementation time. Keep WASM/models same-origin, with explicit loading states and no mandatory CDN.

```text
src/
  app/                 project list, editor, Motion Lab, event player
  motion/              capture, pose adapter, visibility, calibration, detectors
  input/               keyboard adapter, motion-action mapping, input arbiter
  runtime/             session state, clock, scoring, pause, audio
  templates/runner/    pure simulation, obstacle generator, renderer, settings
  projects/            schema, migrations, validation, local persistence, export
  assets/              slot registry, loaders, size/type checks, object URL cleanup
```

Data flow: camera → timestamped landmarks → confidence/body-scale normalization → calibration → detectors → normalized action state → runner simulation → renderer. Keyboard produces the same action state. Editor UI cannot drive simulation by mutating scene objects directly.

Suggested contracts:

- `PoseFrame`: monotonic timestamp, image/world landmarks if available, per-landmark visibility, frame dimensions.
- `CalibrationProfile`: neutral torso/hip/ankle positions, body scale, lean zero, comfortable range, camera/mirror metadata. Session-scoped; recalibrate on player/camera change.
- `ActionState`: lean `[-1,1]`, cadence, run intensity `[0,1]`, squat held, one-shot jump/swing events, source, timestamp and tracking quality. Discrete actions include event IDs; rendering must not replay one inference event every frame.
- `Project`: schemaVersion, id/name, templateId/version, brand colours/text, asset references, difficulty/scoring/duration, input mapping and mode A/B. No raw webcam images or personal calibration in project exports.
- Template lifecycle: `load`, `start`, `update(dt, actions)`, `pause`, `reset`, `dispose`, `getResults`. Motion services are owned by the app, never by the template.

## Movement design

| Action | Initial detector | Guardrails |
|---|---|---|
| Lean | Shoulder/hip midpoint offset or torso angle relative to calibrated neutral | Body-scale normalization, smoothing, dead zone, separate enter/exit thresholds, mirror test |
| Swing | Wrist velocity relative to shoulder/body scale | Wrist/arm confidence, timestamp delta limits, cooldown, reset history after loss |
| Squat | Hip lowering plus knee bend against neutral | Knees/ankles visible, separate enter/exit thresholds, minimum dwell; do not interpret moving closer as a squat |
| Jump | Both feet lift plus upward hip motion relative to floor/neutral | State machine grounded/rising/airborne/landed; one event per cycle; distinguish squat recovery and alternating running knees |
| Run in place | Alternating knee/ankle cycles relative to hips, rolling cadence | Require left/right alternation, minimum amplitude, reject simultaneous foot rises, clamp speed, decay to zero when steps stop |

All are webcam estimates, not biomechanical measurements. Monocular pose cannot guarantee true ground contact or depth; document and tune failure cases with real hardware. Finger-level hand tracking is out of scope; add a dedicated hand provider only if a later game needs it.

## Runner modes

**A — run in place:** speed follows a smoothed cadence/intensity curve; no steps means speed decays to zero. Lean selects lanes, jump clears low blocks, squat ducks under overhead bars. Moderate mode can accept marching in place. Prioritize foot visibility; never silently auto-run on lost legs.

**B — auto-run:** template-defined speed/ramp; lean selects lanes, jump/squat avoid obstacles. Tracking loss still pauses motion gameplay; auto-run does not mean continue blind.

Both share collision rules, pickups, distance/bonus scoring, duration, difficulty and results. Keyboard: A/D or arrows change lanes, Space jumps, S/down crouches, hold W/up to simulate running in mode A; Escape pauses. Avoid impossible jump/squat/obstacle combinations using generation constraints. Start with geometry avatar/obstacles; polish/GLB avatar after mechanics are trustworthy.

## Build sequence and completion gates

### 1. Foundation + Motion Lab (next implementation step)

- Runnable shell with Motion Lab as the main screen, permission-aware start/stop/retry and keyboard-only path.
- Mirrored uncropped camera + skeleton, in-frame guide, visibility indicators for torso/hands/knees/feet, inference FPS and last-frame age.
- Neutral calibration over multiple stable samples, countdown and recalibration; block calibration when required landmarks are clipped/unstable.
- Detector cards for lean, swing, squat, jump, steps/cadence; editable thresholds and reset-to-default. Always distinguish inferred vs keyboard-simulated actions.
- Pure detector tests with synthetic timestamped landmarks for neutral/noise/pose loss and positive/negative examples. These are not substitutes for webcam testing.
- Gate: user validates each movement in actual camera view before motion controls are considered ready. Record unresolved conditions instead of claiming full-body support from the overlay alone.

### 2. Runner vertical slice

- Three lanes, primitive avatar, floor pooling, blocks, bars, pickups, bounded collision window, score/lives/time and results.
- Keyboard implementation first; then connect the same input contract to both motion modes.
- Seeded obstacle sequences for repeatable testing, fair spawn gaps based on configured speed and reaction time, pause/reset/replay.
- Gate: mode A stops when stepping stops; B keeps configured speed with valid tracking; pose loss freezes time, obstacles, collisions and scoring. Stable reacquisition offers a countdown/manual resume, not a surprise restart.

### 3. Project editor and branding

- One runner template, project duplicate/rename/delete and versioned save/load.
- Logo, primary/accent colours, title/CTA, background image; runner asset slots for avatar/props (GLB) and sound events (MP3/WAV/OGG as browser-supported).
- Validate extensions, actual load success, configurable size budgets, bounded numeric settings and safe text rendering. Never execute uploaded code/HTML; GLB load failures fall back to primitives. MVP supports fitting a static model; arbitrary rig retargeting is not promised. Declare supported rig/animation names before adding animated replacements.
- Metadata in IndexedDB alongside asset Blobs; JSON-only export explicitly warns when assets are external. Portable project ZIP includes manifest + assets and import validates schema/version, file sizes and archive paths. Test import on a clean browser profile with no original files present.
- Gate: changing a brand requires no code edits; save/reload/duplicate and portable export/import preserve the project and assets.

### 4. Event play mode / delivery hardening

- Read-only player route using a project snapshot, hidden editor controls, fullscreen request on user gesture, countdown, safe pause, restart, results and next-player recalibration.
- Operator keyboard controls always available; switching to keyboard is explicit and shown on screen.
- Hardware preflight: camera permissions/device, complete body framing, WebGL, local pose assets, audio unlock, model readiness and display scaling.
- Gate: run a minimum 30-minute event rehearsal with repeated players, camera disconnect/reconnect, permission denial, reload, tab switches, muted audio and failed assets. Verify no accumulated loops/tracks/object URLs or unexpected game starts.
- Do not promise offline operation until production asset caching and a network-disabled reload have been tested. Deliver a tested hosted build first; offline packaging is a later explicit requirement.

## Webcam validation protocol

Use the actual event laptop, webcam and display. Start around 2–3m away only as a rough guide; adjust to the webcam field of view so head, hands and feet fit with movement margins. Camera stable, approximately waist/chest height as practical, even lighting, clear floor, one player; do not crop/stretch the inference frame. User should not jump if space/health/footwear makes it unsafe; offer keyboard/march alternatives.

For each mode: idle 30s; 10 left/right leans; 10 comfortable squats; 10 optional small jumps; 10 swings per hand; 30s running/marching then stop. Log expected vs detected actions, false triggers, missed triggers, cadence decay, input latency and FPS. Repeat with different heights, clothes, camera distances and lighting; test partially hidden feet/hands, leaving/re-entering view, fast mode changes and squat-to-stand vs jump confusion.

Initial targets to validate, not current claims: no idle discrete-action triggers during 30s; at least 9/10 intentional actions in supported setup; pause within 1s of sustained required-landmark loss; run intensity decays to zero within 1s after stopping; measured playable rendering (target 30+ FPS) and motion response (target under 200ms) on event hardware. Tune thresholds after collecting results. Use an operator test log with device/browser, room setup, detector settings and failures; avoid retaining video unless explicitly requested with consent.

## Deferred

Multi-user accounts, Supabase sync/storage, Drive asset import, cloud analytics/leaderboards, secure commercial licensing, full visual scripting, template marketplace, complex parkour/physics, finger gestures, multiplayer, arbitrary avatar retargeting and automatic conversion of Snow/Badminton. The architecture leaves seams for these without making them prerequisites for the first saleable runner.
