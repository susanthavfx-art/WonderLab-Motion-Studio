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
- Experimental torso lean, wrist swing, squat, selectable hands-up/physical jump and alternating-step/cadence estimates, with live cards and project-saveable sensitivity controls.
- Keyboard test without webcam: **A/D or arrows** lean, **S/down** squat, **Space** jump, **J** swing, **hold W/up** simulate running. Click outside buttons/inputs to use game keys. Escape, window blur and tab hiding pause the game and clear keys.
- **Wonder Run playable prototype:** three lanes, orange jump blocks, blue duck-under bars, gold pickups, score, three lives, a 60-second session and results/replay. Select A (run-in-place intensity) / B (auto-run), and Easy/Normal/Hard. Hands-free webcam start is on by default: enable the camera near your computer, step back into full view and hold a relaxed stance. After a 600ms visibility hold, neutral calibration collects two stable seconds, then a large 3–2–1 countdown starts the run without another click. Lost/stale required tracking pauses time, distance, collisions and score; while hands-free is armed, full-body reacquisition restarts a complete countdown. Keyboard mode always starts manually. Focus view enlarges the game without browser fullscreen permission.
- **Game-side webcam monitor:** live uncropped camera + skeleton, torso/hands/feet visibility, calibration progress and camera controls are beside the runner in both normal and Focus views. You can enable/stop the webcam, calibrate/recalibrate or switch to keyboard without scrolling back to the Motion Capture section. The monitor copies the existing video/overlay onto a canvas; it does not open another camera or run another pose detector. Mirror follows the main Mirror setting. On narrow screens the monitor is stacked immediately below the game.
- **Event branding:** project-saveable title, company logo, primary/accent colours, background colour/image, live game/focus/results preview, remove-image controls and reset. See the branding section below.
- Responsive desktop/mobile layout, setup guide and explicit future-feature notices.

**Still a prototype, not event-ready.** Project save/load, custom models/audio, persistent leaderboards and dedicated event play mode are next milestones. Projects/Templates in the sidebar are clearly marked Soon and explain the planned scope. Calibration and sensitivity are deliberately not persisted. No backend, authentication, video recording or cloud uploads are implemented.

### Implementation choice

This first vertical slice uses Vite + plain ES modules + Three.js, with pure motion logic separate from capture, UI and rendering. React/TypeScript in the original plan remain possible as the project editor grows; they are not prerequisites for validating the camera/detector loop. Dependencies are pinned in the lockfile. The camera lifecycle implementation is adapted from the reviewed Snow Trail source in the same owner's repositories.

## Verification and honest limitations

- `npm test`: **50/50 tests passed**: 3 project schema/IndexedDB tests, 3 branding validation/resource-lifecycle tests, 6 hands-free readiness/safety tests, 3 hands-up detector tests, 3 physical-jump tests, 18 motion integration tests plus 14 runner tests (seeded fair spacing, countdown, modes A/B, lane transitions, one-shot collisions/pickups, jump/duck rules, pause/reacquisition, results/reset and 30/60/120 FPS agreement).
- `npm run build`: passed. A bundle-size advisory remains for the Three.js-containing application bundle; runtime pose WASM/models add approximately 18 MB before compression. No CDN is required, but this is not an offline-cached app.
- Headless Chromium smoke checks: rendered WebGL playground, keyboard lean/run/jump, guide, calibration guard, sensitivity reset, source switching, simulated camera permission denial/retry and 390px layout without horizontal overflow; no uncaught page errors. An initial fixed-100ms browser assertion was timing-sensitive under software WebGL; rerunning with condition-based waits passed.
- `npm audit` after dependency setup: **0 vulnerabilities**.
- The operator reported working lean, squat/release, swing, run-in-place and jump on their own webcam setup after the Pages fix. This is a qualitative first-device check, not a measured accuracy benchmark. The next operator test found that physical jumps lost tracking, while lean/squat/running worked. A later operator check confirmed the hands-up mapping works while running. Hands up remains default; optional Physical jump is now selectable and still needs safe real-webcam validation with adequate framing. Being a smaller player does not guarantee reliable tracking. **Other players/lighting, event-hardware FPS/latency and endurance have not been validated.** Passing synthetic/browser tests is not proof of those properties. Squat/run discrimination remains experimental. All required body regions currently gate motion together; per-action partial-body support is deferred.
- Preview mirroring changes display only; it does not silently invert the normalized game direction. Finger-level tracking is not included.
- No asset licences have been audited for future client distribution; the current runner uses generated geometry, not copied game models or music.

