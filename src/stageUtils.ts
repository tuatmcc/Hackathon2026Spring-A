import type { StageDef } from "./types";

interface StageResultLike {
  finalLoss: number;
  finalAccuracy?: number;
}

export function didStageClear(stage: StageDef, result: StageResultLike) {
  if (stage.taskType === "regression") {
    return result.finalLoss <= (stage.targetLoss ?? Infinity);
  }

  return (result.finalAccuracy ?? 0) >= stage.targetAccuracy;
}

export function getStageTargetLabel(stage: StageDef) {
  return stage.taskType === "regression"
    ? "Target Loss"
    : "Target Accuracy";
}

export function formatStageTargetValue(stage: StageDef) {
  if (stage.taskType === "regression") {
    return formatLoss(stage.targetLoss);
  }

  return `${(stage.targetAccuracy * 100).toFixed(0)}%`;
}

export function formatStageTarget(stage: StageDef) {
  return `${getStageTargetLabel(stage)}: ${formatStageTargetValue(stage)}`;
}

function formatLoss(value: number | undefined) {
  return value != null ? value.toFixed(4) : "--";
}
