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

**Still a prototype, not event-ready.** Local project save/load, shared images and GLB character/embedded-animation support are implemented. Custom audio, persistent leaderboards and dedicated event play mode remain future work. Sensitivity is saved with projects; player calibration deliberately is not. No backend, authentication, video recording or cloud uploads are implemented.

### Implementation choice

This first vertical slice uses Vite + plain ES modules + Three.js, with pure motion logic separate from capture, UI and rendering. React/TypeScript in the original plan remain possible as the project editor grows; they are not prerequisites for validating the camera/detector loop. Dependencies are pinned in the lockfile. The camera lifecycle implementation is adapted from the reviewed Snow Trail source in the same owner's repositories.

## Verification and honest limitations

- `npm test`: **78/78 tests passed**: 5 curated forest-pack integrity/geometry/import/storage tests, 8 endless-environment layout/configuration/recycling/safety/storage tests, 7 object-slot schema/transform/pooling/disposal/persistence tests, 6 GLB/character lifecycle, animation, backward-compatibility and typed-storage tests, 3 project schema/IndexedDB tests, 3 branding validation/resource-lifecycle tests, 6 hands-free readiness/safety tests, 3 hands-up detector tests, 3 physical-jump tests, 20 motion integration tests plus 14 runner tests (seeded fair spacing, countdown, modes A/B, lane transitions, one-shot collisions/pickups, jump/duck rules, pause/reacquisition, results/reset and 30/60/120 FPS agreement).
- `npm run build`: passed. A bundle-size advisory remains for the Three.js-containing application bundle; runtime pose WASM/models add approximately 18 MB before compression. No CDN is required, but this is not an offline-cached app.
- Headless Chromium smoke checks: rendered WebGL playground, keyboard lean/run/jump, guide, calibration guard, sensitivity reset, source switching, simulated camera permission denial/retry and 390px layout without horizontal overflow; no uncaught page errors. An initial fixed-100ms browser assertion was timing-sensitive under software WebGL; rerunning with condition-based waits passed.
- `npm audit` after dependency setup: **0 vulnerabilities**.
- The operator reported working lean, squat/release, swing, run-in-place and jump on their own webcam setup after the Pages fix. This is a qualitative first-device check, not a measured accuracy benchmark. The next operator test found that physical jumps lost tracking, while lean/squat/running worked. A later operator check confirmed the hands-up mapping works while running. Hands up remains default; optional Physical jump is now selectable and still needs safe real-webcam validation with adequate framing. Being a smaller player does not guarantee reliable tracking. **Other players/lighting, event-hardware FPS/latency and endurance have not been validated.** Passing synthetic/browser tests is not proof of those properties. Squat/run discrimination remains experimental. All required body regions currently gate motion together; per-action partial-body support is deferred.
- Preview mirroring changes display only; it does not silently invert the normalized game direction. Finger-level tracking is not included.
- The default runner uses generated geometry. The optional built-in Forest Pack preserves its source-declared CC BY 4.0 author/source/license/modification credits (see below); this is not an independent rights audit. Audit rights and preserve attribution when distributing client assets; no music is bundled.

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
4. **Asset Library** imports validated PNG/JPEG/WebP images (logo/background) and self-contained GLB models (character, environment, jump/duck obstacles and collectible). Existing branding file uploads enter the shared library when a project is saved. Library import uses the background limit (8 MB); assigning a logo enforces 2 MB. Signature, decode and dimension checks are shared with branding. Assets are listed by filename/type/size. Assets assigned in the current editor or referenced by any saved project cannot be deleted. Unassign and save the referencing projects (or delete those projects) before deleting an asset.
5. Unsaved changes are indicated and guarded on project replacement/page navigation. Saving errors (including unavailable storage or quota failures) are reported; existing saved records are not cleared. A failed multi-asset save may leave an unused library record, which can be deleted from the library.

**Storage limitations:** data belongs to this browser profile and exact site origin. The live preview and GitHub Pages have different stores. Clearing site data, losing a device, private-browser shutdown or browser eviction can remove it. No cloud sync, login, import/export backup or autosave is implemented. Do not rely on this as the only copy of irreplaceable client assets. Keep original images separately. GLB characters, embedded-clip mapping, static object slots and straight endless environments are supported; separate animation-file retargeting and audio are **not implemented**.