## Event branding controls

Open **Event branding** directly above Wonder Run. Set a game title (up to 60 characters), choose primary/accent/backdrop colours, and optionally upload a company logo and background image. Changes appear immediately in the game; Focus view and session results reuse the same branding. WonderLab workspace navigation stays unchanged.

- **Primary** colours the avatar shirt and game highlights. **Accent** colours the arms, rails, title badge and main game button. Text on brand-coloured badges/buttons switches to black/white for legibility.
- **Backdrop colour** tints the scene background, fog and track. **Background image** is a flat cover-fit backdrop behind the transparent Three.js canvas, not a 360° skybox or replacement 3D environment; it may crop to the game's aspect ratio. Remove the image to return to colour-only.
- **Logo:** PNG/JPEG/WebP, at most 2 MB. **Background:** same formats, at most 8 MB. Both must decode successfully, be at most 4096 pixels on each side and at most 16 megapixels. Prefer a transparent PNG/WebP logo. SVG/GIF are not supported. MIME checks and raster signatures reject obvious format spoofing; corrupt images are rejected on decode.
- Title/filenames are rendered as plain text, never executable HTML. Asset URLs are local browser object URLs. No upload to a cloud service, GitHub or database is performed. Replacing/removing/resetting assets releases old URLs and invalidates pending loads; a bad upload keeps the previous valid image.
- Editing pauses a running/counting-down game and disarms hands-free start. Re-arm when ready. Reset branding does not erase your current score or motion calibration; it restores the default theme and removes uploaded images.
- **Explicit local save:** use Save project to preserve branding, images and gameplay settings. Unsaved edits are not restored on reload. IndexedDB is browser/site-local, not a backup; see the project workflow below. Use commercially licensed assets.

## Hands-free safety and manual testing

- Camera enable arms hands-free when the checkbox is on. Full-body visibility must be fresh; clipped/missing/stale joints reset the hold. Calibration still needs stable neutral samples; movement or pose loss resets calibration progress.
- During an armed session, tracking loss pauses play and reacquisition starts a new full 3–2–1 countdown. No instantaneous resume. Completed games never automatically replay.
- Operator Pause, Escape, Cancel auto-start, Stop camera, switching input source, reset/mode/difficulty changes, sensitivity changes, opening the guide and tab/window blur disarm automatic start. The page must be visible and focused, with the guide closed.
- To resume after an intentional pause/reset, click **Step back to start** while near the computer, then return to your stance. On a finished run the button resets and arms replay. **Cancel auto-start** cancels a pending armed start.
- Uncheck **Hands-free webcam start** for manual Motion Lab calibration/start. Keyboard controls remain manual. The camera permission prompt always requires your browser's own consent.

## Runner controls and rules

