// ============================================================
// PlayPage — Controller (design-only changes)
// ============================================================

import { useMemo } from "react";
import { usePlayStore } from "../stores/playStore";
import { useGameStore } from "../stores/gameStore";
import { NetworkEditor } from "../components/NetworkEditor";
import { TrainingPanel } from "../components/TrainingPanel";
import { DataVisualization } from "../components/DataVisualization";
import { STAGE_DATA } from "../config/stages";
import { StageClearPopup, StageIntroPopup } from "../components/GameOverlays";
import type { CSSProperties } from "react";

export function PlayPage() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    trainingStatus,
    pendingStageClearId,
    dismissStageClearPopup,
    lastTrainingResult,
  } = usePlayStore();

  const {
    currentStageIndex,
    seenStageIntroIds,
    markStageIntroSeen,
    setPage,
  } = useGameStore();
  const stage = STAGE_DATA[currentStageIndex];
  const clearedStage = useMemo(
    () => STAGE_DATA.find((item) => item.id === pendingStageClearId) ?? null,
    [pendingStageClearId],
  );
  const activeIntroStage = useMemo(
    () =>
      stage && !pendingStageClearId && !seenStageIntroIds.includes(stage.id)
        ? stage
        : null,
    [pendingStageClearId, seenStageIntroIds, stage],
  );
  const failureMessage =
    stage?.taskType === "regression"
      ? "Loss did not meet the target. Try adjusting your network and learning rate."
      : "Accuracy did not meet the target. Try adjusting your network.";

  const handleCloseIntro = () => {
    if (!activeIntroStage) return;
    markStageIntroSeen(activeIntroStage.id);
  };

  const handleCloseClearPopup = () => {
    dismissStageClearPopup();
  };

  const handleOpenSkillTree = () => {
    dismissStageClearPopup();
    setPage("skillTree");
  };

  return (
    <div style={rootStyle}>
      {/* Left Pane: Network Editor */}
      <div style={leftPaneStyle}>
        <NetworkEditor
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          stage={stage}
        />
      </div>

      {/* Right Pane: Monitor */}
      <div style={rightPaneStyle}>
        {stage && (
          <div style={stageInfoStyle}>
            <div style={stageEyebrowStyle}>Current Mission</div>
            <div style={stageNameStyle}>{stage.name}</div>
            <p style={stageDescStyle}>{stage.description}</p>
            <div style={stageTargetStyle}>
              Target: {stage.taskType === "regression"
                ? `Loss < ${stage.targetLoss?.toFixed(2)}`
                : `Accuracy > ${(stage.targetAccuracy * 100).toFixed(0)}%`}
            </div>
          </div>
        )}

        <DataVisualization />
        <TrainingPanel />

        {trainingStatus === "failed" && (
          <div style={failureStyle}>
            {failureMessage}
          </div>
        )}
      </div>

      {activeIntroStage && (
        <StageIntroPopup
          stage={activeIntroStage}
          stageNumber={STAGE_DATA.findIndex((item) => item.id === activeIntroStage.id) + 1}
          totalStages={STAGE_DATA.length}
          onClose={handleCloseIntro}
        />
      )}

      {clearedStage && (
        <StageClearPopup
          stage={clearedStage}
          hasNextStage={
            STAGE_DATA.findIndex((item) => item.id === clearedStage.id) <
            STAGE_DATA.length - 1
          }
          totalStages={STAGE_DATA.length}
          result={lastTrainingResult}
          onClose={handleCloseClearPopup}
          onOpenSkillTree={handleOpenSkillTree}
        />
      )}
    </div>
  );
}

const rootStyle: CSSProperties = {
  display: "flex",
  height: "100%",
  position: "relative",
};

const leftPaneStyle: CSSProperties = {
  flex: 2,
  borderRight: "6px solid var(--iron)",
};

const rightPaneStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
  background: "var(--bg-surface)",
  borderLeft: "2px solid var(--brass)",
};

const stageInfoStyle: CSSProperties = {
  padding: "16px 18px",
  borderBottom: "3px solid var(--border)",
  background: "linear-gradient(180deg, rgba(181, 137, 33, 0.06), transparent)",
};

const stageEyebrowStyle: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  color: "var(--brass)",
  marginBottom: 6,
};

const stageNameStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "var(--text-h)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const stageDescStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--text)",
  marginTop: 6,
  lineHeight: 1.5,
};

const stageTargetStyle: CSSProperties = {
  marginTop: 8,
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--brass)",
  background: "rgba(181, 137, 33, 0.08)",
  border: "1px solid var(--accent-border)",
  display: "inline-block",
};
const failureStyle: CSSProperties = {
  padding: 16,
  color: "#d44",
  fontSize: 12,
  fontWeight: 700,
  borderTop: "1px solid rgba(221, 68, 68, 0.2)",
  background: "rgba(221, 68, 68, 0.05)",
};
