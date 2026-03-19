// ============================================================
// メイン画面 (構築・バトルフェーズ)
// 左: ネットワークエディタ、右上: データ可視化、右下: 学習パネル
// ============================================================

import { usePlayStore } from "../stores/playStore";
import { useGameStore } from "../stores/gameStore";
import { NetworkEditor } from "../components/NetworkEditor";
import { TrainingPanel } from "../components/TrainingPanel";
import { DataVisualization } from "../components/DataVisualization";
import { STAGE_DATA } from "../config/stages";
import { buildModelFromGraph } from "../ml/graphToModel";
import { getDatasetGenerator } from "../ml/datasets";
import { trainModel } from "../ml/trainer";

export function PlayPage() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    trainingStatus,
    metrics,
    currentStageId,
    setTrainingStatus,
    addMetrics,
  } = usePlayStore();

  const { addPoints, clearStage, setPage } = useGameStore();

  const stage = STAGE_DATA.find((s) => s.id === currentStageId);

  const handleStartTraining = async () => {
    if (!stage) return;
    setTrainingStatus("training");
    try {
      const model = buildModelFromGraph(nodes, edges);
      const dataset = getDatasetGenerator(stage.datasetId)();
      const finalLoss = await trainModel(model, dataset, {
        epochs: 50,
        learningRate: 0.1,
        onEpochEnd: (m) => addMetrics(m),
      });
      if (finalLoss <= stage.targetLoss) {
        clearStage(stage.id);
        addPoints(stage.rewardPoints);
        setTrainingStatus("completed");
      } else {
        setTrainingStatus("failed");
      }
    } catch {
      setTrainingStatus("failed");
    }
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 48px)" }}>
      {/* 左ペイン: ネットワークエディタ */}
      <div style={{ flex: 2, borderRight: "1px solid #ccc" }}>
        <NetworkEditor
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
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
        <div style={{ padding: 16 }}>
          <button onClick={() => setPage("stageSelect")}>
            &larr; Back to Stages
          </button>
          {stage && (
            <h3 style={{ marginTop: 8 }}>
              {stage.name}: {stage.description}
            </h3>
          )}
        </div>

        {/* 右上: データ可視化 */}
        <DataVisualization stageId={currentStageId} />

        {/* 右下: 学習パネル */}
        <TrainingPanel
          trainingStatus={trainingStatus}
          metrics={metrics}
          onStartTraining={handleStartTraining}
        />

        {trainingStatus === "completed" && (
          <div style={{ padding: 16, color: "#4caf50", fontWeight: "bold" }}>
            Stage Cleared! +{stage?.rewardPoints}pt
          </div>
        )}
        {trainingStatus === "failed" && (
          <div style={{ padding: 16, color: "#f44336" }}>
            Loss did not meet the target. Try adjusting your network.
          </div>
        )}
      </div>
    </div>
  );
}
