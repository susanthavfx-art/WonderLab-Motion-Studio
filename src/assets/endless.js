export const SCATTER_KEYS = ["tree", "rock", "bush", "log"];
export const SEGMENT_COUNT = 8;
export const SCATTER_POOL = 32;
export const defaultEnvironment = () => ({
  mode: "static",
  length: 24,
  density: 1,
  clearance: 2,
  seed: 2026,
});
export function validateEnvironment(value = defaultEnvironment()) {
  if (
    !value ||
    !["static", "endless"].includes(value.mode) ||
    !Number.isFinite(value.length) ||
    value.length < 12 ||
    value.length > 40 ||
    ![1, 2].includes(value.density) ||
    !Number.isFinite(value.clearance) ||
    value.clearance < 0.5 ||
    value.clearance > 8 ||
    !Number.isInteger(value.seed) ||
    value.seed < 0 ||
    value.seed > 2147483647
  )
    throw Error(
      "Invalid environment mode, segment length, density, clearance or seed.",
    );
  return Object.fromEntries(
    Object.keys(defaultEnvironment()).map((k) => [k, value[k]]),
  );
}
function random(seed, chunk, side, index, salt) {
  let n =
    (seed ^
      Math.imul(chunk, 374761393) ^
      Math.imul(side + 2, 668265263) ^
      Math.imul(index + 1, 1274126177) ^
      salt) >>>
    0;
  n = Math.imul(n ^ (n >>> 16), 2246822507);
  n = Math.imul(n ^ (n >>> 13), 3266489909);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
// Stable chunk identity: scrolling does not reroll existing scenery or allocate GLB resources.
export function endlessLayout(distance, settings, available = SCATTER_KEYS) {
  const d = Number.isFinite(distance) ? Math.max(0, distance) : 0,
    chunk = Math.floor(d / settings.length),
    segments = [],
    props = [];
  for (let i = 0; i < SEGMENT_COUNT; i++) {
    const id = chunk + i - 1,
      z = d - id * settings.length;
    segments.push({ id, z });
    if (!available.length) continue;
    // Every assigned category appears in every chunk, not a random lottery
    // that can leave trees absent until beyond the fog. Identity is chunk-based.
    const placements = Math.max(2, available.length) * settings.density;
    const phase = Math.floor(
      random(settings.seed, id, 0, 0, 7) * available.length,
    );
    for (let j = 0; j < placements; j++) {
      const side = (j + id) % 2 === 0 ? -1 : 1;
      const rand = (salt) => random(settings.seed, id, side, j, salt);
      props.push({
        id: `${id}:${j}`,
        key: available[(j + phase) % available.length],
        side,
        x: side * (4 + settings.clearance + rand(19) * 1.5),
        z:
          z + ((j + 0.2 + rand(31) * 0.6) / placements - 0.5) * settings.length,
        rotation: rand(43) * Math.PI * 2,
        scale: 0.85 + rand(59) * 0.3,
      });
    }
  }
  return { segments, props };
}
