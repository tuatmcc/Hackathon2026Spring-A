// ============================================================
// 学習パネル (学習開始ボタン・ハイパーパラメータ調整)
// 実装担当者: 学習開始/停止、エポック数・学習率の調整UIを実装
// ============================================================

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
  const latestMetrics = metrics[metrics.length - 1];

  return (
    <div style={{ padding: 16 }}>
      <h3>Training</h3>

      {/* TODO: エポック数・学習率の入力フィールド */}
      <div style={{ marginBottom: 8 }}>
        <label>
          Epochs: <input type="number" defaultValue={50} disabled />
        </label>
        <label style={{ marginLeft: 8 }}>
          LR: <input type="number" defaultValue={0.1} step={0.01} disabled />
        </label>
      </div>

      <button
        onClick={onStartTraining}
        disabled={trainingStatus === "training"}
      >
        {trainingStatus === "training" ? "Training..." : "Start Training"}
      </button>

      {latestMetrics && (
        <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 12 }}>
          <div>Epoch: {latestMetrics.epoch}</div>
          <div>Loss: {latestMetrics.loss.toFixed(4)}</div>
          {latestMetrics.accuracy != null && (
            <div>Accuracy: {latestMetrics.accuracy.toFixed(4)}</div>
          )}
        </div>
      )}

      {/* TODO: 学習曲線グラフ (Recharts / Chart.js) をここに配置 */}
      <div
        style={{
          marginTop: 16,
          height: 150,
          border: "1px dashed #888",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#888",
        }}
      >
        [Learning Curve Chart Placeholder]
      </div>
    </div>
  );
}
