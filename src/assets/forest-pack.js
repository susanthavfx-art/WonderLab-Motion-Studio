import { mountAssetThumbnail } from "./thumbnail.js";
import catalog from "./forest-catalog.json" with { type: "json" };
import { inspectGlb } from "./glb.js";
export const forestCatalog = catalog;
export const forestCategories = {
  tree: "Trees",
  rock: "Rocks",
  bush: "Bushes",
  deadwood: "Logs & stumps",
  groundcover: "Ferns, grass, flowers & mushrooms",
};
export const forestStarter = () =>
  ["tree", "rock", "bush"].map(
    (category) => catalog.assets.find((a) => a.category === category).id,
  );
const digest = async (bytes) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
export async function importForestAsset(
  id,
  store,
  { fetcher = globalThis.fetch, base = import.meta.env?.BASE_URL ?? "./" } = {},
) {
  const entry = catalog.assets.find((a) => a.id === id);
  if (!entry) throw Error("Unknown Forest Pack asset.");
  const sourceKey = `${catalog.id}:${entry.sha256}`;
  const existing = (await store.listAssets()).find(
    (a) => a.sourceKey === sourceKey,
  );
  if (existing) {
    const stored = await store.getAsset(existing.id);
    if ((await digest(await stored.blob.arrayBuffer())) !== entry.sha256)
      throw Error(
        "Stored Forest Pack asset is damaged. Remove it from referencing projects/library before importing again.",
      );
    return existing;
  }
  const response = await fetcher(`${base}packs/forest-v1/${entry.file}`);
  if (!response.ok)
    throw Error(
      `Forest Pack download failed (${response.status}). Retry when online.`,
    );
  const bytes = await response.arrayBuffer();
  if (
    bytes.byteLength !== entry.bytes ||
    (await digest(bytes)) !== entry.sha256
  )
    throw Error(
      "Forest Pack file failed its integrity check. Refresh after deployment and retry.",
    );
  inspectGlb(bytes);
  const file = new File([bytes], `forest-${entry.file}`, {
    type: "model/gltf-binary",
  });
  return store.putAsset(file, {
    sourceKey,
    attribution:
      catalog.attribution +
      " " +
      catalog.licenseUrl +
      " Source: " +
      catalog.source,
  });
}
export function mountForestCatalog(
  parent,
  { operate, store, refresh, message },
) {
  const section = document.createElement("section");
  section.className = "forest-catalog";
  section.innerHTML = `<h3>Built-in Forest Pack · 54 individual assets</h3><p>Choose an individual model, not the full forest layout. Trees include their trunk and leaves. Imports are saved only in this browser; they do not replace your current project assets.</p><div class="forest-controls"><label>Category<select id="forestCategory"></select></label><label>Asset<select id="forestAsset"></select></label></div><div id="forestThumbnails" class="forest-thumbnails" role="group" aria-label="Choose a forest model"></div><p id="forestInfo"></p><div class="project-actions"><button id="importForest" class="button dark compact">Import selected asset</button><button id="importForestStarter" class="button secondary compact">Import starter set (tree, rock, bush)</button></div><p class="forest-credit"></p>`;
  parent.append(section);
  parent.querySelector("#assetList")?.before(section);
  const $ = (id) => section.querySelector("#" + id);
  for (const [key, label] of Object.entries(forestCategories))
    $("forestCategory").append(new Option(label, key));
  function info() {
    const e = catalog.assets.find((a) => a.id === $("forestAsset").value);
    for (const card of $("forestThumbnails").children)
      card.setAttribute("aria-pressed", String(card.dataset.id === e?.id));
    $("forestInfo").textContent = e
      ? `${e.name} · ${e.meshes} meshes · ${e.vertices} vertices · ${(e.bytes / 1024).toFixed(0)} KB · Suggested slot: ${e.suggestedSlot}`
      : "";
  }
  function choices() {
    $("forestAsset").replaceChildren();
    $("forestThumbnails").replaceChildren();
    for (const e of catalog.assets.filter(
      (a) => a.category === $("forestCategory").value,
    )) {
      $("forestAsset").append(new Option(e.name, e.id));
      const card = document.createElement("button");
      card.type = "button";
      card.className = "forest-thumbnail-card";
      card.dataset.id = e.id;
      card.textContent = e.name;
      card.onclick = () => {
        $("forestAsset").value = e.id;
        info();
      };
      $("forestThumbnails").append(card);
      mountAssetThumbnail(card, {
        name: e.name,
        url: `${import.meta.env?.BASE_URL ?? "./"}packs/forest-v1/thumbnails/${e.id}.png`,
      });
    }
    info();
  }
  $("forestCategory").onchange = choices;
  $("forestAsset").onchange = info;
  choices();
  const credit = section.querySelector(".forest-credit");
  credit.append(document.createTextNode(catalog.attribution + " "));
  for (const [label, url] of [
    ["Source", catalog.source],
    ["CC BY 4.0 license", catalog.licenseUrl],
  ]) {
    const a = document.createElement("a");
    a.textContent = label;
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    credit.append(a, document.createTextNode(" · "));
  }
  async function add(ids) {
    let count = 0;
    for (const id of ids) {
      const e = catalog.assets.find((a) => a.id === id);
      message(`Importing Forest Pack: ${e.name} (${++count}/${ids.length})…`);
      await importForestAsset(id, store);
    }
    await refresh();
    message(
      `Forest Pack ready: ${ids.length} selected asset(s) available locally. Use the library assignment buttons, then Save project. Existing imports are reused.`,
    );
  }
  $("importForest").onclick = () =>
    operate(() => add([$("forestAsset").value]));
  $("importForestStarter").onclick = () => operate(() => add(forestStarter()));
}