### Extension boundaries

- `src/templates/registry.js`: template ID/version, supported actions and typed asset-slot metadata, factory and lifecycle (`start/pause/reset/update/render/getResults/dispose`). Main now instantiates and ticks Runner through this adapter. The existing Runner-specific diagnostics/editor controls remain; a second template will need its own settings UI and schema rules, not just a registry entry.
- `src/projects/schema.js`: versioned, whitelisted serializable project data; unknown schemas, template versions, invalid colours/settings and asset references fail explicitly. The v1 settings validator currently describes Runner. Runtime/camera state and executable code are excluded.
- `src/projects/storage.js`: shared IndexedDB projects/assets, reference-checked saves and deletion protection. `src/projects/editor.js` owns local CRUD dialogs, dirty-state guards, library assignment and hydration coordination. `src/branding.js` owns image validation/object-URL lifetime; stored blobs do not contain temporary URLs.
- Shared motion modules stay independent of client branding and storage. Additional templates should consume normalized actions, with asset slots and settings validation appropriate to their gameplay.

Browser regression suite: **19 production tests**, including local save/reload/open, settings and image hydration, rename/duplicate/delete, reference protection, invalid library import and template reset, GLB upload, embedded texture decoding, animation action changes/pause, model persistence/library reuse and static/invalid GLB handling, plus the previous runner/camera/hands-free/branding checks. Run `npm run build && npm run test:browser` (install Playwright Chromium or set `CHROMIUM_PATH`).


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
- Tests use tiny, self-authored skinned GLB fixtures with embedded clips and an embedded texture, not downloaded commercial characters. A separate manual smoke check also loaded Three.js’s RobotExpressive sample (14 embedded clips) from an ignored scratch file; that third-party model is not shipped with this app. A real client model/animation rig and event hardware still need operator validation. Static scenery and obstacle/pickup GLBs are now supported (below). Curved tracks/junctions, visual animation timeline/scrubbing, separate animation files, retargeting, audio and arbitrary game creation remain future milestones.


### Changing running mode while the webcam is active

Selecting A (Run in place) or B (Auto-run) resets the run and **re-arms hands-free start only when the webcam is ready and Hands-free start is enabled**. Step back into full-body view: the readiness/calibration gate still runs, followed by the full 3–2–1 countdown. Mode A does not require stepping to trigger countdown; stepping controls forward speed after the run starts. Keyboard mode remains manual. Explicit Pause, Reset, Stop, project loading and branding/character edits still disarm auto-start; this mode-selector behaviour does not automatically resume those operations.

The added browser regression covers Auto-run → Run in place, countdown with no steps, explicit pause/reset, camera stopped and hands-free disabled. Validation: 56 unit tests passed; all 9 browser tests passed across the suite and one isolated rerun (the existing brief hands-up ACTIVE-state assertion missed its pulse on the initial suite run). This remains a synthetic camera test, not confirmation on the operator's webcam.


### Easier, quicker lean steering

The default Lean dead zone is now **0.10** (previously 0.15). Outside it, normalized lean gain is 5 instead of 2.5, and the smoothing response is 18/s instead of 12/s. Runner lane-entry/return hysteresis and bounded lateral travel are unchanged: smaller torso tilts produce a lane-strength signal sooner without teleporting the character. The tilt is shoulder/hip horizontal offset divided by calibrated torso height; these settings are not physical angle measurements.

Saved projects keep their explicitly saved dead-zone value, including the former 0.15 default, but benefit from the new gain/response. For easier steering in an existing project, set **Lean dead zone → 0.10** and Save project. Raise it again if natural running sway triggers unwanted lane changes. No player calibration is migrated; stand neutral and recalibrate normally.

Synthetic regressions exercise mirrored modest leans at 15/30/60 Hz with both 0.10 and saved 0.15 dead zones, lane entry within 200ms, bounded lane travel, return to centre, small torso sway and brief noise. A production browser test checks modest webcam pose offsets in both directions. Real player running sway/comfort still needs operator validation; these tests do not establish webcam latency or universal accuracy.


