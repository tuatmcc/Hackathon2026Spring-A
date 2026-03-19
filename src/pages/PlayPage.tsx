// ============================================================
// PlayPage — コントローラ
//
// UI と ML をつなぐ唯一の場所。
// 1. nodes/edges からモデルを構築 (ml/buildModel)
// 2. データを生成 (ml/datasets)
// 3. 学習を実行 (ml/trainer)
// 4. 結果を判定して gameStore を更新
// ============================================================

import { usePlayStore } from "../stores/playStore";
import { useGameStore } from "../stores/gameStore";
import { NetworkEditor } from "../components/NetworkEditor";
import { TrainingPanel } from "../components/TrainingPanel";
import { DataVisualization } from "../components/DataVisualization";
import { STAGE_DATA } from "../config/stages";
import { buildModel } from "../ml/buildModel";
import { getDatasetGenerator } from "../ml/datasets";
import { trainModel } from "../ml/trainer";
import type { LayerNodeData } from "../types";

export function PlayPage() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    trainingStatus,
    metrics,
    selectedOptimizer,
    learningRate,
    batchSize,
    epochs,
    setTrainingStatus,
    addMetrics,
    // resetPlay, // TODO: ステージ切替時にリセットする
  } = usePlayStore();

  const { currentStageIndex, addPoints, clearStage } = useGameStore();
  const stage = STAGE_DATA[currentStageIndex];

  const handleStartTraining = async () => {
    if (!stage) return;

    // メトリクスだけリセット（グラフは維持）
    setTrainingStatus("training");

    try {
      // 1. nodes → LayerNodeData[] に変換（TODO: トポロジカルソート）
      const layers: LayerNodeData[] = nodes.map((n) => n.data);

      // 2. モデル構築
      const model = buildModel(layers, stage, selectedOptimizer, learningRate);

      // 3. データ生成
      const dataset = getDatasetGenerator(stage.datasetId)();

      // 4. 学習実行
      const result = await trainModel(model, dataset, {
        epochs,
        batchSize,
        onEpochEnd: (m) => addMetrics(m),
      });

      // 5. 結果判定
      const accuracy = result.finalAccuracy ?? 0;
      if (accuracy >= stage.targetAccuracy) {
        clearStage(stage.id);
        addPoints(stage.rewardPoints);
        setTrainingStatus("completed");
      } else {
        setTrainingStatus("failed");
      }
    } catch (e) {
      console.error("Training failed:", e);
      setTrainingStatus("failed");
    }
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
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
        {stage && (
          <div style={{ padding: 16 }}>
            <h3>{stage.name}</h3>
            <p style={{ fontSize: 13, color: "#666" }}>{stage.description}</p>
            <p style={{ fontSize: 12, color: "#888" }}>
              Target Accuracy: {(stage.targetAccuracy * 100).toFixed(0)}%
            </p>
          </div>
        )}

        <DataVisualization stage={stage ?? null} />

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
            Accuracy did not meet the target. Try adjusting your network.
          </div>
        )}
      </div>
    </div>
  );
}
