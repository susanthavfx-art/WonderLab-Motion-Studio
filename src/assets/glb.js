import { LoadingManager, Box3, Vector3 } from "three";
export const GLB_LIMIT = 20 * 1024 * 1024;
export const isModelFile = (file) =>
  /\.glb$/i.test(file.name || "") || file.type === "model/gltf-binary";
export function inspectGlb(buffer) {
  if (
    !(buffer instanceof ArrayBuffer) ||
    buffer.byteLength < 24 ||
    buffer.byteLength > GLB_LIMIT
  )
    throw Error("Choose a non-empty GLB up to 20 MB.");
  const v = new DataView(buffer);
  if (
    v.getUint32(0, true) !== 0x46546c67 ||
    v.getUint32(4, true) !== 2 ||
    v.getUint32(8, true) !== buffer.byteLength
  )
    throw Error("Invalid GLB 2.0 header or file length.");
  let offset = 12,
    json,
    bin = false;
  while (offset < buffer.byteLength) {
    if (offset + 8 > buffer.byteLength) throw Error("Truncated GLB chunk.");
    const size = v.getUint32(offset, true),
      type = v.getUint32(offset + 4, true);
    offset += 8;
    if (size % 4 || offset + size > buffer.byteLength)
      throw Error("Invalid GLB chunk length.");
    if (type === 0x4e4f534a) {
      if (json || offset !== 20 || size > 1024 * 1024)
        throw Error("Invalid or oversized GLB JSON.");
      try {
        json = JSON.parse(
          new TextDecoder().decode(new Uint8Array(buffer, offset, size)),
        );
      } catch {
        throw Error("Invalid GLB JSON.");
      }
    } else if (type === 0x004e4942) {
      if (!json || bin) throw Error("Invalid GLB binary chunk.");
      bin = true;
    } else throw Error("Unsupported GLB chunk.");
    offset += size;
  }
  if (!json || json.asset?.version !== "2.0")
    throw Error("GLB must use glTF 2.0.");
  // No sidecar files, remote URLs, data URIs, or extension-provided network resources.
  function checkUris(value) {
    if (!value || typeof value !== "object") return;
    for (const [k, x] of Object.entries(value)) {
      if (k === "uri")
        throw Error(
          "Use a self-contained GLB with embedded buffer-view textures, not external/data URI resources.",
        );
      checkUris(x);
    }
  }
  checkUris(json);
  const supported = [
    "KHR_materials_unlit",
    "KHR_materials_emissive_strength",
    "KHR_materials_ior",
    "KHR_materials_specular",
    "KHR_texture_transform",
  ];
  for (const ext of [
    ...(json.extensionsUsed || []),
    ...(json.extensionsRequired || []),
  ])
    if (!supported.includes(ext))
      throw Error(
        `Unsupported GLB extension: ${ext}. Export without Draco, Meshopt or KTX compression.`,
      );
  for (const [key, max] of [
    ["nodes", 256],
    ["meshes", 128],
    ["materials", 128],
    ["textures", 16],
    ["images", 16],
    ["animations", 64],
    ["accessors", 1024],
  ])
    if (!Array.isArray(json[key] || []) || (json[key] || []).length > max)
      throw Error(`GLB exceeds ${key} limit (${max}).`);
  if ((json.buffers || []).length > 1 || ((json.buffers || []).length && !bin))
    throw Error("GLB requires one embedded binary buffer.");
  let elements = 0;
  for (const a of json.accessors || []) {
    if (
      !Number.isInteger(a.count) ||
      a.count < 0 ||
      a.count > 1000000 ||
      a.sparse
    )
      throw Error("Unsupported or excessive GLB accessor.");
    elements += a.count;
  }
  if (elements > 2000000) throw Error("GLB is too complex (accessor budget).");
  if (
    (json.meshes || []).reduce((n, m) => n + (m.primitives?.length || 0), 0) >
    128
  )
    throw Error("GLB exceeds 128 mesh primitives.");
  for (const skin of json.skins || [])
    if (!skin.joints?.length || skin.joints.length > 128)
      throw Error("GLB skeleton must have 1–128 joints.");
  for (const image of json.images || [])
    if (
      !Number.isInteger(image.bufferView) ||
      !["image/png", "image/jpeg", "image/webp"].includes(image.mimeType)
    )
      throw Error("Use embedded PNG/JPEG/WebP textures.");
  return json;
}
export function disposeModel(gltf) {
  if (!gltf) return;
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set(),
    skeletons = new Set();
  for (const scene of gltf.scenes || [gltf.scene])
    scene?.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.skeleton) skeletons.add(o.skeleton);
      for (const m of (Array.isArray(o.material)
        ? o.material
        : [o.material]
      ).filter(Boolean)) {
        materials.add(m);
        for (const t of Object.values(m)) if (t?.isTexture) textures.add(t);
      }
    });
  skeletons.forEach((s) => s.dispose());
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  const images = new Set();
  textures.forEach((t) => {
    if (t.source?.data) images.add(t.source.data);
    t.dispose();
  });
  images.forEach((i) => i.close?.());
}
export async function loadGlb(file, { allowFlat = false } = {}) {
  if (!file || file.size > GLB_LIMIT || !file.size)
    throw Error("Choose a non-empty GLB up to 20 MB.");
  const buffer = await file.arrayBuffer();
  inspectGlb(buffer);
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const manager = new LoadingManager();
  let resourceFailed = false;
  manager.onError = () => {
    resourceFailed = true;
  };
  manager.setURLModifier((url) => {
    if (!url.startsWith("blob:"))
      throw Error("External GLB resources are blocked.");
    return url;
  });
  const parsing = new GLTFLoader(manager).parseAsync(buffer, "");
  let timer,
    timedOut = false,
    gltf;
  try {
    gltf = await Promise.race([
      parsing,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          reject(Error("GLB decoding timed out. Try a smaller model."));
        }, 15000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    if (timedOut) parsing.then(disposeModel, () => {});
  }
  try {
    if (resourceFailed)
      throw Error(
        "A GLB texture could not be decoded. Re-export with embedded PNG/JPEG/WebP images.",
      );
    const bounds = new Box3().setFromObject(gltf.scene),
      size = bounds.getSize(new Vector3());
    if (
      bounds.isEmpty() ||
      ![
        ...size.toArray(),
        ...bounds.min.toArray(),
        ...bounds.max.toArray(),
      ].every(Number.isFinite) ||
      (allowFlat ? Math.max(size.x, size.y, size.z) : size.y) < 0.00001
    )
      throw Error("GLB has no visible, finite-height geometry.");
    gltf.scene.traverse((o) => {
      for (const m of (Array.isArray(o.material)
        ? o.material
        : [o.material]
      ).filter(Boolean))
        for (const t of Object.values(m))
          if (t?.isTexture) {
            const i = t.source?.data;
            if (
              i &&
              (i.width > 4096 ||
                i.height > 4096 ||
                i.width * i.height > 16000000)
            )
              throw Error("GLB textures must be at most 4096 px and 16 MP.");
          }
    });
    if (
      gltf.animations.some(
        (a) =>
          !Number.isFinite(a.duration) || a.duration <= 0 || a.duration > 300,
      )
    )
      throw Error(
        "Animation clips must be finite and between 0 and 300 seconds.",
      );
    for (const clip of gltf.animations)
      for (const track of clip.tracks) {
        if (
          !track.validate() ||
          ![...track.times, ...track.values].every(Number.isFinite)
        )
          throw Error("Invalid animation keyframes.");
      }
    return gltf;
  } catch (error) {
    disposeModel(gltf);
    throw error;
  }
}
