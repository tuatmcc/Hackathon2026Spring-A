import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { STAGE_DATA } from "../config/stages";
import { useGameStore } from "../stores/gameStore";
import { usePlayStore } from "../stores/playStore";
import { useVisualizerStore } from "../stores/visualizerStore";
import type { StageDef, TrainingStatus } from "../types";
import type {
  DigitsPredictionSnapshot,
  RegressionCurvePoint,
  RegressionCurveSnapshot,
  SerializedDataset,
  VisualizationDomain,
} from "../types/visualizationTypes";
import {
  extractDigitsSample,
  extractRegressionSamplePoints,
  getClampedDigitsSampleIndex,
  getRegressionDomainFromSamplePoints,
} from "./dataVisualizationUtils";
import type {
  DigitsSampleItem,
  RegressionSamplePoint,
} from "./dataVisualizationUtils";

interface ScatterPoint {
  x: number;
  y: number;
  label: number;
}

const POSITIVE_COLOR = [181, 137, 33] as const;
const NEGATIVE_COLOR = [80, 72, 58] as const;
const CORRECT_COLOR = "#3fb950";
const INCORRECT_COLOR = "#d44";
const DIGITS_CARD_BACKGROUND = "#111";
const DIGITS_PREDICTED_COLOR = "#b58921";
const DIGITS_TRUTH_COLOR = CORRECT_COLOR;
const REGRESSION_LINE_COLOR = "#b58921";
const REGRESSION_TARGET_COLOR = "#b87333";
const VIEWBOX_SIZE = 100;
const DIGITS_VIEWBOX_SIZE = 8;
const DEFAULT_DOMAIN: VisualizationDomain = {
  minX: -1.2,
  maxX: 1.2,
  minY: -1.2,
  maxY: 1.2,
};
export function DataVisualization() {
  const currentStageIndex = useGameStore((s) => s.currentStageIndex);
  const stage = STAGE_DATA[currentStageIndex] ?? null;
  const trainingStatus = usePlayStore((s) => s.trainingStatus);
  const metrics = usePlayStore((s) => s.metrics);
  const dataset = useVisualizerStore((s) => s.datasetPreview);
  const visualizationSnapshot = useVisualizerStore((s) => s.visualizationSnapshot);
  const visualizationStageId = useVisualizerStore((s) => s.visualizationStageId);
  const prepareVisualization = useVisualizerStore((s) => s.prepareVisualization);
  const [digitsSampleState, setDigitsSampleState] = useState({
    datasetKey: "",
    sampleIndex: 0,
  });
  const activeDataset =
    stage && visualizationStageId === stage.id ? dataset : null;
  const activeSnapshot =
    stage && visualizationStageId === stage.id ? visualizationSnapshot : null;
  const activeBoundary =
    activeSnapshot?.kind === "boundary" ? activeSnapshot : null;
  const activeDigitsSnapshot =
    activeSnapshot?.kind === "digits" ? activeSnapshot : null;
  const activeRegressionSnapshot =
    activeSnapshot?.kind === "regression" ? activeSnapshot : null;
  const latestMetrics = metrics[metrics.length - 1];
  const plottingDomain = activeBoundary?.domain ?? DEFAULT_DOMAIN;

  useEffect(() => {
    if (!stage) {
      void prepareVisualization(null);
      return;
    }

    if (visualizationStageId !== stage.id || dataset == null) {
      void prepareVisualization(stage);
    }
  }, [dataset, prepareVisualization, stage, visualizationStageId]);

  const points = useMemo(() => {
    if (!stage || !activeDataset || !isTwoDimensionalStage(stage)) {
      return [];
    }

    return extractScatterPoints(activeDataset);
  }, [activeDataset, stage]);

  const digitsSampleCount = activeDataset?.sampleCount ?? 0;
  const digitsDatasetKey = `${stage?.id ?? "none"}:${digitsSampleCount}`;
  const requestedDigitsSampleIndex =
    digitsSampleState.datasetKey === digitsDatasetKey
      ? digitsSampleState.sampleIndex
      : 0;
  const clampedDigitsSampleIndex = getClampedDigitsSampleIndex(
    requestedDigitsSampleIndex,
    digitsSampleCount,
  );

  const digitsSample = useMemo(() => {
    if (!stage || !activeDataset || !isDigitsStage(stage)) {
      return null;
    }

    return extractDigitsSample(
      activeDataset,
      activeDigitsSnapshot,
      clampedDigitsSampleIndex,
    );
  }, [activeDataset, activeDigitsSnapshot, clampedDigitsSampleIndex, stage]);

  const regressionSamples = useMemo(() => {
    if (!stage || !activeDataset || !isRegressionStage(stage)) {
      return [];
    }

    return extractRegressionSamplePoints(activeDataset);
  }, [activeDataset, stage]);

  const regressionDomain =
    activeRegressionSnapshot?.domain ??
    getRegressionDomainFromSamplePoints(regressionSamples);

  const updateDigitsSampleIndex = (updater: (current: number) => number) => {
    setDigitsSampleState((current) => {
      const baseIndex =
        current.datasetKey === digitsDatasetKey ? current.sampleIndex : 0;

      return {
        datasetKey: digitsDatasetKey,
        sampleIndex: getClampedDigitsSampleIndex(
          updater(baseIndex),
          digitsSampleCount,
        ),
      };
    });
  };

  if (!stage) {
    return <div style={placeholderStyle}>No stage selected</div>;
  }

  if (isTwoDimensionalStage(stage)) {
    return renderTwoDimensionalVisualization(
      stage,
      trainingStatus,
      latestMetrics?.valAccuracy ?? latestMetrics?.accuracy,
      points,
      activeBoundary,
      plottingDomain,
    );
  }

  if (isDigitsStage(stage)) {
    return renderDigitsVisualization(
      stage,
      trainingStatus,
      latestMetrics?.valAccuracy ?? latestMetrics?.accuracy,
      activeDigitsSnapshot,
      digitsSample,
      clampedDigitsSampleIndex,
      digitsSampleCount,
      () => updateDigitsSampleIndex((current) => current - 1),
      () => updateDigitsSampleIndex((current) => current + 1),
    );
  }

  if (isRegressionStage(stage)) {
    return renderRegressionVisualization(
      stage,
      trainingStatus,
      latestMetrics?.valLoss ?? latestMetrics?.loss,
      regressionSamples,
      activeRegressionSnapshot,
      regressionDomain,
    );
  }

  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>Visualizer</div>
          <strong>{stage.name}</strong>
        </div>
      </div>
      <div style={placeholderStyle}>
        `inputShape=[2]`、`inputShape=[1]`、`inputShape=[8,8,1]` のステージで可視化できます。
      </div>
    </section>
  );
}

