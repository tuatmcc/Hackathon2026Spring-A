// ============================================================
// TrainingPanel — 学習条件の設定 + 学習開始 + メトリクス表示
//
// 【担当者へ】
// optimizer の選択肢は unlockedSkills でフィルタ。
// 学習曲線グラフは TODO (Recharts / Chart.js 等)。
// ============================================================

import { SKILL_DATA } from "../config/skills";
import { useGameStore } from "../stores/gameStore";
import { usePlayStore } from "../stores/playStore";
import type { TrainingStatus, TrainingMetrics } from "../types";

interface Props {
  trainingStatus: TrainingStatus;
  metrics: TrainingMetrics[];
  onStartTraining: () => void;
}

export function TrainingPanel({
  trainingStatus,
  metrics,
  onStartTraining,
}: Props) {
  const unlockedSkills = useGameStore((s) => s.unlockedSkills);
  const {
    selectedOptimizer,
    setSelectedOptimizer,
    learningRate,
    setLearningRate,
    batchSize,
    setBatchSize,
    epochs,
    setEpochs,
  } = usePlayStore();

  const availableOptimizers = SKILL_DATA.filter(
    (s) => s.treeId === "optimizer" && unlockedSkills.includes(s.id),
  );

  const latestMetrics = metrics[metrics.length - 1];

  return (
    <div style={{ padding: 16 }}>
      <h3>Training</h3>

      {/* 学習条件 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <label>
          Optimizer:{" "}
          <select
            value={selectedOptimizer}
            onChange={(e) => setSelectedOptimizer(e.target.value)}
            disabled={trainingStatus === "training"}
          >
            {availableOptimizers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          LR:{" "}
          <input
            type="number"
            value={learningRate}
            min={0.0001}
            step={0.01}
            onChange={(e) => setLearningRate(Number(e.target.value))}
            disabled={trainingStatus === "training"}
            style={{ width: 70 }}
          />
        </label>
        <label>
          Batch:{" "}
          <input
            type="number"
            value={batchSize}
            min={1}
            onChange={(e) => setBatchSize(Number(e.target.value))}
            disabled={trainingStatus === "training"}
            style={{ width: 60 }}
          />
        </label>
        <label>
          Epochs:{" "}
          <input
            type="number"
            value={epochs}
            min={1}
            onChange={(e) => setEpochs(Number(e.target.value))}
            disabled={trainingStatus === "training"}
            style={{ width: 60 }}
          />
        </label>
      </div>

      <button
        onClick={onStartTraining}
        disabled={trainingStatus === "training"}
      >
        {trainingStatus === "training" ? "Training..." : "Start Training"}
      </button>

      {/* メトリクス表示 */}
      {latestMetrics && (
        <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 12 }}>
          <div>Epoch: {latestMetrics.epoch}</div>
          <div>Loss: {latestMetrics.loss.toFixed(4)}</div>
          {latestMetrics.valLoss != null && (
            <div>Val Loss: {latestMetrics.valLoss.toFixed(4)}</div>
          )}
          {latestMetrics.accuracy != null && (
            <div>Accuracy: {latestMetrics.accuracy.toFixed(4)}</div>
          )}
          {latestMetrics.valAccuracy != null && (
            <div>Val Accuracy: {latestMetrics.valAccuracy.toFixed(4)}</div>
          )}
        </div>
      )}

      {/* TODO: 学習曲線グラフ (Recharts / Chart.js) */}
      <div
        style={{
          marginTop: 16,
          height: 120,
          border: "1px dashed #888",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#888",
          fontSize: 12,
        }}
      >
        [Learning Curve Chart — TODO]
      </div>
    </div>
  );
}