## 3D objects and environment slots

The **3D objects & environment** panel adds four reusable typed GLB slots to the shared library/project system. These are **static visual replacements**, not new gameplay/collision geometry. Import a self-contained `.glb` directly in an expanded slot, or use **Asset Library → Use as environment / jumpObstacle / duckObstacle / collectible**. Shared image uploads remain limited to logo/background; all five model slot types (including character) use the GLB validation pipeline. A model can be assigned to several slots and several projects; immutable library blob IDs are shared, but slot transforms remain independent.

| Slot | Placement / auto-fit at size 1 | Default fallback |
| --- | --- | --- |
| Environment / scenery | One floor-aligned stage at `(0, 0, -22)`, aspect-fit within `40 × 12 × 60` world units | Existing generated trees/scenery |
| Jump obstacle | Centered on each block row/lane at height `0.4`; aspect-fit within `1.35 × 0.8 × 0.8` | Orange block |
| Duck obstacle | **Overhead crossbar only**, at height `1.55`; aspect-fit within `1.8 × 0.25 × 0.6` | Blue bar; support posts remain visible with either visual |
| Collectible | At each pickup lane/row, height `1`; aspect-fit within `0.42 × 0.42 × 0.18`; retains distance-driven spin | Gold pickup |

- **Size multiplier**: `0.1–5` after auto-fit. **Rotation X/Y/Z**: `−180° … +180°`. **Position offset X/Y/Z**: `−50 … +50` slot units. Offsets are relative to the slot anchor; the collectible anchor's spin also rotates its offset. Rotation and uniform scale act around the fitted model centre (environment: floor-centre). Recalibrate/tune visually in the game, not from an arbitrary model's original units or pivot.
- **Reset transform** resets only size/rotation/offset and retains the model. **Use default geometry** removes the custom assignment *and* resets the slot transform. It does not delete the shared library record. Other slots and character/branding are unaffected.
- Import, replacement, transform changes and reset pause the run and disarm hands-free start. Nothing auto-starts after editing. Keyboard test/Focus view let the operator inspect the configured course. No drag gizmo, animation timeline, automated hitbox fitting or object animation playback is included; skinned/animated GLBs are rendered in their initial static pose in these four slots.
- **Static mode environment is a single stage**, not an HDRI skybox or navigation/collision mesh. Endless mode is described below. It replaces only generated trees/scenery. The playable track, lane markings and rails stay visible; build scenery around the road corridor (road width 8 units). Avoid adding opaque ground on top of the track, placing geometry in front of the camera, or blocking lane visibility. Use offsets/size as needed. Flat finite-area GLBs are accepted for scenery/objects; zero-height character models are still rejected.
- **Collisions stay fixed.** Scaling/offsetting a block, crossbar or pickup does **not** change its obstacle type, lane, scoring, collision window or required player action. Bad transforms can make the visible obstacle disagree with its collision shape. Keep the visuals close to the documented anchors and manually test every hazard before an event; no collision-shape overlay/editor exists yet.
- Models keep their own materials and textures. Existing colour branding still affects the default geometry/track, not arbitrary client materials. Unsupported extensions, external resources, invalid textures and oversized GLBs are rejected exactly as for characters (20 MB per file, previous complexity limits). Static model slots do not require embedded clips.
- **Save project** stores all four model references and independent transforms. Old v1 projects default to the original procedural geometry/identity transforms; no database wipe or destructive migration. Open/duplicate/rename/delete retain the existing semantics. Deletion is blocked while a library record is used by *any* current slot or saved project. Unassign and save (or delete referencing projects), then delete the unused record from Asset Library.
- Objects use bounded five-instance pools per hazard/pickup slot, matching the runner's visible row pool. Clones share geometry/materials/textures within a slot and own independent skeletons. Removed/replaced/stale loads clean up resources; all object slots are staged before project hydration commits them. Several heavy models may still consume substantial memory/draw calls (up to 15 object instances plus scenery/character); import limits are not a device-FPS guarantee. Cross-slot GPU resource deduplication is not implemented.

