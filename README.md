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
npm test                # pure motion-engine and runner simulation tests
npm run build           # production output in dist/
npm run preview         # serve the production output
npm run format:check
```

## GitHub Pages deployment

Pages must use **Settings → Pages → Build and deployment → Source: GitHub Actions** (not a raw repository/branch upload).

The `Build and deploy Motion Lab` workflow installs locked dependencies, runs tests and formatting checks, builds Vite, checks the production assets, and uploads **only `dist/`**. Pull requests validate the build without deploying. Merging to `main` automatically deploys to:

https://susanthavfx-art.github.io/WonderLab-Motion-Studio/

Vite uses a relative `base: "./"` so scripts, CSS and MediaPipe runtime assets resolve under the project URL. Serving the source `index.html` directly will not work: browsers cannot compile Vite imports or resolve npm packages. After a deployment succeeds, hard-refresh the site (`Ctrl+Shift+R`) if it still shows a cached blank page. Camera permission remains a separate browser prompt after the UI loads.

Run `npm run build && node scripts/check-build.mjs` to verify compiled HTML, relative entrypoint/style URLs and local pose runtime assets before deployment. GitHub Pages is public hosting, not an authenticated internal workspace; do not publish confidential client assets here.

## Current milestone: Motion Lab + Wonder Run

- On-device MediaPipe Pose lite, same-origin WASM/model assets, explicit webcam enable/stop/retry.
- Mirrored, uncropped video and skeleton preview; torso, hands/arms and legs/feet visibility checks; inference rate/frame age.
- Two-second stable full-body calibration. Calibration restarts when required landmarks disappear or stance shifts. Recalibrate after changing player or camera position.
- Experimental torso lean, wrist swing, squat, jump and alternating-step/cadence estimates, with live cards and session-only sensitivity controls.
- Keyboard test without webcam: **A/D or arrows** lean, **S/down** squat, **Space** jump, **J** swing, **hold W/up** simulate running. Click outside buttons/inputs to use game keys. Escape, window blur and tab hiding pause the game and clear keys.
- **Wonder Run playable prototype:** three lanes, orange jump blocks, blue duck-under bars, gold pickups, score, three lives, a 60-second session and results/replay. Select A (run-in-place intensity) / B (auto-run), and Easy/Normal/Hard. Calibrate a visible body or choose Keyboard test, then press Start run. Each start/resume has a 3-second countdown. Lost/stale required tracking pauses time, distance, collisions and score; resume manually after reacquisition. Focus view enlarges the game without browser fullscreen permission.
- Responsive desktop/mobile layout, setup guide and explicit future-feature notices.

**Still a prototype, not event-ready.** Project save/load, branding uploads, custom models/audio, persistent leaderboards and dedicated event play mode are next milestones. Projects/Templates in the sidebar are clearly marked Soon and explain the planned scope. Calibration and sensitivity are deliberately not persisted. No backend, authentication, video recording or cloud uploads are implemented.

### Implementation choice

This first vertical slice uses Vite + plain ES modules + Three.js, with pure motion logic separate from capture, UI and rendering. React/TypeScript in the original plan remain possible as the project editor grows; they are not prerequisites for validating the camera/detector loop. Dependencies are pinned in the lockfile. The camera lifecycle implementation is adapted from the reviewed Snow Trail source in the same owner's repositories.

## Verification and honest limitations

- `npm test`: **26/26 tests passed**: 14 motion tests plus 12 runner tests (seeded fair spacing, countdown, modes A/B, lane transitions, one-shot collisions/pickups, jump/duck rules, pause/reacquisition, results/reset and 30/60/120 FPS agreement).
- `npm run build`: passed. A bundle-size advisory remains for the Three.js-containing application bundle; runtime pose WASM/models add approximately 18 MB before compression. No CDN is required, but this is not an offline-cached app.
- Headless Chromium smoke checks: rendered WebGL playground, keyboard lean/run/jump, guide, calibration guard, sensitivity reset, source switching, simulated camera permission denial/retry and 390px layout without horizontal overflow; no uncaught page errors. An initial fixed-100ms browser assertion was timing-sensitive under software WebGL; rerunning with condition-based waits passed.
- `npm audit` after dependency setup: **0 vulnerabilities**.
- The operator reported working lean, squat/release, swing, run-in-place and jump on their own webcam setup after the Pages fix. This is a qualitative first-device check, not a measured accuracy benchmark. **The new scored runner still requires webcam playtesting; other players/lighting, event-hardware FPS/latency and endurance have not been validated.** Passing synthetic/browser tests is not proof of those properties. Monocular jump/ground-contact and squat/run discrimination remain experimental. All required body regions currently gate motion together; per-action partial-body support is deferred.
- Preview mirroring changes display only; it does not silently invert the normalized game direction. Finger-level tracking is not included.
- No asset licences have been audited for future client distribution; the current runner uses generated geometry, not copied game models or music.

## Runner controls and rules

- Lean left/right to select the corresponding outer lane; stand neutral for the centre. Lane thresholds have hysteresis; transitions are bounded, not teleports. Keyboard A/D or left/right behave the same way (hold to stay in an outer lane).
- Jump over orange blocks; duck under blue overhead bars. A jump and squat cannot combine to bypass a bar. You can also dodge to another lane.
- Gold pickup: +100. Each safely cleared obstacle row: +50. Distance: +1 per whole metre. A collision costs one life, once per row. Three collisions or the 60-second timer end the session.
- Mode A uses motion intensity (W/up in keyboard mode), with bounded acceleration/deceleration. Standing still stops distance, but the **session timer continues**. Mode B automatically accelerates to the difficulty speed (6/8/10 m/s).
- Every course uses seed 2026 for repeatable testing. Each row has one hazard, at least two open lanes and a pickup in another lane; rows are 22 metres apart (at least 2.2 seconds at max speed). First hazard is at 30 metres. Difficulty/mode changes and Reset clear the session. No project or results persistence yet.
- Hand swing remains a Motion Lab diagnostic; it is not bound to a runner action.
- A fixed 120 Hz pure simulation owns gameplay; the Three.js renderer uses a bounded pool of obstacles/pickups. Contact is evaluated once at each obstacle's centre plane, not full rigid-body physics. The browser frame delta is capped after stalls; this is not a competitive anti-cheat clock.

### Production browser regression test

```sh
npx playwright install chromium   # one-time browser setup
npm run build
npm run test:browser
```

The tracked Playwright test checks the built app (not Vite dev mode): camera calibration guard, keyboard A/B, countdown, jump/lean cards, score progress, Escape/pause freeze, manual resume countdown, guide pause, mode reset, three-life reset, focus view, mobile width and uncaught page errors. Set `CHROMIUM_PATH` to use an existing Chromium executable. CI installs Chromium and runs this smoke test before publishing Pages.

## First real-webcam test

1. Set up clear floor space and even light. Frame head, hands, knees and feet with movement margin; adjust distance to your lens (2–3m is only a starting guide).
2. Enable webcam, check the three body-region indicators, then calibrate a relaxed stance for two seconds.
3. Watch the input cards while testing 10 leans each side, 10 squats, optional small jumps, swings and alternating steps. Note misses/false positives. Never jump if unsafe.
4. Test both runner modes. In A, stopping steps should decay intensity to zero. In B, character motion should continue only while tracking is valid and playback is started.
5. Hide a foot, leave view, return, stop/reconnect the camera and switch input sources. Lost tracking must not keep the run progressing.
6. Share browser/device, camera framing, threshold values and incorrect detections to tune the runner.

## Design documents

- [Existing games: code review and verification](docs/repository-review.md)
- [Practical MVP architecture, milestones and webcam acceptance tests](docs/mvp-plan.md)

The existing Snow Trail and Badminton repositories were reviewed, not modified.
