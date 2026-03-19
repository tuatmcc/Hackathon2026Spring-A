// ============================================================
// PlayPage — Controller (design-only changes)
// ============================================================

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { SKILL_DATA } from "../config/skills";
import { usePlayStore } from "../stores/playStore";
import { useGameStore } from "../stores/gameStore";
import { NetworkEditor } from "../components/NetworkEditor";
import { TrainingPanel } from "../components/TrainingPanel";
import { DataVisualization } from "../components/DataVisualization";
import { STAGE_DATA } from "../config/stages";
import { StageClearPopup, StageIntroPopup } from "../components/GameOverlays";
import { formatStageTarget } from "../stageUtils";

const skillNameById = new Map(SKILL_DATA.map((skill) => [skill.id, skill.name]));

export function PlayPage() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onReconnect,
    trainingStatus,
    pendingStageClearId,
    pendingStageClearRewardPoints,
    dismissStageClearPopup,
    lastTrainingResult,
    trainingErrorMessage,
    syncStageTrainingSettings,
  } = usePlayStore();

  const {
    currentStageIndex,
    seenStageIntroIds,
    markStageIntroSeen,
    setPage,
    unlockedSkills,
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
  const recommendedLayerLabel = stage?.recommendedLayerTypes
    ?.map((layerType) => skillNameById.get(layerType) ?? layerType)
    .join(" + ");
  const failureMessage =
    trainingErrorMessage ??
    (stage?.taskType === "regression"
      ? "Loss did not meet the target. Try adjusting your network and learning rate."
      : "Accuracy did not meet the target. Try adjusting your network.");

  useEffect(() => {
    if (!stage || pendingStageClearId) {
      return;
    }

    syncStageTrainingSettings(stage, unlockedSkills);
  }, [pendingStageClearId, stage, syncStageTrainingSettings, unlockedSkills]);

  // Track whether popup was dismissed with X (so we show floating button)
  const [popupDismissed, setPopupDismissed] = useState(false);

  const hasNextStage = clearedStage
    ? STAGE_DATA.findIndex((item) => item.id === clearedStage.id) < STAGE_DATA.length - 1
    : false;

  const handleCloseIntro = () => {
    if (!activeIntroStage) return;
    markStageIntroSeen(activeIntroStage.id);
  };

  // "Next Stage" / "Keep Playing" button in popup
  const handleCloseClearPopup = () => {
    setPopupDismissed(false);
    dismissStageClearPopup();
  };

  // X button: dismiss popup but keep clear state so we show floating button
  const handleDismissClearPopup = () => {
    setPopupDismissed(true);
    dismissStageClearPopup();
  };

  const handleOpenSkillTree = () => {
    setPopupDismissed(false);
    dismissStageClearPopup();
    setPage("skillTree");
  };

  // Floating button: acts like "Next Stage" / "Keep Playing"
  const handleFloatingAction = () => {
    setPopupDismissed(false);
  };

  // Show floating button when popup was dismissed with X and stage is completed
  const showFloatingButton = popupDismissed && trainingStatus === "completed";

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
          onReconnect={onReconnect}
          stage={stage}
        />
      </div>

      {/* Right Pane: Monitor */}
      <div style={rightPaneStyle}>
        {/* Top row: stage info bar */}
        {stage && (
          <div style={stageInfoStyle}>
            <div style={stageInfoLeftStyle}>
              <span style={stageEyebrowStyle}>Mission</span>
              <strong style={stageNameStyle}>{stage.name}</strong>
              {recommendedLayerLabel && (
                <span style={stageMetaStyle}>({recommendedLayerLabel})</span>
              )}
            </div>
            <div style={stageTargetStyle}>
              {formatStageTarget(stage)}
            </div>
          </div>
        )}

        {/* Main content: viz + training side by side */}
        <div style={rightContentStyle}>
          <div style={vizColumnStyle}>
            <DataVisualization />
          </div>
          <div style={controlColumnStyle}>
            <TrainingPanel />
            {trainingStatus === "failed" && (
              <div style={failureStyle}>
                {failureMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating "Next Stage" button after popup dismissed */}
      {showFloatingButton && (
        <div style={floatingButtonContainerStyle}>
          <button style={floatingNextButtonStyle} onClick={handleFloatingAction}>
            {hasNextStage ? "Next Stage" : "Keep Playing"}
          </button>
          <button style={floatingSkillTreeButtonStyle} onClick={handleOpenSkillTree}>
            Skill Tree
          </button>
        </div>
      )}

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
          hasNextStage={hasNextStage}
          totalStages={STAGE_DATA.length}
          rewardPoints={pendingStageClearRewardPoints}
          result={lastTrainingResult}
          onClose={handleCloseClearPopup}
          onDismiss={handleDismissClearPopup}
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
  overflow: "hidden",
  background: "var(--bg-surface)",
  borderLeft: "2px solid var(--brass)",
  minWidth: 0,
};

const stageInfoStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "6px 12px",
  borderBottom: "2px solid var(--border)",
  background: "linear-gradient(180deg, rgba(181, 137, 33, 0.06), transparent)",
  flexShrink: 0,
};

const stageInfoLeftStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};

const stageEyebrowStyle: CSSProperties = {
  fontSize: 8,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "var(--brass)",
  whiteSpace: "nowrap",
};

const stageNameStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "var(--text-h)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const stageTargetStyle: CSSProperties = {
  padding: "3px 8px",
  fontSize: 10,
  fontWeight: 700,
  color: "var(--brass)",
  background: "rgba(181, 137, 33, 0.08)",
  border: "1px solid var(--accent-border)",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const stageMetaStyle: CSSProperties = {
  fontSize: 9,
  color: "var(--text-muted)",
  whiteSpace: "nowrap",
};

const rightContentStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "row",
  minHeight: 0,
  overflow: "hidden",
};

const vizColumnStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  borderRight: "1px solid var(--border)",
};

const controlColumnStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  minHeight: 0,
  overflow: "auto",
};

const failureStyle: CSSProperties = {
  padding: "8px 12px",
  color: "#d44",
  fontSize: 11,
  fontWeight: 700,
  borderTop: "1px solid rgba(221, 68, 68, 0.2)",
  background: "rgba(221, 68, 68, 0.05)",
  flexShrink: 0,
};

const floatingButtonContainerStyle: CSSProperties = {
  position: "absolute",
  bottom: 24,
  right: 24,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  zIndex: 50,
  animation: "fade-in 0.3s ease",
};

const floatingNextButtonStyle: CSSProperties = {
  padding: "14px 28px",
  border: "none",
  background: "var(--brass)",
  color: "#000",
  fontSize: 13,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  cursor: "pointer",
  boxShadow: "4px 4px 0 rgba(0,0,0,0.4), 0 0 20px rgba(181, 137, 33, 0.25)",
  transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
};

const floatingSkillTreeButtonStyle: CSSProperties = {
  padding: "10px 28px",
  border: "2px solid var(--brass)",
  background: "rgba(0, 0, 0, 0.85)",
  color: "var(--brass)",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  cursor: "pointer",
  boxShadow: "3px 3px 0 rgba(0,0,0,0.4)",
  transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
  backdropFilter: "blur(4px)",
};
