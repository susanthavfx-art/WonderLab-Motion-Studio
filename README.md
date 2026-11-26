# WonderLab Motion Studio

An internal, local-first webcam motion-game workbench for branded company events.

## Run

Requires Node.js 22 LTS (tested with 22.22.3) and npm.

```sh
npm ci
npm run dev
```

Open the displayed URL. Camera access needs HTTPS (or localhost on your own computer). The Arena preview is served over HTTPS; if an embedded browser blocks camera permission, open the preview in its own tab. The dev server binds to `0.0.0.0` and permits Arena's `.e2b.app` host. It is a development server, not private/authenticated production hosting.

```sh
npm test                # pure motion-engine tests
npm run build           # production output in dist/
npm run preview         # serve the production output
npm run format:check
```

## Current milestone: Motion Lab

- On-device MediaPipe Pose lite, same-origin WASM/model assets, explicit webcam enable/stop/retry.
- Mirrored, uncropped video and skeleton preview; torso, hands/arms and legs/feet visibility checks; inference rate/frame age.
- Two-second stable full-body calibration. Calibration restarts when required landmarks disappear or stance shifts. Recalibrate after changing player or camera position.
- Experimental torso lean, wrist swing, squat, jump and alternating-step/cadence estimates, with live cards and session-only sensitivity controls.
- Keyboard test without webcam: **A/D or arrows** lean, **S/down** squat, **Space** jump, **J** swing, **hold W/up** simulate running. Click outside buttons/inputs to use game keys. Escape, window blur and tab hiding pause the preview and clear keys.
- A lightweight Three.js **input visualizer**, selectable A (run-in-place intensity) / B (auto-run). Calibrate a visible body or choose Keyboard test, then press Start preview. Lost/stale required tracking pauses motion playback; restart manually after reacquisition.
- Responsive desktop/mobile layout, setup guide and explicit future-feature notices.

**Not yet a finished runner game.** Obstacles, collisions, scoring, project save/load, branding uploads and event play mode are next milestones. Projects/Templates in the sidebar are clearly marked Soon and explain the planned scope. Calibration and sensitivity are deliberately not persisted. No backend, authentication, video recording or cloud uploads are implemented.

### Implementation choice

This first vertical slice uses Vite + plain ES modules + Three.js, with pure motion logic separate from capture, UI and rendering. React/TypeScript in the original plan remain possible as the project editor grows; they are not prerequisites for validating the camera/detector loop. Dependencies are pinned in the lockfile. The camera lifecycle implementation is adapted from the reviewed Snow Trail source in the same owner's repositories.

## Verification and honest limitations

- `npm test`: **14/14 synthetic motion tests passed** (framing, calibration, stability, idle, lean, squat, jump rearm, swing cooldown, alternating steps, decay and tracking gaps).
- `npm run build`: passed. A bundle-size advisory remains for the Three.js-containing application bundle; runtime pose WASM/models add approximately 18 MB before compression. No CDN is required, but this is not an offline-cached app.
- Headless Chromium smoke checks: rendered WebGL playground, keyboard lean/run/jump, guide, calibration guard, sensitivity reset, source switching, simulated camera permission denial/retry and 390px layout without horizontal overflow; no uncaught page errors. An initial fixed-100ms browser assertion was timing-sensitive under software WebGL; rerunning with condition-based waits passed.
- `npm audit` after dependency setup: **0 vulnerabilities**.
- **Real camera inference, physical movement accuracy, event-hardware FPS/latency and production hosting camera permissions have not been validated.** Passing synthetic/browser tests is not proof of those properties. Monocular jump/ground-contact and squat/run discrimination remain experimental. All required body regions currently gate motion together; per-action partial-body support is deferred.
- Preview mirroring changes display only; it does not silently invert the normalized game direction. Finger-level tracking is not included.
- No asset licences have been audited for future client distribution; the current preview uses generated geometry, not copied game models or music.

## First real-webcam test

1. Set up clear floor space and even light. Frame head, hands, knees and feet with movement margin; adjust distance to your lens (2–3m is only a starting guide).
2. Enable webcam, check the three body-region indicators, then calibrate a relaxed stance for two seconds.
3. Watch the input cards while testing 10 leans each side, 10 squats, optional small jumps, swings and alternating steps. Note misses/false positives. Never jump if unsafe.
4. Test both visualizer modes. In A, stopping steps should decay intensity to zero. In B, character motion should continue only while tracking is valid and playback is started.
5. Hide a foot, leave view, return, stop/reconnect the camera and switch input sources. Lost tracking must not keep the preview running.
6. Share browser/device, camera framing, threshold values and incorrect detections before tuning the full runner.

## Design documents

- [Existing games: code review and verification](docs/repository-review.md)
- [Practical MVP architecture, milestones and webcam acceptance tests](docs/mvp-plan.md)

The existing Snow Trail and Badminton repositories were reviewed, not modified.
