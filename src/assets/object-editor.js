import { defaultEnvironment, validateEnvironment } from "./endless.js";
import {
  OBJECT_SLOTS,
  OBJECT_KEYS,
  defaultTransform,
  validateTransform,
  validateObjects,
} from "./object-settings.js";
export function mountObjectEditor({ view, pause, changed }) {
  const files = Object.fromEntries(OBJECT_KEYS.map((k) => [k, null])),
    settings = validateObjects(),
    generations = Object.fromEntries(OBJECT_KEYS.map((k) => [k, 0]));
  let pending = 0,
    environment = defaultEnvironment();
  const panel = document.createElement("section");
  panel.id = "objectPanel";
  panel.className = "panel object-panel";
  panel.innerHTML = `<div class="small-heading"><h2>3D objects & environment</h2><span class="experimental">SHARED GLB SLOTS</span></div><p>Visual replacements only: collisions and lane positions do not resize with models. Choose Static stage or Endless track below. In Endless mode, the static stage is hidden; road pieces recycle and trees/rocks/bushes populate the sides. Duck GLB replaces the overhead bar, not its support posts. Object clips are not played.</p><div class="environment-controls"><label>Environment mode<select id="environmentMode" data-env="mode"><option value="static">Static stage</option><option value="endless">Endless straight track</option></select></label><label>Segment length<input id="environmentLength" data-env="length" type="number" min="12" max="40" step="1" value="24"></label><label>Scenery per side / segment<select id="environmentDensity" data-env="density"><option value="1">Sparse · 1</option><option value="2">Dense · 2</option></select></label><label>Road clearance<input id="environmentClearance" data-env="clearance" type="number" min="0.5" max="8" step="0.1" value="2"></label><label>Scenery seed<input id="environmentSeed" data-env="seed" type="number" min="0" max="2147483647" step="1" value="2026"></label></div><p id="environmentStatus" role="status">Static stage · Endless asset slots are inactive.</p><small>Road GLB is fitted to width 8 and segment length (X/Z stretch); use straight pieces with matching edges and identity transforms for seams. Tree/rock/bush models scatter outside the road; their animations are not played. No road model uses the procedural track; no scenery sources uses generated trees.</small><div class="object-grid">${OBJECT_KEYS.map((key) => `<details class="object-slot" id="slot-${key}"><summary>${OBJECT_SLOTS[key].label}</summary><label>Import GLB<input id="objectFile-${key}" type="file" accept=".glb,model/gltf-binary"></label><div class="object-actions"><button id="objectDefault-${key}" class="button secondary compact">Use default geometry</button><button id="objectTransformReset-${key}" class="text-button">Reset transform</button></div><label>Size multiplier<input id="object-${key}-scale" data-slot="${key}" data-field="scale" type="number" min="0.1" max="5" step="0.05" value="1"></label>${["rotation", "offset"].map((field) => `<fieldset><legend>${field === "rotation" ? "Rotation (degrees)" : "Position offset (slot units)"}</legend>${["x", "y", "z"].map((axis) => `<label>${axis.toUpperCase()}<input id="object-${key}-${field}-${axis}" data-slot="${key}" data-field="${field}" data-axis="${axis}" type="number" min="${field === "rotation" ? -180 : -50}" max="${field === "rotation" ? 180 : 50}" step="${field === "rotation" ? 1 : 0.05}" value="0"></label>`).join("")}</fieldset>`).join("")}<p id="objectStatus-${key}" role="status">Default geometry · No custom model</p></details>`).join("")}</div><small>Self-contained GLB up to 20 MB per slot. Scenery/object auto-fit preserves aspect ratio; the road uses X/Z fitting. Size applies after fitting. Large offsets/scales may make visuals misleading or hide the course. Check every obstacle in play before an event. Save project explicitly.</small>`;
  document.getElementById("runnerPanel").closest(".bottom-grid").before(panel);
  const $ = (id) => document.getElementById(id);
  const envIds = {
    mode: "environmentMode",
    length: "environmentLength",
    density: "environmentDensity",
    clearance: "environmentClearance",
    seed: "environmentSeed",
  };
  function hydrateEnvironment() {
    for (const [k, id] of Object.entries(envIds))
      $(id).value = String(environment[k]);
    $("environmentStatus").textContent =
      environment.mode === "endless"
        ? "Endless track · Distance-driven recycling · Static stage hidden · Safe road corridor"
        : "Static stage · Endless asset slots are inactive.";
  }
  panel.querySelectorAll("[data-env]").forEach((el) =>
    el.addEventListener("change", () => {
      pause();
      try {
        if (!el.validity.valid || el.value === "")
          throw Error("Enter valid environment settings within the limits.");
        const value = {
          ...environment,
          [el.dataset.env]:
            el.dataset.env === "mode" ? el.value : Number(el.value),
        };
        environment = validateEnvironment(value);
        view?.configureEnvironment(environment);
        hydrateEnvironment();
        changed();
      } catch (e) {
        hydrateEnvironment();
        $("environmentStatus").textContent = e.message;
      }
    }),
  );
  function status(key) {
    $("objectStatus-" + key).textContent = files[key]
      ? `${files[key].name} · Custom static GLB · Hitboxes unchanged`
      : "Default geometry · No custom model";
  }
  function hydrate(key) {
    const t = settings[key];
    $(`object-${key}-scale`).value = t.scale;
    for (const f of ["rotation", "offset"])
      for (const a of ["x", "y", "z"])
        $(`object-${key}-${f}-${a}`).value = t[f][a];
    status(key);
  }
  function busy() {
    panel
      .querySelectorAll("[data-slot], [data-env]")
      .forEach((el) => (el.disabled = pending > 0));
  }
  async function load(key, file, value = defaultTransform()) {
    pause();
    const generation = ++generations[key];
    pending++;
    busy();
    $("objectStatus-" + key).textContent = "Checking and fitting GLB…";
    try {
      const t = validateTransform(value);
      if (!view && file) throw Error("WebGL unavailable.");
      const ok = view ? await view.load(key, file, t) : true;
      if (!ok || generation !== generations[key]) return;
      files[key] = file;
      settings[key] = t;
      hydrate(key);
      changed();
    } catch (e) {
      if (generation === generations[key])
        $("objectStatus-" + key).textContent =
          `Object not changed: ${e.message}`;
      throw e;
    } finally {
      pending--;
      busy();
    }
  }
  for (const key of OBJECT_KEYS) {
    $("objectFile-" + key).onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await load(key, file);
      } catch {
      } finally {
        e.target.value = "";
      }
    };
    $("objectDefault-" + key).onclick = () => load(key, null).catch(() => {});
    $("objectTransformReset-" + key).onclick = () => {
      if (pending) return;
      pause();
      settings[key] = defaultTransform();
      view?.configure(key, settings[key]);
      hydrate(key);
      changed();
    };
  }
  panel.querySelectorAll("[data-slot]").forEach((el) =>
    el.addEventListener("change", () => {
      const key = el.dataset.slot;
      pause();
      try {
        if (el.value.trim() === "" || !el.validity.valid)
          throw Error("Enter a value within the displayed limits.");
        const t = structuredClone(settings[key]);
        if (el.dataset.field === "scale") t.scale = Number(el.value);
        else t[el.dataset.field][el.dataset.axis] = Number(el.value);
        settings[key] = validateTransform(t);
        view?.configure(key, t);
        status(key);
        changed();
      } catch (e) {
        hydrate(key);
        $("objectStatus-" + key).textContent = e.message;
      }
    }),
  );
  return {
    load,
    capture() {
      if (pending)
        throw Error("Wait for 3D object loading to finish, then retry.");
      return {
        files: { ...files },
        settings: structuredClone(settings),
        environment: { ...environment },
      };
    },
    async stage(nextFiles, value, nextEnvironment) {
      const env = validateEnvironment(nextEnvironment);
      const transforms = validateObjects(value),
        prepared = [];
      pending++;
      busy();
      try {
        for (const key of OBJECT_KEYS) {
          generations[key]++;
          const file = nextFiles[key] ?? null;
          if (!view && file) throw Error("WebGL unavailable.");
          const candidate = view
            ? await view.prepare(key, file, transforms[key])
            : null;
          if (view && !candidate)
            throw Error(
              "3D object load was superseded. Retry opening the project.",
            );
          prepared.push(candidate);
        }
        let done = false;
        return {
          commit() {
            if (done) return;
            done = true;
            for (const candidate of prepared) candidate?.commit();
            for (const key of OBJECT_KEYS) {
              files[key] = nextFiles[key] ?? null;
              settings[key] = transforms[key];
              hydrate(key);
            }
            environment = env;
            view?.configureEnvironment(environment);
            hydrateEnvironment();
            changed();
          },
          discard() {
            if (done) return;
            done = true;
            for (const candidate of prepared) candidate?.discard();
          },
        };
      } catch (e) {
        for (const candidate of prepared) candidate?.discard();
        throw e;
      } finally {
        pending--;
        busy();
      }
    },
  };
}
