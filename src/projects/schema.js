import {
  validateCharacter,
  defaultCharacter,
} from "../assets/character-settings.js";
import { getTemplate } from "../templates/registry.js";
import { brandDefaults } from "../branding.js";
import { defaults } from "../motion/engine.js";
export const SCHEMA_VERSION = 1;
export const defaultSettings = () => ({
  mode: "auto",
  difficulty: "normal",
  jumpInput: "hands",
  handsFree: true,
  thresholds: { ...defaults },
  character: defaultCharacter(),
});
export function validateProject(p) {
  if (!p || p.schemaVersion !== 1)
    throw Error("Unsupported project schema version.");
  const template = getTemplate(p.templateId);
  if (p.templateVersion !== template.version)
    throw Error("Unsupported template or template version.");
  for (const key of ["id", "name"])
    if (typeof p[key] !== "string" || !p[key].trim() || p[key].length > 100)
      throw Error(`Invalid project ${key}.`);
  const b = p.branding;
  if (!b || typeof b.title !== "string" || b.title.length > 60)
    throw Error("Invalid game title.");
  for (const key of ["primary", "accent", "background"])
    if (!/^#[a-f0-9]{6}$/i.test(b[key] || ""))
      throw Error("Invalid brand colour.");
  const s = p.settings;
  if (
    !s ||
    !["auto", "steps"].includes(s.mode) ||
    !["easy", "normal", "hard"].includes(s.difficulty) ||
    !["hands", "physical"].includes(s.jumpInput) ||
    typeof s.handsFree !== "boolean"
  )
    throw Error("Invalid template settings.");
  for (const [key, min, max] of [
    ["lean", 0.05, 0.4],
    ["squat", 0.1, 0.5],
    ["jump", 0.06, 0.3],
    ["swing", 1, 6],
    ["step", 0.08, 0.4],
  ])
    if (
      !Number.isFinite(s.thresholds?.[key]) ||
      s.thresholds[key] < min ||
      s.thresholds[key] > max
    )
      throw Error("Invalid motion sensitivity.");
  if (
    !p.assetRefs ||
    Object.keys(p.assetRefs).some(
      (k) => !template.assetSlots.some((slot) => slot.id === k),
    )
  )
    throw Error("Unsupported asset slot.");
  for (const ref of Object.values(p.assetRefs))
    if (ref !== null && (typeof ref !== "string" || !ref))
      throw Error("Invalid asset reference.");
  // Copy a whitelist, never carry arbitrary persisted keys/executable behaviour.
  return {
    schemaVersion: 1,
    id: p.id,
    name: p.name.trim(),
    templateId: p.templateId,
    templateVersion: 1,
    branding: {
      title: b.title,
      primary: b.primary,
      accent: b.accent,
      background: b.background,
    },
    settings: {
      mode: s.mode,
      difficulty: s.difficulty,
      jumpInput: s.jumpInput,
      handsFree: s.handsFree,
      character: validateCharacter(s.character),
      thresholds: Object.fromEntries(
        Object.keys(defaults).map((k) => [k, s.thresholds[k]]),
      ),
    },
    assetRefs: {
      logo: p.assetRefs.logo ?? null,
      background: p.assetRefs.background ?? null,
      character: p.assetRefs.character ?? null,
    },
    updatedAt: Number.isFinite(p.updatedAt) ? p.updatedAt : Date.now(),
  };
}
export function newProject(name = "Untitled client project") {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name,
    templateId: "runner",
    templateVersion: 1,
    branding: { ...brandDefaults },
    settings: defaultSettings(),
    assetRefs: { logo: null, background: null, character: null },
    updatedAt: Date.now(),
  };
}
