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

export function PlayPage() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    trainingStatus,
  } = usePlayStore();

  const { currentStageIndex } = useGameStore();
  const stage = STAGE_DATA[currentStageIndex];

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
              Target Accuracy: {(stage.targetAccuracy * 100).toFixed(0)}%
            </p>
          </div>
        )}

        <DataVisualization />

        <TrainingPanel />

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