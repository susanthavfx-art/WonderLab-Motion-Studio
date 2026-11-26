# Existing game review

Reviewed 2026-11-26. Source inspection and existing Node tests, not a browser, build, performance or real-webcam certification.

## Source snapshots

- [Snow Trail](https://github.com/susanthavfx-art/WonderLab-Snow-Trail), main `0047ebed48d2bcd8f9d137be69a65f5708d0bf4e`.
- [Badminton](https://github.com/susanthavfx-art/WebCameGames-Batminton), main `3eeaf9600afa1bbb79c8cd04ec9608c086d90e3f`.
- Motion Studio checkout was empty except for Git metadata. This review does not modify the original repositories or copy their large asset libraries.

## What exists and what to extract

| Source | Evidence / current behaviour | Studio recommendation |
|---|---|---|
| Snow `src/camera.js` (141 lines) | Local MediaPipe Pose assets; lite model; serial inference throttled around 15.6 FPS; permission/init/inference timeouts; abort and late-stream cleanup; track-ended handling; shoulders/hips visibility and 750ms recent-pose window | Best starting pattern for a standalone camera/tracker service. Separate capture from inference and movement detection; retain lifecycle protections and retry tests. |
| Snow `src/pose-view.js` | Video/skeleton overlay includes knees and ankles; visibility-based drawing | Extract display logic with explicit stream ownership. A drawn leg is not proof that leg actions are implemented. |
| Snow `src/ride-gate.js`, tests | Stable stance and countdown; initial lock vs recent tracking grace | Extract generic readiness gate, replacing torso-only lock with action-specific/full-body requirements. |
| Snow `src/run.js` (725 lines) | Three.js endless environment, steering, scoring, collisions, ramp-triggered jumps, HUD, model and renderer teardown | Reuse scene pooling, delta-time movement and disposal patterns, not the entire run module. Split simulation, input, rendering and UI. |
| Snow `src/models.js`, environment modules | Asset loading, scene fitting, instancing, atmosphere | Adapt a small asset registry/renderer layer after runner mechanics work. Keep snow scenery template-specific. |
| Badminton `src/main.js:115–122` | Camera lifecycle and pose callback embedded in game UI. Shoulder-centre position drives aim; successive wrist velocity triggers directional/raised swings | Extract temporal swing idea into a pure timestamp-based detector, normalized to body scale; test noise, occlusion, cooldown and handedness. |
| Badminton `src/gameplay.js`, `rules.js` | Mostly pure contact, flight, AI and scoring rules | Strong example for deterministic runner rules and unit-test separation. Badminton physics are not runner mechanics. |
| Badminton `src/audio.js`, tests | Mute, decode/load handling, stale/late sound protection | Adapt audio-service interface; expose template sound slots. |
| Badminton `src/arena3d.js`, `view.js` | Rendering and camera/layout helpers separated from much of gameplay | Keep this separation; do not embed tracker knowledge in the renderer. |
| Badminton `scripts/assets.js` | Copies local pose runtime, models, UI and sounds before dev/build | Preserve same-origin runtime assets; narrow the manifest rather than copying every pose model. |
| Badminton `src/landing.js` (830 lines) | Landing pages, language, free/paid browser storage and modals | Do not migrate the commercial landing/payment scaffolding into an internal authoring tool. Browser storage entitlements are not secure licensing. |

## Important gaps / risks

1. **Neither game implements the requested full movement set.** Snow's implemented motion output is torso lean. In `run.js:669`, ramp proximity initiates a jump; it is not webcam jump detection. Do not assume squat acceleration from repository description alone: the inspected camera API has no squat output.
2. **Full-body readiness is missing.** Snow validates shoulders/hips (`camera.js`); Badminton gates on shoulders (`main.js:121`). Runner mode A needs confident hips/knees/ankles, in-frame feet and useful body scale. Wrist visibility must independently gate hand actions. Pose landmarks provide coarse wrist/hand points, not articulated finger tracking.
3. **Calibration is not reusable yet.** Both lack a multi-sample neutral/full-body calibration profile. Badminton wrist speeds use image coordinates, so camera distance changes sensitivity; torso-normalized movement and per-player baselines are needed.
4. **Badminton tracking lifecycle needs hardening.** `loadPose` lacks explicit startup timeout; switching to keyboard stops tracks but retains pose runtime. Re-enable can overlap a previous inference callback. Use generation tokens, one in-flight inference, close/dispose and stale-result rejection. These are code risks, not reproduced browser defects.
5. **Pose loss needs game-level policy.** Snow already has a readiness gate; Badminton can leave previous aim/state when pose disappears. Studio must neutralize controls, clear temporal history and freeze scoring/collisions rather than accept stale actions.
6. **Mirroring must have one explicit contract.** Preview can mirror via CSS; raw landmarks must not be accidentally flipped again. Test player-left means screen-left consistently, with a visible invert option.
7. **No shared project/template schema.** Game settings and branding are currently specific to their UIs. Add schema versioning, validation and asset-slot contracts, not executable imported scripts.
8. **Asset ownership is separate from code access.** Confirm model, texture, music and font commercial licences and redistribution permissions before client delivery. Do not assume every GLB supports interchangeable skeletal animations.
9. **Browser-only does not mean protected.** Static deployed editor URL is not access control. Keep MVP local/internal, or add real hosting access protection before uploading confidential brands.

## Verification performed

- Snow: `node --test test/*.test.js` equivalent on extracted source: **3/3 passed**.
- Badminton: `node --test tests/*.test.js` from its repository directory: **31/31 passed**, including asset checks.
- An initial Badminton run from the Studio root produced three relative-path asset errors; rerunning with the correct working directory passed all tests. These were invocation errors, not source defects.
- No dependency install/build, WebGL/browser smoke test, model animation retargeting or camera inference measurement was performed. Existing passing tests do not validate live movement accuracy.

## Decision

Keep Vite + Three.js knowledge, camera lifecycle patterns, skeleton UI, readiness countdown, pure-rule tests, audio handling and resource cleanup. Build a new small shared motion core and project schema; do not merge both game entrypoints or add a general-purpose visual game engine in the MVP.
