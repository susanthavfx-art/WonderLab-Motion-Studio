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

**Still a prototype, not event-ready.** Local project save/load, shared images and GLB character/embedded-animation support are implemented. Custom audio, 3D environment/object slots, persistent leaderboards and dedicated event play mode remain future work. Sensitivity is saved with projects; player calibration deliberately is not. No backend, authentication, video recording or cloud uploads are implemented.

### Implementation choice

This first vertical slice uses Vite + plain ES modules + Three.js, with pure motion logic separate from capture, UI and rendering. React/TypeScript in the original plan remain possible as the project editor grows; they are not prerequisites for validating the camera/detector loop. Dependencies are pinned in the lockfile. The camera lifecycle implementation is adapted from the reviewed Snow Trail source in the same owner's repositories.

## Verification and honest limitations

- `npm test`: **58/58 tests passed**: 6 GLB/character lifecycle, animation, backward-compatibility and typed-storage tests, 3 project schema/IndexedDB tests, 3 branding validation/resource-lifecycle tests, 6 hands-free readiness/safety tests, 3 hands-up detector tests, 3 physical-jump tests, 20 motion integration tests plus 14 runner tests (seeded fair spacing, countdown, modes A/B, lane transitions, one-shot collisions/pickups, jump/duck rules, pause/reacquisition, results/reset and 30/60/120 FPS agreement).
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
2. Enter a **Client project** name. Configure branding, mode A/B, difficulty, jump input, hands-free preference and sensitivity. **Save project** explicitly stores these settings and the assigned image/model blobs in IndexedDB. Rename by editing the project name and saving again; it updates the same project, not a copy.
3. **Open projects** lists saved projects with Open, Duplicate and Delete. Duplicate creates an independent configuration, sharing immutable library image records. Deleting a project retains its library assets. Loading resets the run, stops the webcam, clears calibration and disarms auto-start. Scores, results, held keys and calibration are never saved.
4. **Asset Library** imports validated PNG/JPEG/WebP images (logo/background) and self-contained GLB models (character). Existing branding file uploads enter the shared library when a project is saved. Library import uses the background limit (8 MB); assigning a logo enforces 2 MB. Signature, decode and dimension checks are shared with branding. Assets are listed by filename/type/size. Assets assigned in the current editor or referenced by any saved project cannot be deleted. Unassign and save the referencing projects (or delete those projects) before deleting an asset.
5. Unsaved changes are indicated and guarded on project replacement/page navigation. Saving errors (including unavailable storage or quota failures) are reported; existing saved records are not cleared. A failed multi-asset save may leave an unused library record, which can be deleted from the library.

**Storage limitations:** data belongs to this browser profile and exact site origin. The live preview and GitHub Pages have different stores. Clearing site data, losing a device, private-browser shutdown or browser eviction can remove it. No cloud sync, login, import/export backup or autosave is implemented. Do not rely on this as the only copy of irreplaceable client assets. Keep original images separately. GLB characters and embedded-clip mapping are supported; 3D environments/objects, separate animation-file retargeting and audio are **not implemented**.

### Extension boundaries

- `src/templates/registry.js`: template ID/version, supported actions and typed asset-slot metadata, factory and lifecycle (`start/pause/reset/update/render/getResults/dispose`). Main now instantiates and ticks Runner through this adapter. The existing Runner-specific diagnostics/editor controls remain; a second template will need its own settings UI and schema rules, not just a registry entry.
- `src/projects/schema.js`: versioned, whitelisted serializable project data; unknown schemas, template versions, invalid colours/settings and asset references fail explicitly. The v1 settings validator currently describes Runner. Runtime/camera state and executable code are excluded.
- `src/projects/storage.js`: shared IndexedDB projects/assets, reference-checked saves and deletion protection. `src/projects/editor.js` owns local CRUD dialogs, dirty-state guards, library assignment and hydration coordination. `src/branding.js` owns image validation/object-URL lifetime; stored blobs do not contain temporary URLs.
- Shared motion modules stay independent of client branding and storage. Additional templates should consume normalized actions, with asset slots and settings validation appropriate to their gameplay.

Browser regression suite: **10 production tests**, including local save/reload/open, settings and image hydration, rename/duplicate/delete, reference protection, invalid library import and template reset, GLB upload, embedded texture decoding, animation action changes/pause, model persistence/library reuse and static/invalid GLB handling, plus the previous runner/camera/hands-free/branding checks. Run `npm run build && npm run test:browser` (install Playwright Chromium or set `CHROMIUM_PATH`).


## GLB characters and embedded animations

Open **3D character & animations** above the runner. Upload a `.glb`, or use **Asset Library → Import image or GLB → Use as character**. The custom model replaces only the rendered avatar. Lean lanes, jump height, duck state, collision rules and scores still come from the existing motion/game core. Uploading, replacing, removing or changing mapping/size/facing pauses play and disarms hands-free start. Use Keyboard test to check mappings safely before testing a player.

### Recommended Blender / character-export workflow

