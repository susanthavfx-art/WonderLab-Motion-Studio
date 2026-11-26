import {
  CHARACTER_ACTIONS,
  defaultCharacter,
  validateCharacter,
} from "./character-settings.js";
export function mountCharacterEditor({ view, pause, changed }) {
  let file = null,
    settings = defaultCharacter(),
    clips = [],
    generation = 0,
    pending = 0;
  const panel = document.createElement("section");
  panel.className = "panel character-panel";
  panel.id = "characterPanel";
  panel.innerHTML = `<div class="small-heading"><h2>3D character & animations</h2><span class="experimental">GLB · LOCAL</span></div><p>Reusable model from the shared library. Import a self-contained GLB with embedded textures and in-place animation clips. Game hitboxes remain unchanged.</p><div class="character-controls"><label>Character GLB<input id="characterFile" type="file" accept=".glb,model/gltf-binary"></label><button id="removeCharacter" class="button secondary compact">Use default character</button><label>Facing<select id="characterFacing"><option value="0">0°</option><option value="90">90°</option><option value="180" selected>180°</option><option value="270">270°</option></select></label><label>Size <output id="characterScaleValue">1.00×</output><input id="characterScale" type="range" min="0.5" max="2" step="0.05" value="1"></label></div><div class="character-mappings">${CHARACTER_ACTIONS.map((a) => `<label>${a[0].toUpperCase() + a.slice(1)} animation<select id="clip-${a}" aria-label="${a} animation"><option value="">None · static / fallback</option></select></label>`).join("")}</div><p id="characterStatus" role="status">Default geometry character · Import a GLB up to 20 MB, or assign one from Asset Library.</p><small id="characterPlayback">No custom character</small><small>Clip names are auto-suggested; verify every mapping. No animation retargeting. Missing actions use Idle/static pose (duck gets a scale cue). Models keep their own materials, not brand colours. Pause freezes animation.</small>`;
  document.getElementById("runnerPanel").closest(".bottom-grid").before(panel);
  const $ = (id) => document.getElementById(id);
  function hydrate() {
    $("characterFacing").value = String(settings.facing);
    $("characterScale").value = String(settings.scale);
    $("characterScaleValue").textContent = settings.scale.toFixed(2) + "×";
    for (const action of CHARACTER_ACTIONS) {
      const el = $("clip-" + action);
      el.replaceChildren(new Option("None · static / fallback", ""));
      for (const c of clips)
        el.append(
          new Option(
            `${c.index + 1}. ${c.name} (${c.duration.toFixed(2)}s)`,
            String(c.index),
          ),
        );
      el.value =
        settings.clips[action] === null ? "" : String(settings.clips[action]);
    }
  }
  function busyControls() {
    for (const id of [
      "characterScale",
      "characterFacing",
      ...CHARACTER_ACTIONS.map((a) => "clip-" + a),
    ])
      $(id).disabled = pending > 0;
  }
  async function load(next, value) {
    pause();
    const token = ++generation;
    pending++;
    busyControls();
    $("characterStatus").textContent =
      "Checking GLB geometry, textures and animations…";
    try {
      if (!view && next)
        throw Error("WebGL unavailable; character preview cannot load.");
      const config = validateCharacter(value ?? defaultCharacter());
      const result = view ? await view.load(next, config) : [];
      if (token !== generation || result === null) return;
      if (next && !value) {
        for (const action of CHARACTER_ACTIONS) {
          const regex = {
            idle: /idle|standing/i,
            run: /run|running|walk/i,
            jump: /jump/i,
            duck: /duck|crouch|squat/i,
          }[action];
          config.clips[action] =
            result.find((c) => regex.test(c.name))?.index ?? null;
        }
        view.configure(config);
      }
      file = next;
      settings = config;
      clips = result;
      hydrate();
      changed();
      $("characterStatus").textContent = next
        ? `${next.name} · ${clips.length} animation clips · ${clips.length ? "Check the action mappings." : "Static model; no embedded animations."}`
        : "Default geometry character restored.";
    } catch (error) {
      if (token === generation)
        $("characterStatus").textContent =
          `Character not changed: ${error.message}`;
      throw error;
    } finally {
      pending--;
      busyControls();
    }
  }
  $("characterFile").onchange = async (e) => {
    const next = e.target.files?.[0];
    if (!next) return;
    try {
      await load(next);
    } catch {
    } finally {
      e.target.value = "";
    }
  };
  $("removeCharacter").onclick = () => load(null).catch(() => {});
  function configure() {
    pause();
    settings.scale = Number($("characterScale").value);
    settings.facing = Number($("characterFacing").value);
    for (const a of CHARACTER_ACTIONS)
      settings.clips[a] =
        $("clip-" + a).value === "" ? null : Number($("clip-" + a).value);
    view?.configure(settings);
    $("characterScaleValue").textContent = settings.scale.toFixed(2) + "×";
    changed();
  }
  for (const id of [
    "characterScale",
    "characterFacing",
    ...CHARACTER_ACTIONS.map((a) => "clip-" + a),
  ])
    $(id).addEventListener("input", configure);
  return {
    load,
    capture() {
      if (pending) throw Error("Wait for GLB loading to finish, then retry");
      return { file, settings: structuredClone(settings) };
    },
    tick() {
      const info = view?.info();
      $("characterPlayback").dataset.animationTime = String(info?.time ?? 0);
      $("characterPlayback").textContent = info?.loaded
        ? `Visual action: ${info.action || "idle"} · ${info.clip === null ? "static pose" : `clip ${info.clip + 1}`} · Hitboxes unchanged`
        : "No custom character";
    },
  };
}