function renderTwoDimensionalVisualization(
  stage: StageDef,
  trainingStatus: TrainingStatus,
  accuracyLabel: number | undefined,
  points: ScatterPoint[],
  activeBoundary: {
    epoch?: number;
    gridSize: number;
    values: number[];
  } | null,
  plottingDomain: VisualizationDomain,
) {
  const epochLabel =
    activeBoundary?.epoch != null
      ? `Ep ${activeBoundary.epoch}`
      : trainingStatus === "training"
        ? "Training"
        : "Untrained";

  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          <div style={eyebrowStyle}>Visualizer</div>
          <strong style={headerTitleStyle}>{stage.name}</strong>
        </div>
        <div style={headerRightStyle}>
          <span style={compactMetricStyle}>
            {points.length} pts
          </span>
          <span style={compactMetricStyle}>
            Acc {accuracyLabel != null ? `${(accuracyLabel * 100).toFixed(1)}%` : "--"}
          </span>
          <div style={statusPill(trainingStatus)}>{epochLabel}</div>
        </div>
      </div>

      <div style={surfaceFrameStyle}>
        <svg
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          style={surfaceSvgFillStyle}
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
      </div>
    </section>
  );
}

function renderRegressionVisualization(
  stage: StageDef,
  trainingStatus: TrainingStatus,
  lossLabel: number | undefined,
  samplePoints: RegressionSamplePoint[],
  snapshot: RegressionCurveSnapshot | null,
  plottingDomain: VisualizationDomain,
) {
  const epochLabel =
    snapshot?.epoch != null
      ? `Ep ${snapshot.epoch}`
      : trainingStatus === "training"
        ? "Training"
        : "Untrained";

  const targetPath = buildCurvePath(samplePoints, plottingDomain);
  const predictionPath = buildCurvePath(
    snapshot?.predictedPoints ?? [],
    plottingDomain,
  );

  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          <div style={eyebrowStyle}>Visualizer</div>
          <strong style={headerTitleStyle}>{stage.name}</strong>
        </div>
        <div style={headerRightStyle}>
          <span style={compactMetricStyle}>
            Loss {formatScalar(lossLabel)}
          </span>
          <span style={compactMetricStyle}>
            Target {formatScalar(stage.targetLoss)}
          </span>
          <div style={statusPill(trainingStatus)}>{epochLabel}</div>
        </div>
      </div>

      <div style={surfaceFrameStyle}>
        <svg
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          style={surfaceSvgFillStyle}
        >
          <rect
            x={0}
            y={0}
            width={VIEWBOX_SIZE}
            height={VIEWBOX_SIZE}
            style={{ fill: "var(--bg)" }}
          />
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={`grid-y-${ratio}`}
              x1={0}
              y1={VIEWBOX_SIZE * ratio}
              x2={VIEWBOX_SIZE}
              y2={VIEWBOX_SIZE * ratio}
              stroke="rgba(107, 99, 117, 0.1)"
              strokeWidth={0.35}
            />
          ))}
          {renderAxis(plottingDomain, "x")}
          {renderAxis(plottingDomain, "y")}
          {targetPath ? (
            <path
              d={targetPath}
              fill="none"
              stroke={REGRESSION_TARGET_COLOR}
              strokeWidth={1.35}
              strokeLinecap="round"
            />
          ) : null}
          {samplePoints.map((point, index) => (
            <circle
              key={`regression-sample-${index}`}
              cx={scaleX(point.x, plottingDomain)}
              cy={scaleY(point.y, plottingDomain)}
              r={0.68}
              fill="rgba(104, 113, 150, 0.42)"
            />
          ))}
          {predictionPath ? (
            <path
              d={predictionPath}
              fill="none"
              stroke={REGRESSION_LINE_COLOR}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          ) : null}
        </svg>
      </div>

      <div style={legendStyle}>
        <div style={legendItemStyle}>
          <span style={{ ...legendDotStyle, background: REGRESSION_TARGET_COLOR }} />
          Target
        </div>
        <div style={legendItemStyle}>
          <span style={{ ...legendDotStyle, background: REGRESSION_LINE_COLOR }} />
          Prediction
        </div>
      </div>
    </section>
  );
}

