export const brandDefaults = Object.freeze({
  title: "WONDER RUN",
  primary: "#d6f65c",
  accent: "#304d3d",
  background: "#dfe8db",
});
export const IMAGE_LIMITS = {
  logo: 2 * 1024 * 1024,
  background: 8 * 1024 * 1024,
};
export function normalizeBrand(value = {}) {
  const color = (key) =>
    /^#[0-9a-f]{6}$/i.test(value[key] || "") ? value[key] : brandDefaults[key];
  return {
    title:
      typeof value.title === "string"
        ? value.title.trim().slice(0, 60) || brandDefaults.title
        : brandDefaults.title,
    primary: color("primary"),
    accent: color("accent"),
    background: color("background"),
  };
}
export function readableInk(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((c) => parseInt(c, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179
    ? "#000000"
    : "#ffffff";
}
async function verifyRasterSignature(file) {
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const starts = (arr) => arr.every((v, i) => b[i] === v);
  const valid =
    file.type === "image/png"
      ? starts([137, 80, 78, 71, 13, 10, 26, 10])
      : file.type === "image/jpeg"
        ? starts([255, 216, 255])
        : starts([82, 73, 70, 70]) &&
          [87, 69, 66, 80].every((v, i) => b[i + 8] === v);
  if (!valid)
    throw Error(
      "Image contents do not match a supported PNG, JPEG or WebP file.",
    );
}
export function validateImageFile(file, slot) {
  if (!Object.hasOwn(IMAGE_LIMITS, slot)) throw Error("Unknown image slot.");
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw Error(
      "Choose a PNG, JPEG or WebP image. SVG and animated GIF are not supported.",
    );
  if (file.size <= 0 || file.size > IMAGE_LIMITS[slot])
    throw Error(
      `${slot === "logo" ? "Logo" : "Background"} must be under ${slot === "logo" ? 2 : 8} MB and not empty.`,
    );
}
// Atomic replacement: failed/outdated loads never replace a valid image. Each
// slot owns one object URL. Removal/reset/disposal also invalidate pending work.
export function createBrandAssets(onChange, onStatus) {
  const state = {
    logo: { url: null, generation: 0 },
    background: { url: null, generation: 0 },
  };
  async function load(file, slot) {
    validateImageFile(file, slot);
    const target = state[slot],
      generation = ++target.generation;
    let timer, url;
    try {
      await verifyRasterSignature(file);
      if (generation !== target.generation) return;
      url = URL.createObjectURL(file);
      const image = new Image();
      image.src = url;
      await Promise.race([
        image.decode(),
        new Promise(
          (_, reject) =>
            (timer = setTimeout(
              () => reject(Error("Image decoding timed out.")),
              10000,
            )),
        ),
      ]);
      if (
        image.naturalWidth > 4096 ||
        image.naturalHeight > 4096 ||
        image.naturalWidth * image.naturalHeight > 16000000
      )
        throw Error(
          "Image is too large. Resize to at most 4096 × 4096 and 16 megapixels.",
        );
      if (generation !== target.generation) {
        URL.revokeObjectURL(url);
        return;
      }
      const old = target.url;
      target.url = url;
      onChange(slot, url);
      if (old) URL.revokeObjectURL(old);
      onStatus(
        `${slot === "logo" ? "Logo" : "Background"} ready · ${file.name}`,
      );
    } catch (error) {
      if (url) URL.revokeObjectURL(url);
      if (generation === target.generation) throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  function remove(slot) {
    const target = state[slot];
    target.generation++;
    if (target.url) URL.revokeObjectURL(target.url);
    target.url = null;
    onChange(slot, null);
  }
  return {
    load,
    remove,
    dispose() {
      remove("logo");
      remove("background");
    },
  };
}
