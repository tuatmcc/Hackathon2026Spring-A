// ============================================================
// TrainingPanel — Steampunk-themed training controls + metrics
// ============================================================

import { useMemo, type CSSProperties } from "react";
import { STAGE_DATA } from "../config/stages";
import { SKILL_DATA } from "../config/skills";
import { useGameStore } from "../stores/gameStore";
import { usePlayStore } from "../stores/playStore";
import {
  estimateModelParameterCount,
  formatParameterCount,
  getModelParameterCap,
} from "../ml/modelParameterBudget";
import {
  formatStageTargetValue,
  getStageTargetLabel,
} from "../stageUtils";
import type { TrainingMetrics, TrainingStatus } from "../types";
import { SteamParticles } from "./SteamParticles";
import {
  sortLayerNodesTopologically,
  validateSequentialLayerGraph,
} from "./networkEditorUtils";
import { sanitizeLayerNodeData } from "../layerSizeOptions";

const CHART_WIDTH = 100;
const CHART_HEIGHT = 56;
const TRAIN_LINE_COLOR = "#b87333";
const VALIDATION_LINE_COLOR = "#b58921";
const TARGET_LINE_COLOR = "#3fb950";

export function TrainingPanel() {
  const currentStageIndex = useGameStore((s) => s.currentStageIndex);
  const unlockedSkills = useGameStore((s) => s.unlockedSkills);
  const stage = STAGE_DATA[currentStageIndex];
  const {
    nodes,
    edges,
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
  const isRegressionTask = stage?.taskType === "regression";
  const targetValue = isRegressionTask ? stage?.targetLoss : stage?.targetAccuracy;
  const summaryMetricLabel = isRegressionTask ? "Val Loss" : "Val Acc";
  const summaryMetricValue = isRegressionTask
    ? formatMetric(latestMetrics?.valLoss ?? latestMetrics?.loss)
    : formatPercent(latestMetrics?.valAccuracy ?? latestMetrics?.accuracy);
  const chartTitle = isRegressionTask ? "Loss Curve" : "Accuracy Curve";
  const trainMetricSelector = (item: TrainingMetrics) =>
    isRegressionTask ? item.loss : item.accuracy;
  const validationMetricSelector = (item: TrainingMetrics) =>
    isRegressionTask ? item.valLoss : item.valAccuracy;
  const chartMaxValue = getChartMax(
    metrics,
    trainMetricSelector,
    validationMetricSelector,
    targetValue,
    isRegressionTask,
  );
  const chartTicks = getChartTicks(chartMaxValue, isRegressionTask);
  const trainPoints = getMetricPlotPoints(
    metrics,
    trainMetricSelector,
    chartMaxValue,
  );
  const validationPoints = getMetricPlotPoints(
    metrics,
    validationMetricSelector,
    chartMaxValue,
  );
  const parameterBudget = useMemo(() => {
    if (!stage) {
      return null;
    }

    const cap = getModelParameterCap(unlockedSkills);

    try {
      const sortedNodes =
        edges.length > 0 && nodes.length > 1
          ? sortLayerNodesTopologically(nodes, edges)
          : nodes;
      const layers = sortedNodes.map((node) =>
        sanitizeLayerNodeData(node.data, unlockedSkills),
      );
      const estimate = estimateModelParameterCount(layers, stage);

      return {
        parameterCount: estimate.parameterCount,
        cap,
        isExceeded: estimate.parameterCount > cap,
      };
    } catch {
      return {
        parameterCount: null,
        cap,
        isExceeded: false,
      };
    }
  }, [edges, nodes, stage, unlockedSkills]);
  const graphValidationMessage = useMemo(() => {
    try {
      validateSequentialLayerGraph(nodes, edges);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Fix the network before training.";
    }
  }, [edges, nodes]);
  const isStartDisabled =
    trainingStatus === "training" || graphValidationMessage !== null;

  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          <div style={eyebrowStyle}>Engine</div>
          <strong style={{ color: "var(--text-h)", fontSize: 12 }}>Training</strong>
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
          <span style={controlLabelStyle}>LR</span>
          <input
            type="number"
            value={learningRate}
            min={0.0001}
            step={0.001}
            onChange={(e) => setLearningRate(Number(e.target.value))}
            disabled={trainingStatus === "training"}
            style={inputStyle}
          />
        </label>

        <label style={controlStyle}>
          <span style={controlLabelStyle}>Batch</span>
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
        disabled={isStartDisabled}
        style={startButtonStyle(trainingStatus, isStartDisabled)}
      >
        {trainingStatus === "training" && (
          <SteamParticles active kind="sparks" count={15} duration={0} />
        )}
        <span style={startButtonInnerStyle}>
          {trainingStatus === "training" ? "Running..." : "Ignite"}
        </span>
        {trainingStatus === "training" && (
          <div style={progressStripeStyle} />
        )}
      </button>

      {graphValidationMessage && (
        <div style={validationMessageStyle}>
          {graphValidationMessage}
        </div>
      )}

      {parameterBudget && (
        <div style={parameterBudgetStyle(parameterBudget.isExceeded)}>
          <span style={parameterBudgetLabelStyle}>Params</span>
          <strong>
            {parameterBudget.parameterCount == null
              ? `? / ${formatParameterCount(parameterBudget.cap)}`
              : `${formatParameterCount(parameterBudget.parameterCount)} / ${formatParameterCount(parameterBudget.cap)}`}
          </strong>
        </div>
      )}

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
          label={summaryMetricLabel}
          value={summaryMetricValue}
        />
      </div>

      <div style={chartShellStyle}>
        <div style={chartHeaderStyle}>
          <strong style={{ color: "var(--brass)", fontSize: 10 }}>{chartTitle}</strong>
          {stage && targetValue != null && (
            <span style={targetStyle}>
              {getStageTargetLabel(stage)} {formatStageTargetValue(stage)}
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
              {chartTicks.map((tick) => (
                <line
                  key={tick}
                  x1={0}
                  y1={valueToY(tick, chartMaxValue)}
                  x2={CHART_WIDTH}
                  y2={valueToY(tick, chartMaxValue)}
                  stroke="rgba(181, 137, 33, 0.12)"
                  strokeWidth={0.5}
                />
              ))}

              {targetValue != null && (
                <line
                  x1={0}
                  y1={valueToY(targetValue, chartMaxValue)}
                  x2={CHART_WIDTH}
                  y2={valueToY(targetValue, chartMaxValue)}
                  stroke={TARGET_LINE_COLOR}
                  strokeDasharray="2.5 2"
                  strokeWidth={0.8}
                />
              )}

              <path
                d={buildMetricPath(trainPoints)}
                fill="none"
                stroke={TRAIN_LINE_COLOR}
                strokeWidth={1.4}
                strokeLinecap="round"
              />
              <path
                d={buildMetricPath(validationPoints)}
                fill="none"
                stroke={VALIDATION_LINE_COLOR}
                strokeWidth={1.4}
                strokeLinecap="round"
              />
            </svg>
            <div style={legendStyle}>
              <LegendItem color={TRAIN_LINE_COLOR} label="Train" />
              <LegendItem color={VALIDATION_LINE_COLOR} label="Val" />
            </div>
          </>
        ) : (
          <div style={chartPlaceholderStyle}>
            {isRegressionTask ? "Train to see loss curve" : "Train to see accuracy curve"}
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
      <strong style={{ color: "var(--brass)", fontSize: 12 }}>{value}</strong>
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

interface MetricPlotPoint {
  x: number;
  y: number;
}

function getMetricPlotPoints(
  metrics: TrainingMetrics[],
  selector: (item: TrainingMetrics) => number | undefined,
  maxValue: number,
) {
  const points: MetricPlotPoint[] = [];

  metrics.forEach((item, index) => {
    const value = selector(item);
    if (value == null) {
      return;
    }

    const x =
      metrics.length === 1
        ? CHART_WIDTH / 2
        : (index / (metrics.length - 1)) * CHART_WIDTH;
    const y = valueToY(value, maxValue);
    points.push({ x, y });
  });

  return points;
}

function buildMetricPath(points: MetricPlotPoint[]) {
  if (points.length === 1) {
    const point = points[0];
    const left = Math.max(0, point.x - 3);
    const right = Math.min(CHART_WIDTH, point.x + 3);
    return `M ${left.toFixed(2)} ${point.y.toFixed(2)} L ${right.toFixed(2)} ${point.y.toFixed(2)}`;
  }

  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
}

function valueToY(value: number, maxValue: number) {
  const scale = maxValue > 0 ? maxValue : 1;
  const clamped = Math.max(0, Math.min(scale, value));
  return CHART_HEIGHT - (clamped / scale) * CHART_HEIGHT;
}

function formatMetric(value: number | undefined) {
  return value != null ? value.toFixed(4) : "--";
}

function formatPercent(value: number | undefined) {
  return value != null ? `${(value * 100).toFixed(1)}%` : "--";
}

function getChartMax(
  metrics: TrainingMetrics[],
  trainSelector: (item: TrainingMetrics) => number | undefined,
  validationSelector: (item: TrainingMetrics) => number | undefined,
  targetValue: number | undefined,
  isRegressionTask: boolean | undefined,
) {
  if (!isRegressionTask) {
    return 1;
  }

  const values = metrics.flatMap((metric) => [
    trainSelector(metric),
    validationSelector(metric),
  ]);
  const finiteValues = values.filter(
    (value): value is number => value != null && Number.isFinite(value),
  );
  const baseline = targetValue != null ? [targetValue] : [];
  const maxValue = Math.max(...finiteValues, ...baseline, 0.1);

  return maxValue * 1.1;
}

function getChartTicks(maxValue: number, isRegressionTask: boolean | undefined) {
  if (!isRegressionTask) {
    return [0, 0.5, 1];
  }

  return [0, maxValue / 2, maxValue];
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
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
  padding: "8px 10px",
  background: "var(--bg-surface)",
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 6,
  flexShrink: 0,
};

const headerLeftStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const eyebrowStyle: CSSProperties = {
  fontSize: 8,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontWeight: 800,
  color: "var(--brass)",
};

const controlsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 6,
  flexShrink: 0,
};

const controlStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  textAlign: "left",
  fontSize: 11,
};

const controlLabelStyle: CSSProperties = {
  color: "var(--text)",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontSize: 8,
  fontWeight: 800,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "5px 8px",
  border: "1px solid var(--accent-border)",
  background: "#000",
  color: "var(--brass)",
  fontWeight: 700,
  fontSize: 11,
};

function startButtonStyle(
  status: TrainingStatus,
  isDisabled: boolean,
): CSSProperties {
  const isRunning = status === "training";
  return {
    width: "100%",
    marginTop: 8,
    padding: 0,
    border: isRunning
      ? "2px solid #d44"
      : isDisabled
        ? "2px solid rgba(114, 92, 64, 0.8)"
        : "2px solid var(--rust)",
    background: isRunning
      ? "#600"
      : isDisabled
        ? "rgba(95, 80, 55, 0.8)"
        : "var(--brass)",
    color: isRunning ? "#fff" : isDisabled ? "rgba(244, 234, 208, 0.72)" : "#000",
    fontWeight: 800,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    cursor: isRunning ? "progress" : isDisabled ? "not-allowed" : "pointer",
    boxShadow: isRunning
      ? "0 0 16px rgba(221, 68, 68, 0.2)"
      : isDisabled
        ? "none"
        : "3px 3px 0 rgba(0,0,0,0.4)",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    overflow: "hidden",
    position: "relative",
    animation: isRunning ? "engine-rumble 0.15s linear infinite" : "none",
    flexShrink: 0,
  };
}

const startButtonInnerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "10px 16px",
  position: "relative",
  zIndex: 2,
};

const progressStripeStyle: CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: 3,
  background: "repeating-linear-gradient(90deg, rgba(181, 137, 33, 0.4), rgba(181, 137, 33, 0.4) 10px, transparent 10px, transparent 20px)",
  backgroundSize: "40px 3px",
  animation: "progress-stripe 0.6s linear infinite",
};

const parameterBudgetLabelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-muted)",
};

const validationMessageStyle: CSSProperties = {
  marginTop: 8,
  padding: "8px 10px",
  border: "1px solid rgba(184, 115, 51, 0.45)",
  background: "rgba(80, 33, 24, 0.68)",
  color: "#f1c27a",
  fontSize: 10,
  lineHeight: 1.45,
};

function parameterBudgetStyle(isExceeded: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 10,
    padding: "8px 10px",
    border: `1px solid ${isExceeded ? "rgba(221, 68, 68, 0.28)" : "rgba(181, 137, 33, 0.18)"}`,
    background: isExceeded ? "rgba(221, 68, 68, 0.06)" : "rgba(181, 137, 33, 0.06)",
    color: isExceeded ? "#d44" : "var(--brass)",
    fontSize: 11,
    fontWeight: 700,
  };
}

const metricsRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 4,
  marginTop: 6,
  flexShrink: 0,
};

const metricCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "6px 8px",
  border: "1px solid var(--border)",
  background: "rgba(181, 137, 33, 0.04)",
  textAlign: "left",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
};

const metricLabelStyle: CSSProperties = {
  fontSize: 8,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: 800,
  color: "var(--text)",
};

const chartShellStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  marginTop: 6,
  padding: 8,
  border: "1px solid var(--border)",
  background: "#000",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const chartHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
  marginBottom: 4,
  fontSize: 10,
  flexShrink: 0,
};