Implementation boundaries: `src/assets/object-settings.js` declares serializable validated transforms/slot fit metadata; `object-view.js` manages staged static model fitting, pooled instances and disposal; `object-editor.js` handles per-slot upload/reset/configuration. Runner only positions/chooses visuals from existing simulation state; motion detectors and collision/scoring code were not changed. The template registry and project schema/storage use the same typed asset slots as the shared library.

Object regressions cover default migration, independent validated transforms, fitted instance positions/type visibility/spin, read-only gameplay state, skeleton-safe clones/shared-resource disposal, staged/failed/stale loads, flat scenery and shared-reference persistence/deletion protection. Browser checks cover all four slots, reuse of a single model, transforms through save/reload, reset/default behaviour, pause-on-edit, rejected replacement, flat scenery and mobile no-overflow. Original client scenery/obstacle models and event hardware still need operator validation.


## Static stage / Endless straight track

**3D objects & environment → Environment mode** now selects:

- **Static stage** (default, including older projects): retain the existing one-stage environment behaviour. Endless road/tree/rock/bush/log slots stay hidden.
- **Endless straight track**: hide the static-stage GLB; recycle road pieces and seeded roadside scenery according to **game distance**. Character controls, hitboxes, course/scoring and the current 60-second session are unchanged. “Endless” describes the environment recycling, not a new unlimited-duration game rule.

### Jungle workflow

1. Select **Endless straight track**. No custom assets are required to test movement: the existing procedural track remains, with generated trees now moving/recycling using the scenery rules.
2. Import a straight **Endless road segment** GLB. It is centred in X/Z, its top aligned to ground height zero, and independently fitted in X/Z to **8 world units wide × Segment length**. This intentionally stretches X/Z (UVs follow the model); vertical thickness is capped at 1 unit. Provide a pavement-only segment with matching start/end edges/materials. Keep its Size 1, Rotation 0 and Offset 0 for aligned joins. Decorative borders inside the road GLB must already fit its footprint. Arbitrary curved/map GLBs cannot be automatically connected from their appearance.
3. Import one GLB per **Endless trees**, **Endless rocks**, **Endless bushes** slot, directly or through Asset Library. Initial aspect-fit sizes are respectively `2.4 × 4 × 2.4`, `1.5 × 1.2 × 1.5`, `2 × 1.2 × 2` units, floor aligned. These sources have the existing size/rotation/offset controls. Missing categories are omitted; if all are missing, generated trees are used. Multiple variants *within* one category are not implemented yet.
4. Set **Segment length** (12–40 units), **Scenery density** (standard or dense), **Road clearance** (0.5–8 units outside each road edge), and **Scenery seed** (integer 0–2147483647). Each assigned category appears in every segment (twice at dense), alternating sides, rather than randomly omitting some types from the nearby course. The seed determines category order, stratified along-segment positions, lateral spread, yaw and size variation (0.85–1.15×). No category weights or per-species spawn rules yet. Road segment order is repeated copies of the one assigned road model, not random terrain assembly.
5. **Save project**. Mode/rules, all four new model references and their transforms persist through reopen and project duplication. Old v1 settings migrate non-destructively to Static stage/default endless rules, with no new model assignments. All new model slots retain the existing local-library reference/deletion protections.

### Safety, recycling and limits

