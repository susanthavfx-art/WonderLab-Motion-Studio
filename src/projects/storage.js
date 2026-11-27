import { isModelFile, inspectGlb, GLB_LIMIT } from "../assets/glb.js";
import { getTemplate } from "../templates/registry.js";
import { validateProject } from "./schema.js";
const request = (r) =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
export function createStudioStore(name = "wonderlab-studio-v1") {
  let connection;
  async function open() {
    if (!globalThis.indexedDB)
      throw Error("Local storage is unavailable in this browser.");
    if (!connection)
      connection = new Promise((resolve, reject) => {
        const r = indexedDB.open(name, 1);
        r.onupgradeneeded = () => {
          r.result.createObjectStore("projects", { keyPath: "id" });
          r.result.createObjectStore("assets", { keyPath: "id" });
        };
        r.onerror = () => {
          connection = null;
          reject(r.error);
        };
        r.onblocked = () => {
          connection = null;
          reject(Error("Close other Studio tabs and retry local storage."));
        };
        r.onsuccess = () => {
          r.result.onversionchange = () => {
            r.result.close();
            connection = null;
          };
          resolve(r.result);
        };
      });
    return connection;
  }
  async function run(stores, mode, job) {
    const db = await open(),
      tx = db.transaction(stores, mode);
    const done = new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || Error("Storage write failed."));
      tx.onabort = () =>
        reject(tx.error || Error("Storage transaction aborted."));
    });
    try {
      const result = await job(tx);
      await done;
      return result;
    } catch (error) {
      try {
        tx.abort();
      } catch {}
      await done.catch(() => {});
      throw error;
    }
  }
  return {
    listProjects: () =>
      run(["projects"], "readonly", (tx) =>
        request(tx.objectStore("projects").getAll()),
      ),
    getProject: (id) =>
      run(["projects"], "readonly", async (tx) => {
        const p = await request(tx.objectStore("projects").get(id));
        if (!p) throw Error("Project not found.");
        return validateProject(p);
      }),
    async saveProject(value) {
      const p = validateProject(value);
      return run(["projects", "assets"], "readwrite", async (tx) => {
        for (const [slot, id] of Object.entries(p.assetRefs)) {
          if (!id) continue;
          const asset = await request(tx.objectStore("assets").get(id));
          if (!asset)
            throw Error(
              "A project asset is missing. Reassign it from the library.",
            );
          if (
            asset.kind !==
            getTemplate(p.templateId).assetSlots.find((s) => s.id === slot).type
          )
            throw Error("Wrong asset type for project slot.");
        }
        await request(tx.objectStore("projects").put(p));
        return p;
      });
    },
    deleteProject: (id) =>
      run(["projects"], "readwrite", (tx) =>
        request(tx.objectStore("projects").delete(id)),
      ),
    async putAsset(file, metadata = {}) {
      const model = isModelFile(file);
      if (
        !(file instanceof Blob) ||
        !file.size ||
        file.size > (model ? GLB_LIMIT : 8 * 1024 * 1024) ||
        (!model &&
          !["image/png", "image/jpeg", "image/webp"].includes(file.type))
      )
        throw Error(
          "Library supports PNG/JPEG/WebP up to 8 MB or self-contained GLB up to 20 MB.",
        );
      if (model) inspectGlb(await file.arrayBuffer());
      const asset = {
        id: crypto.randomUUID(),
        name: String(file.name || "Image").slice(0, 120),
        kind: model ? "model" : "image",
        type: model ? "model/gltf-binary" : file.type,
        size: file.size,
        createdAt: Date.now(),
        blob: file,
        ...(typeof metadata.sourceKey === "string"
          ? { sourceKey: metadata.sourceKey.slice(0, 160) }
          : {}),
        ...(typeof metadata.attribution === "string"
          ? { attribution: metadata.attribution.slice(0, 1500) }
          : {}),
      };
      await run(["assets"], "readwrite", (tx) =>
        request(tx.objectStore("assets").put(asset)),
      );
      return asset;
    },
    listAssets: () =>
      run(["assets"], "readonly", async (tx) =>
        (await request(tx.objectStore("assets").getAll())).map(
          ({ blob, ...meta }) => meta,
        ),
      ),
    getAsset: (id) =>
      run(["assets"], "readonly", async (tx) => {
        const a = await request(tx.objectStore("assets").get(id));
        if (!a) throw Error("Asset not found.");
        return a;
      }),
    deleteAsset: (id) =>
      run(["projects", "assets"], "readwrite", async (tx) => {
        const projects = await request(tx.objectStore("projects").getAll());
        if (projects.some((p) => Object.values(p.assetRefs || {}).includes(id)))
          throw Error(
            "Asset is used by a saved project. Remove its assignment and save that project first.",
          );
        await request(tx.objectStore("assets").delete(id));
      }),
    async close() {
      if (connection) (await connection).close();
      connection = null;
    },
  };
}