const targetStyle: CSSProperties = {
  fontSize: 9,
  color: TARGET_LINE_COLOR,
  fontWeight: 700,
};

const chartSvgStyle: CSSProperties = {
  display: "block",
  width: "100%",
  flex: 1,
  minHeight: 60,
};

const chartPlaceholderStyle: CSSProperties = {
  flex: 1,
  minHeight: 60,
  border: "1px dashed var(--accent-border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text)",
  fontSize: 10,
  background: "rgba(181, 137, 33, 0.03)",
  textAlign: "center",
  padding: 8,
  boxSizing: "border-box",
};

const legendStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 4,
  fontSize: 9,
  color: "var(--text)",
  flexShrink: 0,
};

const legendItemStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

const legendDotStyle: CSSProperties = {
  width: 7,
  height: 7,
};

function statusPill(trainingStatus: TrainingStatus): CSSProperties {
  const palette =
    trainingStatus === "completed"
      ? {
          color: "#3fb950",
          background: "rgba(63, 185, 80, 0.1)",
          border: "rgba(63, 185, 80, 0.3)",
        }
      : trainingStatus === "failed"
        ? {
            color: "#d44",
            background: "rgba(221, 68, 68, 0.08)",
            border: "rgba(221, 68, 68, 0.25)",
          }
        : trainingStatus === "training"
          ? {
              color: "var(--brass)",
              background: "rgba(181, 137, 33, 0.1)",
              border: "var(--accent-border)",
            }
          : {
              color: "var(--text)",
              background: "transparent",
              border: "var(--border)",
            };

  return {
    padding: "5px 10px",
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: palette.color,
    background: palette.background,
    border: `1px solid ${palette.border}`,
    whiteSpace: "nowrap",
  };
}