- Lean left/right to select the corresponding outer lane; stand neutral for the centre. Lane thresholds have hysteresis; transitions are bounded, not teleports. Keyboard A/D or left/right behave the same way (hold to stay in an outer lane).
- **Raise both wrists comfortably just above your shoulders** for at least 100ms to jump orange blocks; do not physically jump or stretch above your head. Lower both hands for 150ms before another jump. A held pose does not repeat; tracking loss requires hands lowered again. Wrists must stay inside the frame. Use the **Jump input** dropdown next to runner mode/difficulty to choose **Hands up** (default) or **Physical jump**. Physical mode requires both feet and hips to rise above the calibrated baseline; one foot/running knees alone do not qualify. Land and stand stable for 150ms before another jump. This is a monocular estimate, not measured floor contact. Switching mapping pauses the game, disarms hands-free start and clears both detector histories while keeping the calibration baseline. Stand neutral/lower arms, then re-arm with Step back to start. The dropdown also updates the jump diagnostic title, threshold label and instructions. Selection and shared jump threshold are included when you save a project. Keyboard Space is unchanged. Duck under blue overhead bars. A jump and squat cannot combine to bypass a bar. You can also dodge to another lane.
- Gold pickup: +100. Each safely cleared obstacle row: +50. Distance: +1 per whole metre. A collision costs one life, once per row. Three collisions or the 60-second timer end the session.
- Mode A uses motion intensity (W/up in keyboard mode), with bounded acceleration/deceleration. Between steps, cadence holds for 450ms before a 900ms decay; around 120 steps/min reaches full configured speed. A gesture jump carries existing launch speed for 1.05 seconds so pausing steps briefly does not stop the character mid-air. An idle jump never creates forward speed. Standing still eventually stops distance, but the **session timer continues**. Mode B automatically accelerates to the difficulty speed (6/8/10 m/s); use it if the character should run even when you stop stepping. The UI now defaults to Normal (8 m/s), not Easy (6 m/s). This changes gameplay pace, not a measured FPS optimization.
- Every course uses seed 2026 for repeatable testing. Each row has one hazard, at least two open lanes and a pickup in another lane; rows are 22 metres apart (at least 2.2 seconds at max speed). First hazard is at 30 metres. Difficulty/mode changes and Reset clear the session. Project settings persist with explicit Save project; in-progress runs and results do not persist.
- Hand swing remains a Motion Lab diagnostic; it is not bound to a runner action.
- A fixed 120 Hz pure simulation owns gameplay; the Three.js renderer uses a bounded pool of obstacles/pickups. Contact is evaluated once at each obstacle's centre plane, not full rigid-body physics. The browser frame delta is capped after stalls; this is not a competitive anti-cheat clock.

### Production browser regression test

```sh
npx playwright install chromium   # one-time browser setup
npm run build
npm run test:browser
```

The four tracked Playwright tests check the built app (not Vite dev mode). The second uses a synthetic camera stream and deterministic pose results to verify simultaneous game/monitor visibility in Focus view, shared single camera capture, canvas pixels, calibration, mirror changes, hands-up jump without body lift, no repeat while held, safe dropdown switching and physical-mode-only triggering, stopping/pausing and keyboard switching. It is a UI/lifecycle test, not proof of real webcam accuracy. The third test verifies automatic calibration/start without Calibrate/Start clicks, countdown interruption on body loss, full countdown on return, explicit-pause disarming and re-arming from near the computer. The fourth verifies branding text safety, colour changes, raster image upload/decode, preserving a valid logo on bad upload, focus-view branding, edit-induced pause, remove/reset and mobile overflow. The original test covers: camera calibration guard, keyboard A/B, countdown, jump/lean cards, score progress, Escape/pause freeze, manual resume countdown, guide pause, mode reset, three-life reset, focus view, mobile width and uncaught page errors. Set `CHROMIUM_PATH` to use an existing Chromium executable. CI installs Chromium and runs this smoke test before publishing Pages.

## First real-webcam test

1. Set up clear floor space and even light. Frame head, hands, knees and feet with movement margin; adjust distance to your lens (2–3m is only a starting guide).
2. Choose mode/difficulty and Focus view first. Leave Hands-free webcam start checked, enable webcam, then step back. Show head, hands, knees and feet; hold still for automatic calibration and the large 3–2–1 countdown. No distant mouse click is needed.
3. Watch the input cards while testing 10 leans each side, 10 squats, 10 both-hands-up gestures (lower between each), swings and alternating steps. Keep feet on the floor in Hands up mode. For optional Physical jump, first check safe landing space and framing with headroom; make small jumps only if safe. Head/feet leaving frame still pauses the game—this safety check has not been removed. Check that held gestures do not repeatedly jump.
4. Test both runner modes. In A, stopping steps should decay intensity to zero. In B, character motion should continue only while tracking is valid and playback is started.
5. Hide a foot, leave view and return: the world must freeze on loss, then a fresh full countdown must precede hands-free resumption. Stop/Escape/operator Pause must cancel auto-start, not resume unexpectedly.
6. Share browser/device, camera framing, threshold values and incorrect detections to tune the runner.