1. Prepare a low-poly character with a compatible skeleton, skin weights and the animation actions you need. Obtain appropriate commercial rights for all models, textures and animations.
2. Put the required **Idle, Run, Jump and Duck** actions on that same character/skeleton. Export them as named glTF animation clips (Blender glTF exporter animation settings vary; confirm all desired actions/NLA tracks are included).
3. Export **glTF 2.0 Binary (`.glb`)** with embedded PNG/JPEG/WebP textures. Use **in-place** animation: remove forward/root translation and authored jump travel so gameplay, not the animation, controls position. No automatic root-motion extraction, skeleton retargeting or cross-file animation importing is implemented. Combining Mixamo/other animation files must currently be done in a DCC such as Blender before export.
4. Import the GLB. The model is centered horizontally, floor-aligned and fitted to approximately 1.9 world units from its initial bounds. Use **Facing** (0/90/180/270°) and **Size** (0.5–2×) for correction. Inspect extreme poses too: an animated rig can extend outside its initial bounds. This is visual sizing, not an automatically generated collision shape.
5. Select each embedded clip in the **Idle / Run / Jump / Duck** dropdowns. Names are heuristic suggestions only; manually verify. Selection uses clip indices, so duplicate clip names remain distinguishable. A model with zero animations is allowed and is labelled static.
6. **Save project** stores the model blob, mapping, size and facing in the browser-local project/library system. Old image-only v1 projects load with default geometry and default character settings; no destructive database migration is needed. Duplicated projects share the immutable model blob, not mutable configuration.

### Playback and fallbacks

- Run/Idle/Duck loop, Jump plays once and holds its final pose until the game leaves the jump. Short 120ms transitions blend action changes during play. Animation advances with simulation time, not wall time: pause, tracking loss and countdown freeze the current pose. Finished/ready use Idle.
- Missing actions fall back to the mapped Idle clip, or the static rest pose if none is mapped. A missing Duck clip also applies a visual crouch-scale cue. A model without a Run clip will not gain procedural leg animation. The default geometry avatar remains available through **Use default character**.
- Imported materials keep their original colours/textures. Brand colours continue to affect the track and the default geometry avatar, not recolour arbitrary client models.
- Invalid or superseded async loads do not replace the current character. Replacement/removal releases geometry, materials, textures, bitmap images, skeleton GPU resources and mixer bindings. Late loads after removal/disposal are discarded.

### Import limits and current boundaries

- Maximum **20 MB per GLB**; glTF 2.0 binary only. No `.gltf` sidecars, external URLs or data-URI buffers/images. Textures must be embedded buffer views. Resources do not upload to a server.
- At most 256 nodes, 128 meshes/primitives/materials, 16 textures/images, 64 clips, 128 joints per skin and 1,024 accessors; aggregate accessor budget 2 million elements, maximum 1 million per accessor. Sparse accessors are not supported. Textures max 4096 px per side / 16 MP after decode; clips must have valid finite keyframes and duration up to 300 seconds. Decode timeout: 15 seconds. These are conservative import limits, **not a guarantee of event-device FPS**; image decode can still consume memory before the dimension check.
- Draco, Meshopt and KTX/Basis compression are not configured. Core materials plus KHR unlit, emissive strength, IOR, specular and texture-transform extensions are accepted; other extension-based models are explicitly rejected. Re-export without unsupported extensions.
- The shared modules `src/assets/glb.js`, `character-settings.js`, `character-view.js` and `character-editor.js` handle model validation/loading/disposal, serializable mapping, visual playback and editor UI. Runner declares a typed `character` slot in the template registry. More templates can reuse this layer with their own action mapping; this does not yet make all editor controls generic.
- Tests use tiny, self-authored skinned GLB fixtures with embedded clips and an embedded texture, not downloaded commercial characters. A separate manual smoke check also loaded Three.js’s RobotExpressive sample (14 embedded clips) from an ignored scratch file; that third-party model is not shipped with this app. A real client model/animation rig and event hardware still need operator validation. Full environments, obstacle/pickup models, visual animation timeline/scrubbing, separate animation files, retargeting, audio and arbitrary game creation remain future milestones.


### Changing running mode while the webcam is active

Selecting A (Run in place) or B (Auto-run) resets the run and **re-arms hands-free start only when the webcam is ready and Hands-free start is enabled**. Step back into full-body view: the readiness/calibration gate still runs, followed by the full 3–2–1 countdown. Mode A does not require stepping to trigger countdown; stepping controls forward speed after the run starts. Keyboard mode remains manual. Explicit Pause, Reset, Stop, project loading and branding/character edits still disarm auto-start; this mode-selector behaviour does not automatically resume those operations.

The added browser regression covers Auto-run → Run in place, countdown with no steps, explicit pause/reset, camera stopped and hands-free disabled. Validation: 56 unit tests passed; all 9 browser tests passed across the suite and one isolated rerun (the existing brief hands-up ACTIVE-state assertion missed its pulse on the initial suite run). This remains a synthetic camera test, not confirmation on the operator's webcam.


### Easier, quicker lean steering

The default Lean dead zone is now **0.10** (previously 0.15). Outside it, normalized lean gain is 5 instead of 2.5, and the smoothing response is 18/s instead of 12/s. Runner lane-entry/return hysteresis and bounded lateral travel are unchanged: smaller torso tilts produce a lane-strength signal sooner without teleporting the character. The tilt is shoulder/hip horizontal offset divided by calibrated torso height; these settings are not physical angle measurements.

Saved projects keep their explicitly saved dead-zone value, including the former 0.15 default, but benefit from the new gain/response. For easier steering in an existing project, set **Lean dead zone → 0.10** and Save project. Raise it again if natural running sway triggers unwanted lane changes. No player calibration is migrated; stand neutral and recalibrate normally.

Synthetic regressions exercise mirrored modest leans at 15/30/60 Hz with both 0.10 and saved 0.15 dead zones, lane entry within 200ms, bounded lane travel, return to centre, small torso sway and brief noise. A production browser test checks modest webcam pose offsets in both directions. Real player running sway/comfort still needs operator validation; these tests do not establish webcam latency or universal accuracy.