- Eight road instances cover the visible straight corridor and are repositioned/recycled; no GLB fetch/parse happens while running. Each roadside category has a fixed 32-clone pool (at most **64 active props** at dense, 32 at standard when all four categories are assigned; fewer categories use fewer props, with a minimum of two per segment). Sources share geometry/material/texture resources within a slot; skeletons are cloned independently. Identity is based on seed + world-chunk ID, so a moving chunk keeps its layout until it leaves view. A seed/rule edit pauses play and deliberately regenerates layout. Resetting distance reproduces the starting layout.
- Pausing, tracking loss or Mode A standing still freezes scenery because distance freezes; resume continues from the same distance. Scene placement does not advance from wall time. In-progress distance/calibration are still not saved.
- Roadside GLBs are visual-only, non-colliding decoration. Their fitted/rotated/offset bounds plus maximum random scale are conservatively kept outside the 8-unit road plus configured clearance. Large horizontal offsets are rebased outward for this safety rule, not allowed to move scenery into lanes. Props can overlap each other off-road. Actual collidable hazards remain in the separate jump/duck obstacle slots.
- Custom roads replace the default track only in Endless mode; lane markings/rails remain. Markings are lifted slightly above custom ground. A rotated/scaled/offset road can still create gaps or cover other visuals, and complex/non-planar meshes can have mismatched edges even after fitting. This is **not** terrain stitching, automatic model classification, a navmesh/collision editor, hills, bends, junctions, biomes, or endless free-roaming terrain. Verify model seams, shading, field of view and obstacle visibility in play.
- Repeated road/scenery assets have additional per-source limits of **16 mesh objects and 50,000 vertices**, on top of the common GLB limits. These are still not FPS guarantees. Up to 104 resident clones may exist across road + all three scenery pools (8 + 96), although only a subset of side props is visible; low-poly scenery and modest materials/textures are important on event hardware. Object/scenery clips remain static; only the character animation system plays clips.
- **Reset transform** / **Use default geometry** retain their slot-local meaning and do not change mode/rules. Removing the custom road uses the procedural track; removing all three scenery sources uses generated trees. A static-stage GLB is retained in project/library storage when switching to Endless and reappears when returning to Static.

`src/assets/endless.js` owns pure bounded config, seeded layout and chunk identities; `object-view.js` owns prepared/pool resources, road fitting and safe prop positioning; the existing object editor/schema/library persist the mode and typed slots. Tests cover long distances, smallest/largest segment lengths, boundary continuity, deterministic layout, no new model resources on recycling/rule changes, flat road fitting, safe transformed-model bounds, unchanged gameplay state, static fallback, storage and UI persistence. Real jungle/snow assets and target-hardware endurance still need operator validation.


## Curated built-in Forest Pack

The user-provided `Models/forest_pack.glb` is a **whole asset pack**, not a single tree: 54 authored object groups, 69 mesh primitives and 9,388 vertices. Its rejection in a repeated scenery slot was due to the **16-mesh limit**, not excessive polygon count. That limit is not raised. The original is retained byte-for-byte; see `Models/README.md` for provenance, the source hash and rebuild instructions.

### Use it in the app

1. Open **Asset Library → Built-in Forest Pack** (above the local asset list).
2. Pick a category and individual asset; the panel displays original object name, mesh/vertex counts, download size and suggested scenery slot. Choose **Import selected asset**, or **Import starter set (tree, rock, bush)** for the first oak, stone and light-bush assets.
3. In the local asset list, choose **Use as tree / rock / bush / log**. Select **Endless straight track** to see repeated roadside placement, then **Save project**. Import does not silently assign assets, change mode, replace a character or alter existing projects.
4. Imports are idempotent: the same verified curated content reuses its existing local record, retaining current project references. Deleting an unused import is allowed; importing again restores it from the built-in catalog. Usual assigned/saved-reference deletion protection remains active. This is still **browser-local** storage, not cloud sync or a backup.

Categories: **15 trees, 10 rocks, 8 bushes, 9 logs/stumps and 12 ground-cover models** (ferns, grass, flowers and mushrooms). Trees retain trunk+leaves together. Logs/stumps are labelled as such, not claimed to be standing dead-tree models. The current environment still supports one assigned source per category: importing several variants makes them selectable in the library but does not automatically scatter all variants simultaneously. This curated split does not add an arbitrary runtime pack-splitting feature.

### Preparation and download trade-offs

