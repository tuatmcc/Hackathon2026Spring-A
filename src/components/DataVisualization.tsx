import { useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import { STAGE_DATA } from "../config/stages";
import { useGameStore } from "../stores/gameStore";
import { usePlayStore } from "../stores/playStore";
import type { StageDef, TrainingStatus } from "../types";
import type {
  SerializedDataset,
  VisualizationDomain,
} from "../types/visualizationTypes";

interface ScatterPoint {
  x: number;
  y: number;
  label: number;
}

const POSITIVE_COLOR = [170, 59, 255] as const;
const NEGATIVE_COLOR = [104, 113, 150] as const;
const VIEWBOX_SIZE = 100;
const DEFAULT_DOMAIN: VisualizationDomain = {
  minX: -1.2,
  maxX: 1.2,
  minY: -1.2,
  maxY: 1.2,
};

export function DataVisualization() {
  const currentStageIndex = useGameStore((s) => s.currentStageIndex);
  const stage = STAGE_DATA[currentStageIndex] ?? null;
  const dataset = usePlayStore((s) => s.datasetPreview);
  const boundary = usePlayStore((s) => s.boundarySnapshot);
  const trainingStatus = usePlayStore((s) => s.trainingStatus);
  const metrics = usePlayStore((s) => s.metrics);
  const visualizationStageId = usePlayStore((s) => s.visualizationStageId);
  const prepareVisualization = usePlayStore((s) => s.prepareVisualization);
  const activeDataset =
    stage && visualizationStageId === stage.id ? dataset : null;
  const activeBoundary =
    stage && visualizationStageId === stage.id ? boundary : null;
  const latestMetrics = metrics[metrics.length - 1];
  const plottingDomain = activeBoundary?.domain ?? DEFAULT_DOMAIN;

  useEffect(() => {
    if (!stage) {
      prepareVisualization(null);
      return;
    }

    if (visualizationStageId !== stage.id || dataset == null) {
      prepareVisualization(stage);
    }
  }, [dataset, prepareVisualization, stage, visualizationStageId]);

  const points = useMemo(() => {
    if (!stage || !activeDataset || !isTwoDimensionalStage(stage)) {
      return [];
    }

    return extractScatterPoints(activeDataset, stage.outputUnits);
  }, [activeDataset, stage]);

  if (!stage) {
    return <div style={placeholderStyle}>No stage selected</div>;
  }

  if (!isTwoDimensionalStage(stage)) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>Visualizer</div>
            <strong>{stage.name}</strong>
          </div>
        </div>
        <div style={placeholderStyle}>
          `inputShape=[2]` のステージを追加すると 2D 可視化が有効になります。
        </div>
      </div>
    );
  }

  const epochLabel =
    activeBoundary?.epoch != null
      ? `Epoch ${activeBoundary.epoch}`
      : trainingStatus === "training"
        ? "Training"
        : "Untrained";

  const statusLabel =
    activeBoundary != null
      ? trainingStatus === "training"
        ? "Live decision surface"
        : "Latest decision surface"
      : "Dataset preview";

  const accuracyLabel =
    latestMetrics?.valAccuracy ?? latestMetrics?.accuracy ?? undefined;

  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>Visualizer</div>
          <strong>{stage.name}</strong>
        </div>
        <div style={statusPill(trainingStatus)}>{epochLabel}</div>
      </div>

      <div style={summaryRowStyle}>
        <div style={metricCardStyle}>
          <span style={metricLabelStyle}>Surface</span>
          <strong>{statusLabel}</strong>
        </div>
        <div style={metricCardStyle}>
          <span style={metricLabelStyle}>Samples</span>
          <strong>{points.length}</strong>
        </div>
        <div style={metricCardStyle}>
          <span style={metricLabelStyle}>Val Acc</span>
          <strong>
            {accuracyLabel != null ? `${(accuracyLabel * 100).toFixed(1)}%` : "--"}
          </strong>
        </div>
      </div>

      <div style={surfaceFrameStyle}>
        <svg
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          preserveAspectRatio="none"
          style={surfaceSvgStyle}
        >
          <rect
            x={0}
            y={0}
            width={VIEWBOX_SIZE}
            height={VIEWBOX_SIZE}
            style={{ fill: "var(--bg)" }}
          />
          {activeBoundary &&
            activeBoundary.values.map((value, index) => {
              const cellSize = VIEWBOX_SIZE / activeBoundary.gridSize;
              const x = (index % activeBoundary.gridSize) * cellSize;
              const y = Math.floor(index / activeBoundary.gridSize) * cellSize;

              return (
                <rect
                  key={`cell-${index}`}
                  x={x}
                  y={y}
                  width={cellSize + 0.12}
                  height={cellSize + 0.12}
                  fill={surfaceColor(value)}
                />
              );
            })}
          {renderAxis(plottingDomain, "x")}
          {renderAxis(plottingDomain, "y")}
          {points.map((point, index) => (
            <circle
              key={`point-${index}`}
              cx={scaleX(point.x, plottingDomain)}
              cy={scaleY(point.y, plottingDomain)}
              r={1.45}
              fill={point.label >= 0.5 ? rgb(POSITIVE_COLOR) : rgb(NEGATIVE_COLOR)}
              stroke="rgba(255,255,255,0.92)"
              strokeWidth={0.45}
            />
          ))}
        </svg>
      </div>

      <div style={legendStyle}>
        <div style={legendItemStyle}>
          <span style={{ ...legendDotStyle, background: rgb(NEGATIVE_COLOR) }} />
          Class 0
        </div>
        <div style={legendItemStyle}>
          <span style={{ ...legendDotStyle, background: rgb(POSITIVE_COLOR) }} />
          Class 1
        </div>
        <div style={legendHintStyle}>
          背景色はモデルの予測確信度を表します。
        </div>
      </div>
    </section>
  );
}

