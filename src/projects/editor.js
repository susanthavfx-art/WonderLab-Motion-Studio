import { OBJECT_KEYS } from "../assets/object-settings.js";
import {
  isModelFile,
  loadGlb,
  disposeModel,
  inspectGlb,
} from "../assets/glb.js";
import { createStudioStore } from "./storage.js";
import { newProject, validateProject } from "./schema.js";
import { listTemplates } from "../templates/registry.js";
import { createBrandAssets } from "../branding.js";

export function mountProjectStudio({ capture, apply, pause, assign }) {
  const store = createStudioStore();
  let current = newProject(),
    dirty = false,
    busy = false,
    applying = false;
  const fileIds = new WeakMap();
  const bar = document.createElement("section");
  bar.className = "project-bar";
  bar.innerHTML = `<div><label for="projectName">CLIENT PROJECT</label><input id="projectName" maxlength="80" value="Untitled client project" aria-label="Project name"><small id="projectState">Unsaved project · Local browser only</small></div><div class="project-actions"><button class="button secondary" id="newProject">New</button><button class="button dark" id="saveProject">Save project</button><button class="button secondary" id="openProjects">Open projects</button><button class="button secondary" id="openAssets">Asset Library</button></div>`;
  document.querySelector(".lab-banner").before(bar);
  const dialogs = document.createElement("div");
  dialogs.innerHTML = `<dialog id="projectsDialog"><div class="dialog-heading"><h2>Client projects</h2><button data-close="projectsDialog" class="icon-button" aria-label="Close projects">✕</button></div><p>Saved in this browser on this site only. Clearing site data deletes projects and assets. This is not a backup.</p><div id="projectList" class="studio-list"></div></dialog><dialog id="assetsDialog"><div class="dialog-heading"><h2>Shared Asset Library</h2><button data-close="assetsDialog" class="icon-button" aria-label="Close asset library">✕</button></div><p>Reusable images and GLB models for registered template slots. GLB clips map to gameplay actions in the character panel. Static scenery, endless road/tree/rock/bush slots, jump/duck obstacles and collectibles accept GLB visuals. Choose environment mode in the object panel; audio is not yet supported.</p><label class="library-upload">Import image or GLB<input id="libraryFile" type="file" accept="image/png,image/jpeg,image/webp,.glb,model/gltf-binary"></label><small>Images: 8 MB, 4096 px, 16 MP (logos: 2 MB). Self-contained GLB: 20 MB.</small><div id="assetList" class="studio-list"></div></dialog><dialog id="templatesDialog"><div class="dialog-heading"><h2>Game templates</h2><button data-close="templatesDialog" class="icon-button" aria-label="Close templates">✕</button></div><p>Templates own their rules, input actions and asset slots. Runner is the first registered template, not the only kind of game planned.</p><div id="templateList" class="studio-list"></div></dialog><div id="studioStatus" class="studio-status" role="status" hidden></div>`;
  document.body.append(dialogs);
  const $ = (id) => document.getElementById(id);
  const message = (text) => {
    $("studioStatus").textContent = text;
    $("studioStatus").hidden = false;
  };
  function state() {
    $("projectState").textContent =
      `${dirty ? "Unsaved changes" : current.saved ? "Saved locally" : "Unsaved project"} · ${current.templateId} v${current.templateVersion} · This browser only`;
  }
  function markDirty() {
    if (!applying) {
      dirty = true;
      state();
    }
  }
  document.addEventListener("studio:changed", markDirty);
  $("projectName").oninput = markDirty;
  const discard = () => !dirty || confirm("Discard unsaved project changes?");
  function setBusy(value) {
    busy = value;
    document.querySelector("main").inert = value;
    dialogs.querySelectorAll("dialog").forEach((d) => (d.inert = value));
  }
  async function operate(fn) {
    if (busy) return;
    pause();
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      message(
        `Could not complete operation: ${error.message}. Your saved data has not been cleared.`,
      );
    } finally {
      setBusy(false);
      state();
    }
  }
  function snapshot() {
    return {
      ...current,
      ...capture(),
      name: $("projectName").value.trim() || "Untitled client project",
      updatedAt: Date.now(),
    };
  }
  async function ensureAsset(file) {
    if (!file) return null;
    const id = fileIds.get(file);
    if (id) {
      try {
        await store.getAsset(id);
        return id;
      } catch {}
    }
    const asset = await store.putAsset(file);
    fileIds.set(file, asset.id);
    return asset.id;
  }
  async function saveAs(copy = false) {
    const value = snapshot(),
      files = value.files;
    delete value.files;
    if (copy) {
      value.id = crypto.randomUUID();
      value.name = (value.name + " copy").slice(0, 80);
    }
    value.assetRefs = {
      logo: await ensureAsset(files.logo),
      background: await ensureAsset(files.background),
      character: await ensureAsset(files.character),
      ...Object.fromEntries(
        await Promise.all(
          OBJECT_KEYS.map(async (k) => [k, await ensureAsset(files[k])]),
        ),
      ),
    };
    current = { ...(await store.saveProject(value)), saved: true };
    dirty = false;
    $("projectName").value = current.name;
    message(
      `Saved “${current.name}” locally with its branding, settings and assets.`,
    );
  }
  async function verifyFiles(files) {
    const validator = createBrandAssets(
      () => {},
      () => {},
    );
    try {
      for (const [slot, file] of Object.entries(files))
        if (file) {
          if (slot === "character" || OBJECT_KEYS.includes(slot))
            inspectGlb(await file.arrayBuffer());
          else await validator.load(file, slot);
        }
    } finally {
      validator.dispose();
    }
  }
  async function activate(project, saved) {
    const value = validateProject(project),
      files = {
        logo: null,
        background: null,
        character: null,
        ...Object.fromEntries(OBJECT_KEYS.map((k) => [k, null])),
      };
    for (const [slot, id] of Object.entries(value.assetRefs))
      if (id) {
        const a = await store.getAsset(id);
        files[slot] = new File([a.blob], a.name, { type: a.type });
        fileIds.set(files[slot], id);
      }
    await verifyFiles(files);
    applying = true;
    try {
      await apply(value, files);
      current = { ...value, saved };
      $("projectName").value = value.name;
      dirty = false;
    } finally {
      applying = false;
    }
  }
  async function fresh(templateId = "runner") {
    if (!discard()) return;
    const value = newProject();
    value.templateId = templateId;
    await activate(value, false);
    message("New project ready. Choose a client name and save explicitly.");
  }
  function button(label, fn) {
    const b = document.createElement("button");
    b.className = "button secondary compact";
    b.textContent = label;
    b.onclick = () => operate(fn);
    return b;
  }
  function row(name, info) {
    const el = document.createElement("article");
    el.className = "studio-row";
    const title = document.createElement("strong"),
      sub = document.createElement("small"),
      actions = document.createElement("div");
    title.textContent = name;
    sub.textContent = info;
    el.append(title, sub, actions);
    return { el, actions };
  }
  async function projects() {
    const savedProjects = (await store.listProjects()).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
    $("projectList").replaceChildren();
    if (!savedProjects.length)
      $("projectList").textContent =
        "No saved projects yet. Use Save project to create one.";
    for (const p of savedProjects) {
      const { el, actions } = row(
        p.name,
        `${p.templateId} v${p.templateVersion} · ${new Date(p.updatedAt).toLocaleString()}`,
      );
      actions.append(
        button("Open", async () => {
          if (!discard()) return;
          await activate(await store.getProject(p.id), true);
          $("projectsDialog").close();
          message(
            "Project loaded. Camera is off and the run is reset; nothing starts automatically.",
          );
        }),
        button("Duplicate", async () => {
          const value = await store.getProject(p.id);
          value.id = crypto.randomUUID();
          value.name = (value.name + " copy").slice(0, 80);
          value.updatedAt = Date.now();
          await store.saveProject(value);
          await projects();
          message(
            "Independent project copy created; immutable assets are shared.",
          );
        }),
        button("Delete", async () => {
          if (
            !confirm(
              `Delete saved project “${p.name}”? Assets stay in the shared library.`,
            )
          )
            return;
          await store.deleteProject(p.id);
          if (current.id === p.id) {
            current = { ...current, id: crypto.randomUUID(), saved: false };
            dirty = true;
          }
          await projects();
          message("Saved project deleted. Shared assets were retained.");
        }),
      );
      $("projectList").append(el);
    }
  }
  async function library() {
    const assets = await store.listAssets();
    $("assetList").replaceChildren();
    if (!assets.length)
      $("assetList").textContent =
        "No assets yet. Import images/GLBs here, or save a project with uploaded assets.";
    for (const a of assets) {
      const { el, actions } = row(
        a.name,
        `${a.kind} · ${a.type} · ${(a.size / 1024).toFixed(0)} KB`,
      );
      for (const slot of a.kind === "model"
        ? ["character", ...OBJECT_KEYS]
        : ["logo", "background"])
        actions.append(
          button(`Use as ${slot}`, async () => {
            const asset = await store.getAsset(a.id),
              file = new File([asset.blob], asset.name, { type: asset.type });
            await assign(slot, file);
            fileIds.set(file, a.id);
            markDirty();
            message(
              `Assigned “${a.name}” as ${slot}. Save project to persist this assignment.`,
            );
          }),
        );
      actions.append(
        button("Delete", async () => {
          if (
            Object.values(capture().files).some(
              (f) => f && fileIds.get(f) === a.id,
            )
          )
            throw Error(
              "Asset is assigned in the current editor. Remove its assignment in the editor first.",
            );
          if (!confirm(`Delete library asset “${a.name}”?`)) return;
          await store.deleteAsset(a.id);
          await library();
          message("Unused library asset deleted.");
        }),
      );
      $("assetList").append(el);
    }
  }
  $("newProject").onclick = () => operate(() => fresh());
  $("saveProject").onclick = () => operate(() => saveAs());
  $("openProjects").onclick = () =>
    operate(async () => {
      await projects();
      $("projectsDialog").showModal();
    });
  $("openAssets").onclick = () =>
    operate(async () => {
      await library();
      $("assetsDialog").showModal();
    });
  $("projectsNav").onclick = () => $("openProjects").click();
  $("templatesNav").onclick = () =>
    operate(async () => {
      $("templateList").replaceChildren();
      for (const t of listTemplates()) {
        const { el, actions } = row(
          t.name,
          `${t.description} · v${t.version} · Actions: ${t.actions.join(", ")} · Slots: ${t.assetSlots.map((s) => s.label).join(", ")}`,
        );
        actions.append(
          button("New project", async () => {
            await fresh(t.id);
            $("templatesDialog").close();
          }),
        );
        $("templateList").append(el);
      }
      $("templatesDialog").showModal();
    });
  $("libraryFile").onchange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    operate(async () => {
      if (isModelFile(file)) {
        const model = await loadGlb(file, { allowFlat: true });
        disposeModel(model);
      } else await verifyFiles({ background: file });
      await store.putAsset(file);
      await library();
      message("Asset imported into the shared local library.");
    }).finally(() => (e.target.value = ""));
  };
  dialogs
    .querySelectorAll("[data-close]")
    .forEach((b) => (b.onclick = () => $(b.dataset.close).close()));
  dialogs.querySelectorAll("dialog").forEach((d) => {
    d.addEventListener("cancel", (e) => {
      if (busy) e.preventDefault();
    });
  });
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  // Fail visibly when IndexedDB is unavailable, but never block motion testing.
  store
    .listProjects()
    .then(() =>
      message(
        "Local project storage ready. Save explicitly; keep backups outside this browser.",
      ),
    )
    .catch((e) =>
      message(
        `Local storage unavailable: ${e.message}. Motion Lab still works; saving will report an error.`,
      ),
    );
  state();
  return { markDirty, dispose: () => store.close() };
}
