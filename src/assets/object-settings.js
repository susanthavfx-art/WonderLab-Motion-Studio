import { SEGMENT_COUNT, SCATTER_POOL } from "./endless.js";
export const OBJECT_SLOTS = Object.freeze({
  environment: {
    label: "Static environment / scenery",
    fit: [40, 12, 60],
    anchor: [0, 0, -22],
    floor: true,
    count: 1,
  },
  road: {
    label: "Endless road segment",
    fit: [8, 1, 24],
    anchor: [0, 0, 0],
    floor: true,
    count: SEGMENT_COUNT,
  },
  tree: {
    label: "Endless trees",
    fit: [2.4, 4, 2.4],
    anchor: [0, 0, 0],
    floor: true,
    count: SCATTER_POOL,
  },
  rock: {
    label: "Endless rocks",
    fit: [1.5, 1.2, 1.5],
    anchor: [0, 0, 0],
    floor: true,
    count: SCATTER_POOL,
  },
  bush: {
    label: "Endless bushes",
    fit: [2, 1.2, 2],
    anchor: [0, 0, 0],
    floor: true,
    count: SCATTER_POOL,
  },
  log: {
    label: "Endless logs & stumps",
    fit: [2.4, 1.2, 1.8],
    anchor: [0, 0, 0],
    floor: true,
    count: SCATTER_POOL,
  },
  jumpObstacle: {
    label: "Jump obstacle",
    fit: [1.35, 0.8, 0.8],
    anchor: [0, 0.4, 0],
    count: 5,
  },
  duckObstacle: {
    label: "Duck obstacle (overhead bar)",
    fit: [1.8, 0.25, 0.6],
    anchor: [0, 1.55, 0],
    count: 5,
  },
  collectible: {
    label: "Collectible",
    fit: [0.42, 0.42, 0.18],
    anchor: [0, 1, 0],
    count: 5,
  },
});
export const OBJECT_KEYS = Object.keys(OBJECT_SLOTS);
export const defaultTransform = () => ({
  scale: 1,
  rotation: { x: 0, y: 0, z: 0 },
  offset: { x: 0, y: 0, z: 0 },
});
export const defaultObjects = () =>
  Object.fromEntries(OBJECT_KEYS.map((k) => [k, defaultTransform()]));
export function validateTransform(t = defaultTransform()) {
  if (!t || !Number.isFinite(t.scale) || t.scale < 0.1 || t.scale > 5)
    throw Error("Object size must be 0.1–5.");
  const out = { scale: t.scale, rotation: {}, offset: {} };
  for (const [key, limit] of [
    ["rotation", 180],
    ["offset", 50],
  ])
    for (const axis of ["x", "y", "z"]) {
      const v = t[key]?.[axis];
      if (!Number.isFinite(v) || Math.abs(v) > limit)
        throw Error(`Object ${key} must be finite and within ±${limit}.`);
      out[key][axis] = v;
    }
  return out;
}
export function validateObjects(value) {
  if (value === undefined) return defaultObjects();
  if (!value || Object.keys(value).some((k) => !OBJECT_KEYS.includes(k)))
    throw Error("Unknown 3D object slot.");
  return Object.fromEntries(
    OBJECT_KEYS.map((k) => [k, validateTransform(value[k])]),
  );
}
