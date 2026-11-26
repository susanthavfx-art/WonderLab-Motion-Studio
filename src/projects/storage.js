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
        for (const id of Object.values(p.assetRefs).filter(Boolean))
          if (!(await request(tx.objectStore("assets").get(id))))
            throw Error(
              "A project asset is missing. Reassign it from the library.",
            );
        await request(tx.objectStore("projects").put(p));
        return p;
      });
    },
    deleteProject: (id) =>
      run(["projects"], "readwrite", (tx) =>
        request(tx.objectStore("projects").delete(id)),
      ),
    async putAsset(file) {
      if (
        !(file instanceof Blob) ||
        !file.size ||
        file.size > 8 * 1024 * 1024 ||
        !["image/png", "image/jpeg", "image/webp"].includes(file.type)
      )
        throw Error(
          "Library supports PNG/JPEG/WebP images up to 8 MB in this milestone.",
        );
      const asset = {
        id: crypto.randomUUID(),
        name: String(file.name || "Image").slice(0, 120),
        kind: "image",
        type: file.type,
        size: file.size,
        createdAt: Date.now(),
        blob: file,
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
