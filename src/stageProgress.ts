import type { StageDef } from "./types";

export function getUnlockedStageCount(
  stages: StageDef[],
  clearedStageIds: string[],
) {
  if (stages.length === 0) {
    return 0;
  }

  const clearedStageIdSet = new Set(clearedStageIds);
  let unlockedStageCount = 1;

  for (let i = 0; i < stages.length - 1; i += 1) {
    if (!clearedStageIdSet.has(stages[i].id)) {
      break;
    }

    unlockedStageCount = i + 2;
  }

  return unlockedStageCount;
}

export function isStageUnlocked(
  stages: StageDef[],
  clearedStageIds: string[],
  index: number,
) {
  return index >= 0 && index < getUnlockedStageCount(stages, clearedStageIds);
}