function renderDigitsVisualization(
  stage: StageDef,
  trainingStatus: TrainingStatus,
  accuracyLabel: number | undefined,
  snapshot: DigitsPredictionSnapshot | null,
  sample: DigitsSampleItem | null,
  sampleIndex: number,
  sampleCount: number,
  onPreviousSample: () => void,
  onNextSample: () => void,
) {
  const epochLabel =
    snapshot?.epoch != null
      ? `Ep ${snapshot.epoch}`
      : trainingStatus === "training"
        ? "Training"
        : "Untrained";

  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          <div style={eyebrowStyle}>Visualizer</div>
          <strong style={headerTitleStyle}>{stage.name}</strong>
        </div>
        <div style={headerRightStyle}>
          <span style={compactMetricStyle}>
            Acc {accuracyLabel != null ? `${(accuracyLabel * 100).toFixed(1)}%` : "--"}
          </span>
          <div style={statusPill(trainingStatus)}>{epochLabel}</div>
        </div>
      </div>

      <div style={digitsMainAreaStyle}>
        {/* Left: digit image + meta */}
        <div style={digitsLeftColumnStyle}>
          <svg
            viewBox={`0 0 ${DIGITS_VIEWBOX_SIZE} ${DIGITS_VIEWBOX_SIZE}`}
            preserveAspectRatio="xMidYMid meet"
            style={digitPreviewSvgCompactStyle}
          >
            <rect
              x={0}
              y={0}
              width={DIGITS_VIEWBOX_SIZE}
              height={DIGITS_VIEWBOX_SIZE}
              fill={DIGITS_CARD_BACKGROUND}
            />
            {sample?.pixels.map((pixel, index) => (
              <rect
                key={`pixel-${sample?.index ?? 0}-${index}`}
                x={index % DIGITS_VIEWBOX_SIZE}
                y={Math.floor(index / DIGITS_VIEWBOX_SIZE)}
                width={1}
                height={1}
                fill={digitPixelColor(pixel)}
              />
            ))}
          </svg>
          <div style={digitsMetaCompactStyle}>
            <span>GT: <strong style={{ color: "var(--brass)" }}>{sample ? sample.label : "--"}</strong></span>
            <span>Pred: <strong style={{ color: "var(--brass)" }}>{sample?.predictedLabel != null ? sample.predictedLabel : "--"}</strong></span>
            <div
              style={digitResultBadgeStyle(
                sample?.isCorrect == null
                  ? "neutral"
                  : sample.isCorrect
                    ? "correct"
                    : "incorrect",
              )}
            >
              {sample?.isCorrect == null
                ? "Pending"
                : sample.isCorrect
                  ? "Correct"
                  : "Wrong"}
            </div>
          </div>
          {/* Pager */}
          <div style={pagerCompactStyle}>
            <button
              type="button"
              onClick={onPreviousSample}
              disabled={sampleIndex <= 0}
              style={pagerButtonStyle(sampleIndex <= 0)}
            >
              &lt;
            </button>
            <span style={pagerStatusCompactStyle}>
              {sampleCount > 0 ? `${sampleIndex + 1}/${sampleCount}` : "--"}
            </span>
            <button
              type="button"
              onClick={onNextSample}
              disabled={sampleIndex >= sampleCount - 1}
              style={pagerButtonStyle(sampleIndex >= sampleCount - 1)}
            >
              &gt;
            </button>
          </div>
        </div>

        {/* Right: confidence bars */}
        <div style={digitsConfidenceCompactStyle}>
          <div style={digitsConfidenceHeaderCompactStyle}>
            <strong style={{ fontSize: 10 }}>Confidence</strong>
          </div>
          {sample && sample.classConfidences.length > 0 ? (
            <div style={digitsConfidenceListCompactStyle}>
              {sample.classConfidences.map((confidence, label) => (
                <div
                  key={`confidence-${sample.index}-${label}`}
                  style={digitsConfidenceRowCompactStyle}
                >
                  <span style={digitsConfidenceLabelCompactStyle}>{label}</span>
                  <div style={digitsConfidenceTrackStyle}>
                    <div
                      style={digitsConfidenceFillStyle(
                        confidence,
                        label === sample.predictedLabel,
                        label === sample.label,
                      )}
                    />
                  </div>
                  <strong style={digitsConfidenceValueCompactStyle}>
                    {(confidence * 100).toFixed(0)}%
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div style={digitsConfidencePlaceholderCompactStyle}>
              Train to see confidence
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function isTwoDimensionalStage(stage: StageDef) {
  return stage.inputShape.length === 1 && stage.inputShape[0] === 2;
}

function isDigitsStage(stage: StageDef) {
  return (
    stage.inputShape.length === 3 &&
    stage.inputShape[0] === 8 &&
    stage.inputShape[1] === 8 &&
    stage.inputShape[2] === 1
  );
}

function isRegressionStage(stage: StageDef) {
  return (
    stage.taskType === "regression" &&
    stage.inputShape.length === 1 &&
    stage.inputShape[0] === 1
  );
}

function extractScatterPoints(dataset: SerializedDataset): ScatterPoint[] {
  const points: ScatterPoint[] = [];

  for (let index = 0; index < dataset.sampleCount; index++) {
    const inputOffset = index * 2;

    points.push({
      x: dataset.xs[inputOffset] ?? 0,
      y: dataset.xs[inputOffset + 1] ?? 0,
      label: dataset.labels[index] ?? 0,
    });
  }

  return points;
}

function buildCurvePath(
  points: RegressionSamplePoint[] | RegressionCurvePoint[],
  domain: VisualizationDomain,
) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${scaleX(point.x, domain).toFixed(2)} ${scaleY(point.y, domain).toFixed(2)}`;
    })
    .join(" ");
}

function renderAxis(domain: VisualizationDomain, axis: "x" | "y") {
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

function digitPixelColor(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  const intensity = Math.round(12 + clamped * 243);

  return `rgb(${intensity}, ${intensity}, ${intensity})`;
}

function rgb(color: readonly [number, number, number]) {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function formatScalar(value: number | undefined) {
  return value != null ? value.toFixed(4) : "--";
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
  minWidth: 0,
};

const headerTitleStyle: CSSProperties = {
  color: "var(--text-h)",
  fontSize: 12,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const headerRightStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexShrink: 0,
};

const compactMetricStyle: CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  color: "var(--text)",
  whiteSpace: "nowrap",
};

const eyebrowStyle: CSSProperties = {
  fontSize: 8,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontWeight: 800,
  color: "var(--brass)",
  whiteSpace: "nowrap",
};

const surfaceFrameStyle: CSSProperties = {
  overflow: "hidden",
  border: "2px solid var(--brass)",
  background: "#000",
  boxShadow: "inset 0 0 8px rgba(181, 137, 33, 0.08)",
  display: "flex",
  aspectRatio: "1 / 1",
  width: "100%",
  maxHeight: "100%",
  flexShrink: 1,
  minHeight: 0,
};

const surfaceSvgFillStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
};

/* ---------- Digits-specific compact layout ---------- */

const digitsMainAreaStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "row",
  gap: 8,
  minHeight: 0,
  overflow: "hidden",
};

const digitsLeftColumnStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  minWidth: 80,
  maxWidth: 140,
  flexShrink: 0,
};

const digitPreviewSvgCompactStyle: CSSProperties = {
  display: "block",
  width: "100%",
  maxWidth: 120,
  aspectRatio: "1 / 1",
  imageRendering: "pixelated",
  border: "2px solid var(--brass)",
  flexShrink: 0,
};

const digitsMetaCompactStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  fontSize: 9,
  fontWeight: 700,
  color: "var(--text)",
  justifyContent: "center",
};

const pagerCompactStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  flexShrink: 0,
};

const pagerStatusCompactStyle: CSSProperties = {
  fontSize: 9,
  color: "var(--text)",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const digitsConfidenceCompactStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 0,
  overflow: "auto",
};

const digitsConfidenceHeaderCompactStyle: CSSProperties = {
  color: "var(--text-h)",
  fontSize: 10,
  flexShrink: 0,
};

const digitsConfidenceListCompactStyle: CSSProperties = {
  display: "grid",
  gap: 3,
};

const digitsConfidenceRowCompactStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "16px minmax(0, 1fr) 36px",
  alignItems: "center",
  gap: 4,
};

const digitsConfidenceLabelCompactStyle: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  color: "var(--brass)",
};

const digitsConfidenceTrackStyle: CSSProperties = {
  position: "relative",
  height: 6,
  background: "rgba(181, 137, 33, 0.1)",
  overflow: "hidden",
};

const digitsConfidenceValueCompactStyle: CSSProperties = {
  fontSize: 9,
  textAlign: "right",
  color: "var(--text)",
  fontWeight: 700,
};

const digitsConfidencePlaceholderCompactStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 8,
  textAlign: "center",
  color: "var(--text)",
  fontSize: 10,
  border: "1px dashed var(--accent-border)",
  background: "rgba(181, 137, 33, 0.03)",
};

/* ---------- Legend ---------- */

const legendStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
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

const placeholderStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text)",
  fontSize: 11,
  background: "rgba(181, 137, 33, 0.03)",
  textAlign: "center",
  padding: 16,
  boxSizing: "border-box",
  border: "1px dashed var(--accent-border)",
};

function digitResultBadgeStyle(
  status: "correct" | "incorrect" | "neutral",
): CSSProperties {
  if (status === "correct") {
    return {
      alignSelf: "flex-start",
      padding: "4px 8px",
      fontSize: 10,
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: CORRECT_COLOR,
      background: "rgba(63, 185, 80, 0.1)",
      border: "1px solid rgba(63, 185, 80, 0.25)",
    };
  }

  if (status === "incorrect") {
    return {
      alignSelf: "flex-start",
      padding: "4px 8px",
      fontSize: 10,
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: INCORRECT_COLOR,
      background: "rgba(221, 68, 68, 0.08)",
      border: "1px solid rgba(221, 68, 68, 0.2)",
    };
  }

  return {
    alignSelf: "flex-start",
    padding: "4px 8px",
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text)",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid var(--border)",
  };
}

function digitsConfidenceFillStyle(
  value: number,
  isPredicted: boolean,
  isTruth: boolean,
): CSSProperties {
  const width = `${Math.max(0, Math.min(1, value)) * 100}%`;
  const background = isTruth
    ? DIGITS_TRUTH_COLOR
    : isPredicted
      ? DIGITS_PREDICTED_COLOR
      : "rgba(181, 137, 33, 0.3)";

  return {
    width,
    height: "100%",
    background,
  };
}

function pagerButtonStyle(disabled: boolean): CSSProperties {
  return {
    padding: "4px 8px",
    border: disabled ? "1px solid var(--border)" : "1px solid var(--brass)",
    background: disabled ? "transparent" : "var(--brass)",
    color: disabled ? "var(--text)" : "#000",
    cursor: disabled ? "not-allowed" : "pointer",
    minWidth: 28,
    fontWeight: 800,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    opacity: disabled ? 0.4 : 1,
    transition: "all 0.1s",
    lineHeight: 1,
  };
}

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
  };
}
