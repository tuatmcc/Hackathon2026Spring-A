// ============================================================
// StageCard — Steampunk-themed stage card for menu
// ============================================================

import type { CSSProperties } from "react";
import type { StageDef } from "../types";
import { formatStageTarget } from "../stageUtils";

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
    <div style={cardStyle(isCurrent, isCleared)}>
      <div style={{ textAlign: "left", flex: 1 }}>
        <strong style={nameStyle()}>
          {stage.name}
          {isCleared && <span style={clearedBadgeStyle}> Cleared</span>}
          {isCurrent && <span style={currentBadgeStyle}> Current</span>}
        </strong>
        <div style={descStyle}>{stage.description}</div>
        <div style={metaStyle}>
          {formatStageTarget(stage)} | Reward: {stage.rewardPoints}pt
        </div>
      </div>
      <button onClick={() => onSelect(index)} style={playButtonStyle(isCurrent)}>
        {isCurrent ? "Restart" : "Play"}
      </button>
    </div>
  );
}

function cardStyle(isCurrent: boolean, isCleared: boolean): CSSProperties {
  return {
    border: "2px solid",
    borderColor: isCurrent ? "var(--brass)" : isCleared ? "#3fb950" : "var(--border)",
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    background: isCurrent
      ? "rgba(181, 137, 33, 0.06)"
      : isCleared
        ? "rgba(63, 185, 80, 0.04)"
        : "transparent",
    transition: "all 0.15s",
  };
}

function nameStyle(): CSSProperties {
  return {
    fontSize: 13,
    color: "var(--text-h)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
}

const clearedBadgeStyle: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  color: "#3fb950",
  marginLeft: 6,
  padding: "2px 6px",
  border: "1px solid rgba(63, 185, 80, 0.3)",
  background: "rgba(63, 185, 80, 0.08)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  verticalAlign: "middle",
};

const currentBadgeStyle: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  color: "var(--brass)",
  marginLeft: 6,
  padding: "2px 6px",
  border: "1px solid var(--accent-border)",
  background: "rgba(181, 137, 33, 0.08)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  verticalAlign: "middle",
};

const descStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--text)",
  marginTop: 4,
  lineHeight: 1.4,
};

const metaStyle: CSSProperties = {
  fontSize: 10,
  marginTop: 4,
  color: "var(--copper)",
  fontWeight: 700,
};

function playButtonStyle(isCurrent: boolean): CSSProperties {
  return {
    padding: "8px 16px",
    border: isCurrent ? "2px solid var(--brass)" : "2px solid var(--border)",
    background: isCurrent ? "var(--brass)" : "transparent",
    color: isCurrent ? "#000" : "var(--text-h)",
    fontWeight: 800,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.1s",
  };
}