function isTwoDimensionalStage(stage: StageDef) {
  return stage.inputShape.length === 1 && stage.inputShape[0] === 2;
}

function extractScatterPoints(
  dataset: SerializedDataset,
  outputUnits: number,
): ScatterPoint[] {
  const points: ScatterPoint[] = [];

  for (let index = 0; index < dataset.sampleCount; index++) {
    const inputOffset = index * 2;
    const outputOffset = index * outputUnits;

    points.push({
      x: dataset.xs[inputOffset] ?? 0,
      y: dataset.xs[inputOffset + 1] ?? 0,
      label: readLabel(dataset.ys, outputOffset, outputUnits),
    });
  }

  return points;
}

function readLabel(ys: number[], offset: number, outputUnits: number) {
  if (outputUnits <= 1) {
    return ys[offset] ?? 0;
  }

  let maxIndex = 0;
  let maxValue = Number.NEGATIVE_INFINITY;

  for (let unit = 0; unit < outputUnits; unit++) {
    const value = ys[offset + unit] ?? 0;
    if (value > maxValue) {
      maxValue = value;
      maxIndex = unit;
    }
  }

  return maxIndex;
}

function renderAxis(
  domain: VisualizationDomain,
  axis: "x" | "y",
) {
  if (axis === "x") {
    if (domain.minY > 0 || domain.maxY < 0) {
      return null;
    }

    return (
      <line
        x1={0}
        y1={scaleY(0, domain)}
        x2={VIEWBOX_SIZE}
        y2={scaleY(0, domain)}
        stroke="rgba(107, 99, 117, 0.18)"
        strokeWidth={0.35}
      />
    );
  }

  if (domain.minX > 0 || domain.maxX < 0) {
    return null;
  }

  return (
    <line
      x1={scaleX(0, domain)}
      y1={0}
      x2={scaleX(0, domain)}
      y2={VIEWBOX_SIZE}
      stroke="rgba(107, 99, 117, 0.18)"
      strokeWidth={0.35}
    />
  );
}

function scaleX(value: number, domain: VisualizationDomain) {
  return (
    ((value - domain.minX) / (domain.maxX - domain.minX)) * VIEWBOX_SIZE
  );
}

function scaleY(value: number, domain: VisualizationDomain) {
  return (
    VIEWBOX_SIZE -
    ((value - domain.minY) / (domain.maxY - domain.minY)) * VIEWBOX_SIZE
  );
}

function surfaceColor(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  const confidence = Math.abs(clamped - 0.5) * 2;
  const tint = Math.min(0.94, 0.22 + confidence * 0.78);
  const base = clamped >= 0.5 ? POSITIVE_COLOR : NEGATIVE_COLOR;

  return mixWithWhite(base, tint);
}

function mixWithWhite(
  color: readonly [number, number, number],
  tint: number,
) {
  const channel = (index: number) =>
    Math.round(255 - (255 - color[index]) * tint);

  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

function rgb(color: readonly [number, number, number]) {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

const panelStyle: CSSProperties = {
  padding: 16,
  borderTop: "1px solid var(--border)",
  borderBottom: "1px solid var(--border)",
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
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--accent)",
  marginBottom: 4,
};

const summaryRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
  marginBottom: 12,
};

const metricCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "10px 12px",
  borderRadius: 12,
  background: "var(--accent-bg)",
  border: "1px solid var(--border)",
  textAlign: "left",
};

const metricLabelStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "var(--text)",
};

const surfaceFrameStyle: CSSProperties = {
  overflow: "hidden",
  borderRadius: 18,
  border: "1px solid var(--border)",
  background: "linear-gradient(180deg, var(--accent-bg) 0%, var(--bg) 100%)",
  boxShadow: "var(--shadow)",
};

const surfaceSvgStyle: CSSProperties = {
  display: "block",
  width: "100%",
  aspectRatio: "1 / 1",
};

const legendStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 12,
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

const legendHintStyle: CSSProperties = {
  marginLeft: "auto",
};

const placeholderStyle: CSSProperties = {
  width: "100%",
  minHeight: 220,
  borderRadius: 16,
  border: "1px dashed var(--accent-border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text)",
  fontSize: 13,
  background: "var(--accent-bg)",
  textAlign: "center",
  padding: 24,
  boxSizing: "border-box",
};

function statusPill(trainingStatus: TrainingStatus): CSSProperties {
  const palette =
    trainingStatus === "completed"
        ? {
            color: "#12704c",
            background: "rgba(44, 184, 118, 0.14)",
            border: "rgba(44, 184, 118, 0.24)",
          }
      : trainingStatus === "failed"
        ? {
            color: "#ab4d1f",
            background: "rgba(255, 138, 31, 0.14)",
            border: "rgba(255, 138, 31, 0.24)",
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
    fontWeight: 600,
    color: palette.color,
    background: palette.background,
    border: `1px solid ${palette.border}`,
    whiteSpace: "nowrap",
  };
}
