import type { LayerNodeData } from "./types";

export const DENSE_BASE_UNIT_OPTIONS = [1, 2] as const;
export const MAX_DENSE_UNITS = 12;
export const CONV_FILTER_OPTIONS = [4, 8, 12, 16, 24, 32] as const;

export const DENSE_WIDTH_SKILL_OPTIONS = [
  { skillId: "dense_width_cap_4", value: 4 },
  { skillId: "dense_width_cap_6", value: 6 },
  { skillId: "dense_width_cap_8", value: 8 },
  { skillId: "dense_width_cap_10", value: 10 },
  { skillId: "dense_width_cap_12", value: 12 },
] as const;

const legacyDenseWidthSkillOptions = [
  { skillId: "dense_width_8", value: 8 },
  { skillId: "dense_width_16", value: 16 },
  { skillId: "dense_width_24", value: 24 },
  { skillId: "dense_width_32", value: 32 },
  { skillId: "dense_width_64", value: 64 },
  { skillId: "dense_width_128", value: 128 },
  { skillId: "dense_width_256", value: 256 },
] as const;

const layerNodeSkillIds = new Set(["dense", "conv2d", "flatten"]);

export function isLayerNodeSkill(skillId: string) {
  return layerNodeSkillIds.has(skillId);
}

export function getDenseUnitCap(unlockedSkills: string[]) {
  let maxUnits: number = DENSE_BASE_UNIT_OPTIONS[DENSE_BASE_UNIT_OPTIONS.length - 1] ?? 1;

  for (const { skillId, value } of DENSE_WIDTH_SKILL_OPTIONS) {
    if (unlockedSkills.includes(skillId)) {
      maxUnits = Math.max(maxUnits, value);
    }
  }

  for (const { skillId, value } of legacyDenseWidthSkillOptions) {
    if (unlockedSkills.includes(skillId)) {
      maxUnits = Math.max(maxUnits, Math.min(value, MAX_DENSE_UNITS));
    }
  }

  return Math.min(maxUnits, MAX_DENSE_UNITS);
}

export function getDenseUnitOptions(unlockedSkills: string[]) {
  const maxUnits = getDenseUnitCap(unlockedSkills);
  return Array.from({ length: maxUnits }, (_, index) => index + 1);
}

export function getLayerSizeOptions(layerType: string, unlockedSkills: string[]) {
  if (layerType === "dense") {
    return getDenseUnitOptions(unlockedSkills);
  }

  if (layerType === "conv2d") {
    return [...CONV_FILTER_OPTIONS];
  }

  return [...DENSE_BASE_UNIT_OPTIONS];
}

export function getDefaultLayerSize(layerType: string) {
  return layerType === "conv2d" ? 8 : 2;
}

export function clampDenseUnits(value: number, maxUnits = MAX_DENSE_UNITS) {
  const min = DENSE_BASE_UNIT_OPTIONS[0] ?? 1;
  const fallback = Math.min(
    DENSE_BASE_UNIT_OPTIONS[DENSE_BASE_UNIT_OPTIONS.length - 1] ?? min,
    maxUnits,
  );
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(Math.round(value), maxUnits));
}

export function sanitizeLayerNodeData(
  data: LayerNodeData,
  unlockedSkills?: string[],
): LayerNodeData {
  if (data.layerType !== "dense") {
    return data;
  }

  const maxUnits =
    unlockedSkills == null ? MAX_DENSE_UNITS : getDenseUnitCap(unlockedSkills);

  return {
    ...data,
    units: clampDenseUnits(data.units, maxUnits),
  };
}
