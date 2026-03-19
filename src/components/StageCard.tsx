// ============================================================
// StageCard — ステージ選択画面の1枚のカード
// ============================================================

import type { StageDef } from "../types";

interface Props {
  stage: StageDef;
  index: number;
  isCurrent: boolean;
  isCleared: boolean;
  onSelect: (index: number) => void;
}

export function StageCard({
  stage,
  index,
  isCurrent,
  isCleared,
  onSelect,
}: Props) {
  return (
    <div
      style={{
        border: "1px solid",
        borderColor: isCurrent ? "#2196f3" : isCleared ? "#4caf50" : "#666",
        borderRadius: 8,
        padding: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: isCleared ? "#e8f5e9" : isCurrent ? "#e3f2fd" : "transparent",
      }}
    >
      <div>
        <strong>
          {stage.name} {isCleared && "(Cleared)"} {isCurrent && " <-"}
        </strong>
        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
          {stage.description}
        </div>
        <div style={{ fontSize: 11, marginTop: 4 }}>
          Target Accuracy: {(stage.targetAccuracy * 100).toFixed(0)}% | Reward:{" "}
          {stage.rewardPoints}pt
        </div>
      </div>
      <button onClick={() => onSelect(index)}>
        {isCurrent ? "Restart" : "Play"}
      </button>
    </div>
  );
}
