// ============================================================
// PlayPage — コントローラ
//
// UI と ML をつなぐ唯一の場所。
// 1. nodes/edges からモデルを構築 (ml/buildModel)
// 2. データを生成 (ml/datasets)
// 3. 学習を実行 (ml/trainer)
// 4. 結果を判定して gameStore を更新
// ============================================================

import { useEffect, useMemo } from "react";
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
    trainingStatus,
    pendingStageClearId,
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
    <div style={{ display: "flex", height: "100%", position: "relative" }}>
      {/* 左ペイン: ネットワークエディタ */}
      <div style={{ flex: 2, borderRight: "1px solid #ccc" }}>
        <NetworkEditor
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          stage={stage}
        />
      </div>

      {/* 右ペイン */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
        {stage && (
          <div style={{ padding: 16 }}>
            <h3>{stage.name}</h3>
            <p style={{ fontSize: 13, color: "#666" }}>{stage.description}</p>
            <p style={{ fontSize: 12, color: "#888" }}>
              {formatStageTarget(stage)}
            </p>
            {recommendedLayerLabel && (
              <p style={{ fontSize: 12, color: "#888" }}>
                Recommended Layers: {recommendedLayerLabel}
              </p>
            )}
          </div>
        )}

        <DataVisualization />

        <TrainingPanel />

        {trainingStatus === "failed" && (
          <div style={{ padding: 16, color: "#f44336" }}>
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
