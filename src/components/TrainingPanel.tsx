// ============================================================
// TrainingPanel — 学習条件の設定 + 学習開始 + メトリクス表示
//
// 【担当者へ】
// optimizer の選択肢は unlockedSkills でフィルタ。
// 学習曲線グラフは TODO (Recharts / Chart.js 等)。
// ============================================================

import type { CSSProperties } from "react";
import { STAGE_DATA } from "../config/stages";
import { SKILL_DATA } from "../config/skills";
import { useGameStore } from "../stores/gameStore";
import { usePlayStore } from "../stores/playStore";
import type { TrainingMetrics, TrainingStatus } from "../types";

const CHART_WIDTH = 100;
const CHART_HEIGHT = 56;
const TRAIN_LINE_COLOR = "#6b6375";
const VALIDATION_LINE_COLOR = "var(--accent)";
const TARGET_LINE_COLOR = "#4caf50";

export function TrainingPanel() {
  const currentStageIndex = useGameStore((s) => s.currentStageIndex);
  const unlockedSkills = useGameStore((s) => s.unlockedSkills);
  const stage = STAGE_DATA[currentStageIndex];
  const targetAccuracy = stage?.targetAccuracy;
  const {
    selectedOptimizer,
    setSelectedOptimizer,
    learningRate,
    setLearningRate,
    batchSize,
    setBatchSize,
    epochs,
    setEpochs,
    trainingStatus,
    metrics,
    startTraining,
  } = usePlayStore();

  const availableOptimizers = SKILL_DATA.filter(
    (s) => s.treeId === "optimizer" && unlockedSkills.includes(s.id),
  );
  const latestMetrics = metrics[metrics.length - 1];

  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>Training</div>
          <strong>Optimizer & Progress</strong>
        </div>
        <div style={statusPill(trainingStatus)}>{statusLabel(trainingStatus)}</div>
      </div>

      <div style={controlsGridStyle}>
        <label style={controlStyle}>
          <span style={controlLabelStyle}>Optimizer</span>
          <select
            value={selectedOptimizer}
            onChange={(e) => setSelectedOptimizer(e.target.value)}
            disabled={trainingStatus === "training"}
            style={inputStyle}
          >
            {availableOptimizers.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.name}
              </option>
            ))}
          </select>
        </label>

        <label style={controlStyle}>
          <span style={controlLabelStyle}>Learning Rate</span>
          <input
            type="number"
            value={learningRate}
            min={0.0001}
            step={0.01}
            onChange={(e) => setLearningRate(Number(e.target.value))}
            disabled={trainingStatus === "training"}
            style={inputStyle}
          />
        </label>

        <label style={controlStyle}>
          <span style={controlLabelStyle}>Batch Size</span>
          <input
            type="number"
            value={batchSize}
            min={1}
            onChange={(e) => setBatchSize(Number(e.target.value))}
            disabled={trainingStatus === "training"}
            style={inputStyle}
          />
        </label>

        <label style={controlStyle}>
          <span style={controlLabelStyle}>Epochs</span>
          <input
            type="number"
            value={epochs}
            min={1}
            onChange={(e) => setEpochs(Number(e.target.value))}
            disabled={trainingStatus === "training"}
            style={inputStyle}
          />
        </label>
      </div>

      <button
        onClick={() => {
          void startTraining();
        }}
        disabled={trainingStatus === "training"}
        style={startButtonStyle(trainingStatus === "training")}
      >
        {trainingStatus === "training" ? "Training..." : "Start Training"}
      </button>

      <div style={metricsRowStyle}>
        <MetricCard
          label="Epoch"
          value={
            latestMetrics ? `${latestMetrics.epoch + 1}/${epochs}` : `0/${epochs}`
          }
        />
        <MetricCard
          label="Loss"
          value={formatMetric(latestMetrics?.loss)}
        />
        <MetricCard
          label="Val Acc"
          value={formatPercent(latestMetrics?.valAccuracy)}
        />
      </div>

      <div style={chartShellStyle}>
        <div style={chartHeaderStyle}>
          <strong>Accuracy Curve</strong>
          {targetAccuracy != null && (
            <span style={targetStyle}>
              Target {(targetAccuracy * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {metrics.length > 0 ? (
          <>
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              preserveAspectRatio="none"
              style={chartSvgStyle}
            >
              {[0, 0.5, 1].map((tick) => (
                <line
                  key={tick}
                  x1={0}
                  y1={valueToY(tick)}
                  x2={CHART_WIDTH}
                  y2={valueToY(tick)}
                  stroke="var(--border)"
                  strokeWidth={0.5}
                />
              ))}

              {targetAccuracy != null && (
                <line
                  x1={0}
                  y1={valueToY(targetAccuracy)}
                  x2={CHART_WIDTH}
                  y2={valueToY(targetAccuracy)}
                  stroke={TARGET_LINE_COLOR}
                  strokeDasharray="2.5 2"
                  strokeWidth={0.8}
                />
              )}

              <path
                d={buildMetricPath(metrics, (item) => item.accuracy)}
                fill="none"
                stroke={TRAIN_LINE_COLOR}
                strokeWidth={1.4}
                strokeLinecap="round"
              />
              <path
                d={buildMetricPath(metrics, (item) => item.valAccuracy)}
                fill="none"
                stroke={VALIDATION_LINE_COLOR}
                strokeWidth={1.4}
                strokeLinecap="round"
              />
            </svg>
            <div style={legendStyle}>
              <LegendItem color={TRAIN_LINE_COLOR} label="Train" />
              <LegendItem color={VALIDATION_LINE_COLOR} label="Validation" />
            </div>
          </>
        ) : (
          <div style={chartPlaceholderStyle}>
            学習を開始すると精度カーブがここに表示されます。
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={metricCardStyle}>
      <span style={metricLabelStyle}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={legendItemStyle}>
      <span style={{ ...legendDotStyle, background: color }} />
      {label}
    </div>
  );
}

function buildMetricPath(
  metrics: TrainingMetrics[],
  selector: (item: TrainingMetrics) => number | undefined,
) {
  let path = "";
  let started = false;

  metrics.forEach((item, index) => {
    const value = selector(item);
    if (value == null) {
      return;
    }

    const x =
      metrics.length === 1
        ? CHART_WIDTH / 2
        : (index / (metrics.length - 1)) * CHART_WIDTH;
    const y = valueToY(value);
    path += `${started ? " L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    started = true;
  });

  return path;
}

function valueToY(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  return CHART_HEIGHT - clamped * CHART_HEIGHT;
}

function formatMetric(value: number | undefined) {
  return value != null ? value.toFixed(4) : "--";
}

function formatPercent(value: number | undefined) {
  return value != null ? `${(value * 100).toFixed(1)}%` : "--";
}

function statusLabel(trainingStatus: TrainingStatus) {
  switch (trainingStatus) {
    case "training":
      return "Running";
    case "completed":
      return "Cleared";
    case "failed":
      return "Retry";
    default:
      return "Ready";
  }
}

const panelStyle: CSSProperties = {
  padding: 16,
  background: "var(--bg)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const eyebrowStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "var(--accent)",
  marginBottom: 4,
};

const controlsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const controlStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  textAlign: "left",
  fontSize: 12,
};

const controlLabelStyle: CSSProperties = {
  color: "var(--text)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: 11,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text-h)",
};

function startButtonStyle(disabled: boolean): CSSProperties {
  return {
    width: "100%",
    marginTop: 12,
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: disabled ? "var(--border)" : "var(--accent)",
    color: "#fff",
    fontWeight: 700,
    boxShadow: disabled ? "none" : "var(--shadow)",
    cursor: disabled ? "progress" : "pointer",
  };
}

const metricsRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
  marginTop: 12,
};

const metricCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--accent-bg)",
  textAlign: "left",
};

const metricLabelStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text)",
};

const chartShellStyle: CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "linear-gradient(180deg, var(--accent-bg), var(--bg))",
};

const chartHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 10,
  fontSize: 13,
};

const targetStyle: CSSProperties = {
  fontSize: 11,
  color: TARGET_LINE_COLOR,
  fontWeight: 700,
};

const chartSvgStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: 156,
};

const chartPlaceholderStyle: CSSProperties = {
  minHeight: 156,
  borderRadius: 12,
  border: "1px dashed var(--accent-border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text)",
  fontSize: 12,
  background: "var(--accent-bg)",
  textAlign: "center",
  padding: 16,
  boxSizing: "border-box",
};

const legendStyle: CSSProperties = {
  display: "flex",
  gap: 14,
  marginTop: 10,
  fontSize: 12,
  color: "var(--text)",
};

const legendItemStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const legendDotStyle: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 999,
};

function statusPill(trainingStatus: TrainingStatus): CSSProperties {
  const palette =
    trainingStatus === "completed"
      ? {
          color: "#1a6c47",
          background: "rgba(39, 176, 110, 0.12)",
          border: "rgba(39, 176, 110, 0.24)",
        }
      : trainingStatus === "failed"
        ? {
            color: "#9d531a",
            background: "rgba(238, 125, 31, 0.12)",
            border: "rgba(238, 125, 31, 0.22)",
          }
        : trainingStatus === "training"
          ? {
              color: "var(--accent)",
              background: "var(--accent-bg)",
              border: "var(--accent-border)",
            }
          : {
              color: "var(--text)",
              background: "var(--bg)",
              border: "var(--border)",
            };

  return {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    color: palette.color,
    background: palette.background,
    border: `1px solid ${palette.border}`,
    whiteSpace: "nowrap",
  };
}