## Design documents

- [Existing games: code review and verification](docs/repository-review.md)
- [Practical MVP architecture, milestones and webcam acceptance tests](docs/mvp-plan.md)

The existing Snow Trail and Badminton repositories were reviewed, not modified.


## Client projects, templates and shared assets

This milestone lays the foundation for a **template-based motion-game studio**, not an arbitrary no-code game engine. Wonder Run is the first and currently only playable template. New mechanics (e.g. a racket game or object-catching game) still require a coded template; capture, calibration, branding, project storage and the asset library can be reused.

1. **New** creates a clean Runner project after confirming unsaved changes. **Game templates** shows the registered template, actions and supported asset slots, with a New project action.
2. Enter a **Client project** name. Configure branding, mode A/B, difficulty, jump input, hands-free preference and sensitivity. **Save project** explicitly stores these settings and the assigned image blobs in IndexedDB. Rename by editing the project name and saving again; it updates the same project, not a copy.
3. **Open projects** lists saved projects with Open, Duplicate and Delete. Duplicate creates an independent configuration, sharing immutable library image records. Deleting a project retains its library assets. Loading resets the run, stops the webcam, clears calibration and disarms auto-start. Scores, results, held keys and calibration are never saved.
4. **Asset Library** imports validated PNG/JPEG/WebP images and assigns them as logo or background. Existing branding file uploads enter the shared library when a project is saved. Library import uses the background limit (8 MB); assigning a logo enforces 2 MB. Signature, decode and dimension checks are shared with branding. Assets are listed by filename/type/size. Images assigned in the current editor or referenced by any saved project cannot be deleted. Unassign and save the referencing projects (or delete those projects) before deleting an asset.
5. Unsaved changes are indicated and guarded on project replacement/page navigation. Saving errors (including unavailable storage or quota failures) are reported; existing saved records are not cleared. A failed multi-asset save may leave an unused library record, which can be deleted from the library.

**Storage limitations:** data belongs to this browser profile and exact site origin. The live preview and GitHub Pages have different stores. Clearing site data, losing a device, private-browser shutdown or browser eviction can remove it. No cloud sync, login, import/export backup or autosave is implemented. Do not rely on this as the only copy of irreplaceable client assets. Keep original images separately. GLB characters, animation mapping, 3D environments/objects and audio are **not implemented** in this milestone.

### Extension boundaries

- `src/templates/registry.js`: template ID/version, supported actions and typed asset-slot metadata, factory and lifecycle (`start/pause/reset/update/render/getResults/dispose`). Main now instantiates and ticks Runner through this adapter. The existing Runner-specific diagnostics/editor controls remain; a second template will need its own settings UI and schema rules, not just a registry entry.
- `src/projects/schema.js`: versioned, whitelisted serializable project data; unknown schemas, template versions, invalid colours/settings and asset references fail explicitly. The v1 settings validator currently describes Runner. Runtime/camera state and executable code are excluded.
- `src/projects/storage.js`: shared IndexedDB projects/assets, reference-checked saves and deletion protection. `src/projects/editor.js` owns local CRUD dialogs, dirty-state guards, library assignment and hydration coordination. `src/branding.js` owns image validation/object-URL lifetime; stored blobs do not contain temporary URLs.
- Shared motion modules stay independent of client branding and storage. Additional templates should consume normalized actions, with asset slots and settings validation appropriate to their gameplay.

Browser regression suite: **6/6 production tests**, including local save/reload/open, settings and image hydration, rename/duplicate/delete, reference protection, invalid library import and template reset, plus the previous runner/camera/hands-free/branding checks. Run `npm run build && npm run test:browser` (install Playwright Chromium or set `CHROMIUM_PATH`).