- Generated self-contained assets are under `public/packs/forest-v1`; their counts, names, categories, source metadata and SHA-256 hashes are in `src/assets/forest-catalog.json`.
- Each model has **1–2 meshes and at most 650 vertices**. Unused geometry/materials/textures are removed, accessor data is packed and small indices use uint16. Original positions/normals/UVs and triangle topology are retained, with no decimation. Axis-conversion ancestors are preserved and each asset's pivot is centred horizontally/grounded. Embedded PNG texture atlases are resized from 1024 to **512 pixels**, preserving alpha; this is an intentional texture-resolution trade-off, not lossless texture optimization.
- Total standalone files occupy about **13 MiB**, larger in aggregate than the original 1.4 MB pack because each independent GLB embeds the atlases it needs. Assets are **downloaded only when selected**, not all on app startup; typical individual downloads are roughly 190–390 KB. This avoids fetching/loading the whole source pack per tree and keeps the app's existing self-contained/no-external-resources policy. The catalog is bundled, but no models are automatically copied into a user's IndexedDB.
- Imports validate HTTP success, exact byte size, SHA-256 and the GLB structure before writing a local record. A corrupt existing curated record is reported, not silently overwritten while saved projects may reference it. Failed downloads/integrity checks leave existing records untouched. Author attribution is retained on each imported record and in the GLB metadata.
- `scripts/prepare-forest-pack.py` is deterministic for the pinned source/Pillow version. Use `scripts/requirements-assets.txt`; `--texture-size 1024` can retain original atlas resolution if needed, at larger file sizes. Rebuild and commit the generated files/catalog together. Production asset checks verify all 54 distributed GLBs against the catalog.

### Attribution and client delivery

Source metadata declares **CC BY 4.0**, by **Ragat Vdoo Kaf** (https://sketchfab.com/mae_bul_01), titled “low poly forest pack, low poly environment pack”. Source: https://sketchfab.com/3d-models/low-poly-forest-pack-low-poly-environment-pack-47b2cb567d1b437fb86d2897353079ab . License: https://creativecommons.org/licenses/by/4.0/ .

Credit: **Forest Pack by Ragat Vdoo Kaf, CC BY 4.0. Split, re-centred and texture-resized for WonderLab.** Keep this credit, source/license links and modification notice with redistributed models/client deliverables. The app library, generated GLB metadata, `Models/README.md` and `public/packs/forest-v1/CREDITS.txt` preserve it. This documents the supplied metadata, not independent legal/rights verification.

Verification covers every output's checksum, structural limits, attribution, total vertex preservation and grounded/centred geometry, plus browser imports of the actual textured starter models, duplicate avoidance, slot assignment, save/reload, category lists and failed-download handling. Texture quality and target event-device performance still require operator review with the selected client scene.

### Visual asset thumbnails

Forest Pack categories now include clickable thumbnail cards (with the existing dropdown retained for keyboard selection). All 54 previews are pre-rendered PNGs, so browsing pictures does not download/parse the GLBs. Imported Forest assets reuse those previews. Other local images and GLBs get a small preview when their library row becomes visible; GLBs use a single sequential render queue, with model/GPU resources released after each snapshot. Failed previews show “No preview” without blocking assignment. Previews depict the model's static default pose, not animation playback.

To rebuild Forest thumbnails after changing models, start `npm run dev -- --port 4174`, then run `node scripts/prepare-forest-thumbnails.mjs` (install Playwright Chromium, or set `CHROMIUM_PATH`). Commit `public/packs/forest-v1/thumbnails/` with the catalog/models. Thumbnails are derivatives under the same attribution/license; credits remain in the pack's `CREDITS.txt` and library. Production checks require a thumbnail for each catalog entry.


### Trees missing / rocks replacing logs

The earlier layout randomly selected only one model type for each roadside position. At sparse density, nearby chunks could contain only rocks/bushes while trees were distant or hidden by fog. The balanced layout now places **each assigned category in every segment**, keeps its world identity during scrolling, and reduces excess lateral spread without moving model bounds into the safe road corridor. No extra downloads or parsing occur while running; pools remain bounded and collision/gameplay logic is unchanged. Static-stage behaviour is unchanged.

There are now **four independent roadside slots**: tree, rock, bush, and **log (logs/stumps)**. Importing alone does not assign an asset. In Asset Library choose the matching `Use as …` button, then Save project. Each slot holds one model; assigning a second tree replaces the first tree, not the rocks/bushes/logs. Ground-cover assets may use the bush slot, but that replaces its current bush model.

Old projects load with an empty log slot and retain all existing assignments/transforms. If a log was previously assigned as rock, it remains there to avoid silently changing a saved project: reassign it with **Use as log**, assign the desired rock with **Use as rock**, and save again. The Forest catalog now suggests log for all nine deadwood assets. This is not automatic multi-variant scattering; one model per category remains supported.
