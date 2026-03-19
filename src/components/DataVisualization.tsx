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

interface ScatterPoint {
  x: number;
  y: number;
  label: number;
}

export interface RegressionSamplePoint {
  x: number;
  y: number;
}

export interface DigitsSampleItem {
  index: number;
  pixels: number[];
  label: number;
  predictedLabel: number | null;
  confidence: number | null;
  classConfidences: number[];
  isCorrect: boolean | null;
}

const POSITIVE_COLOR = [170, 59, 255] as const;
const NEGATIVE_COLOR = [104, 113, 150] as const;
const CORRECT_COLOR = "#12704c";
const INCORRECT_COLOR = "#ab4d1f";
const DIGITS_CARD_BACKGROUND = "#0f1420";
const DIGITS_CARD_FOREGROUND = "#f5f7ff";
const DIGITS_PREDICTED_COLOR = "var(--accent)";
const DIGITS_TRUTH_COLOR = CORRECT_COLOR;
const REGRESSION_LINE_COLOR = "var(--accent)";
const REGRESSION_TARGET_COLOR = "#687196";
const VIEWBOX_SIZE = 100;
const DIGITS_VIEWBOX_SIZE = 8;
const DEFAULT_DOMAIN: VisualizationDomain = {
  minX: -1.2,
  maxX: 1.2,
  minY: -1.2,
  maxY: 1.2,
};
const DEFAULT_REGRESSION_DOMAIN: VisualizationDomain = {
  minX: -1.1,
  maxX: 1.1,
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
  const [digitsSampleIndex, setDigitsSampleIndex] = useState(0);
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

  useEffect(() => {
    setDigitsSampleIndex(0);
  }, [activeDataset?.sampleCount, stage?.id]);

  const points = useMemo(() => {
    if (!stage || !activeDataset || !isTwoDimensionalStage(stage)) {
      return [];
    }

    return extractScatterPoints(activeDataset);
  }, [activeDataset, stage]);

  const digitsSampleCount = activeDataset?.sampleCount ?? 0;
  const clampedDigitsSampleIndex = getClampedDigitsSampleIndex(
    digitsSampleIndex,
    digitsSampleCount,
  );

  useEffect(() => {
    if (digitsSampleIndex !== clampedDigitsSampleIndex) {
      setDigitsSampleIndex(clampedDigitsSampleIndex);
    }
  }, [clampedDigitsSampleIndex, digitsSampleIndex]);

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
      () => setDigitsSampleIndex((current) => current - 1),
      () => setDigitsSampleIndex((current) => current + 1),
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
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>Visualizer</div>
          <strong>{stage.name}</strong>
        </div>
      </div>
      <div style={placeholderStyle}>
        `inputShape=[2]`、`inputShape=[1]`、`inputShape=[8,8,1]` のステージで可視化できます。
      </div>
    </div>
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
      ? `Epoch ${snapshot.epoch}`
      : trainingStatus === "training"
        ? "Training"
        : "Untrained";

  const statusLabel =
    snapshot != null
      ? trainingStatus === "training"
        ? "Live function fit"
        : "Latest function fit"
      : "Dataset preview";

  const targetPath = buildCurvePath(samplePoints, plottingDomain);
  const predictionPath = buildCurvePath(
    snapshot?.predictedPoints ?? [],
    plottingDomain,
  );

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
          <span style={metricLabelStyle}>Mode</span>
          <strong>{statusLabel}</strong>
        </div>
        <div style={metricCardStyle}>
          <span style={metricLabelStyle}>Samples</span>
          <strong>{samplePoints.length}</strong>
        </div>
        <div style={metricCardStyle}>
          <span style={metricLabelStyle}>Target Loss</span>
          <strong>{formatScalar(stage.targetLoss)}</strong>
        </div>
        <div style={metricCardStyle}>
          <span style={metricLabelStyle}>Val Loss</span>
          <strong>{formatScalar(lossLabel)}</strong>
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
          Target function
        </div>
        <div style={legendItemStyle}>
          <span style={{ ...legendDotStyle, background: REGRESSION_LINE_COLOR }} />
          Model prediction
        </div>
        <div style={legendHintStyle}>
          点群は訓練サンプル、線は目標関数と推論結果です。
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
      ? `Epoch ${snapshot.epoch}`
      : trainingStatus === "training"
        ? "Training"
        : "Untrained";

  const statusLabel =
    snapshot != null
      ? trainingStatus === "training"
        ? "Live predictions"
        : "Latest predictions"
      : "Dataset preview";

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
          <span style={metricLabelStyle}>Mode</span>
          <strong>{statusLabel}</strong>
        </div>
        <div style={metricCardStyle}>
          <span style={metricLabelStyle}>Sample</span>
          <strong>{sampleCount > 0 ? `${sampleIndex + 1}/${sampleCount}` : "--"}</strong>
        </div>
        <div style={metricCardStyle}>
          <span style={metricLabelStyle}>Truth</span>
          <strong>{sample ? sample.label : "--"}</strong>
        </div>
        <div style={metricCardStyle}>
          <span style={metricLabelStyle}>Val Acc</span>
          <strong>
            {accuracyLabel != null ? `${(accuracyLabel * 100).toFixed(1)}%` : "--"}
          </strong>
        </div>
      </div>

      <div style={surfaceFrameStyle}>
        <div style={digitsSingleLayoutStyle}>
          <article style={digitPreviewCardStyle}>
            <div style={digitCardHeaderStyle}>
              <span style={digitIndexStyle}>
                {sampleCount > 0 ? `#${sampleIndex + 1}` : "No sample"}
              </span>
              <span style={digitLabelChipStyle}>
                GT {sample ? sample.label : "--"}
              </span>
            </div>

            <svg
              viewBox={`0 0 ${DIGITS_VIEWBOX_SIZE} ${DIGITS_VIEWBOX_SIZE}`}
              preserveAspectRatio="none"
              style={digitPreviewSvgStyle}
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

            <div style={digitMetaStyle}>
              <div>Truth {sample ? sample.label : "--"}</div>
              <div>
                Pred {sample?.predictedLabel != null ? sample.predictedLabel : "--"}
              </div>
              <div>
                Max Conf{" "}
                {sample?.confidence != null
                  ? `${(sample.confidence * 100).toFixed(1)}%`
                  : "--"}
              </div>
            </div>

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
                ? "Prediction pending"
                : sample.isCorrect
                  ? "Correct"
                  : "Incorrect"}
            </div>
          </article>

          <section style={digitsConfidenceCardStyle}>
            <div style={digitsConfidenceHeaderStyle}>
              <strong>Confidence Array</strong>
              <span style={digitsConfidenceHintStyle}>classes 0-9</span>
            </div>

            {sample && sample.classConfidences.length > 0 ? (
              <div style={digitsConfidenceListStyle}>
                {sample.classConfidences.map((confidence, label) => (
                  <div
                    key={`confidence-${sample.index}-${label}`}
                    style={digitsConfidenceRowStyle}
                  >
                    <span style={digitsConfidenceLabelStyle}>{label}</span>
                    <div style={digitsConfidenceTrackStyle}>
                      <div
                        style={digitsConfidenceFillStyle(
                          confidence,
                          label === sample.predictedLabel,
                          label === sample.label,
                        )}
                      />
                    </div>
                    <strong style={digitsConfidenceValueStyle}>
                      {(confidence * 100).toFixed(1)}%
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <div style={digitsConfidencePlaceholderStyle}>
                学習後に各クラスの確信度配列を表示します。
              </div>
            )}
          </section>
        </div>
      </div>

      <div style={pagerStyle}>
        <button
          type="button"
          onClick={onPreviousSample}
          disabled={sampleIndex <= 0}
          style={pagerButtonStyle(sampleIndex <= 0)}
        >
          Prev
        </button>
        <div style={pagerStatusStyle}>
          {sampleCount > 0
            ? `Sample ${sampleIndex + 1} / ${sampleCount}`
            : "No samples"}
        </div>
        <button
          type="button"
          onClick={onNextSample}
          disabled={sampleIndex >= sampleCount - 1}
          style={pagerButtonStyle(sampleIndex >= sampleCount - 1)}
        >
          Next
        </button>
      </div>

      <div style={legendStyle}>
        <div style={legendItemStyle}>
          <span
            style={{ ...legendDotStyle, background: "rgba(255, 255, 255, 0.8)" }}
          />
          Brighter pixels indicate stronger strokes
        </div>
        <div style={legendItemStyle}>
          <span style={{ ...legendDotStyle, background: DIGITS_TRUTH_COLOR }} />
          Ground truth class
        </div>
        <div style={legendItemStyle}>
          <span style={{ ...legendDotStyle, background: DIGITS_PREDICTED_COLOR }} />
          Predicted class
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

export function getClampedDigitsSampleIndex(
  sampleIndex: number,
  sampleCount: number,
) {
  if (sampleCount <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(sampleIndex, sampleCount - 1));
}

export function extractDigitsSample(
  dataset: SerializedDataset,
  snapshot: DigitsPredictionSnapshot | null,
  sampleIndex: number,
): DigitsSampleItem | null {
  if (dataset.sampleCount <= 0) {
    return null;
  }

  const clampedSampleIndex = getClampedDigitsSampleIndex(
    sampleIndex,
    dataset.sampleCount,
  );
  const sampleSize = dataset.inputShape.reduce(
    (product, dimension) => product * dimension,
    1,
  );
  const sampleOffset = clampedSampleIndex * sampleSize;
  const prediction = snapshot?.predictions[clampedSampleIndex];

  return {
    index: clampedSampleIndex,
    pixels: dataset.xs.slice(sampleOffset, sampleOffset + sampleSize),
    label: dataset.labels[clampedSampleIndex] ?? 0,
    predictedLabel: prediction?.predictedLabel ?? null,
    confidence: prediction?.confidence ?? null,
    classConfidences: prediction?.classConfidences ?? [],
    isCorrect: prediction?.isCorrect ?? null,
  };
}

export function extractRegressionSamplePoints(
  dataset: SerializedDataset,
): RegressionSamplePoint[] {
  const points: RegressionSamplePoint[] = [];

  for (let index = 0; index < dataset.sampleCount; index++) {
    points.push({
      x: dataset.xs[index] ?? 0,
      y: dataset.ys[index] ?? 0,
    });
  }

  return points.sort((left, right) => left.x - right.x);
}

export function getRegressionDomainFromSamplePoints(
  points: RegressionSamplePoint[],
): VisualizationDomain {
  if (points.length === 0) {
    return DEFAULT_REGRESSION_DOMAIN;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    minX: expandDomainEdge(Math.min(...xs), Math.max(...xs), 0.08, 0.2, "min"),
    maxX: expandDomainEdge(Math.min(...xs), Math.max(...xs), 0.08, 0.2, "max"),
    minY: expandDomainEdge(Math.min(...ys), Math.max(...ys), 0.12, 0.4, "min"),
    maxY: expandDomainEdge(Math.min(...ys), Math.max(...ys), 0.12, 0.4, "max"),
  };
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

function expandDomainEdge(
  minValue: number,
  maxValue: number,
  paddingRatio: number,
  fallbackSpan: number,
  edge: "min" | "max",
) {
  const safeMin = Number.isFinite(minValue) ? minValue : 0;
  const safeMax = Number.isFinite(maxValue) ? maxValue : 0;
  const span = Math.max(safeMax - safeMin, fallbackSpan);
  const center = (safeMin + safeMax) / 2;
  const normalizedMin = safeMax > safeMin ? safeMin : center - span / 2;
  const normalizedMax = safeMax > safeMin ? safeMax : center + span / 2;
  const padding = span * paddingRatio;

  return edge === "min"
    ? normalizedMin - padding
    : normalizedMax + padding;
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
  gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
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

const digitsSingleLayoutStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  padding: 16,
  alignItems: "stretch",
};

const digitPreviewCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  background: "rgba(15, 20, 32, 0.96)",
  color: DIGITS_CARD_FOREGROUND,
};

const digitCardHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const digitIndexStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(245, 247, 255, 0.72)",
};

const digitLabelChipStyle: CSSProperties = {
  padding: "2px 7px",
  borderRadius: 999,
  background: "rgba(255, 255, 255, 0.1)",
  fontSize: 11,
};

const digitPreviewSvgStyle: CSSProperties = {
  display: "block",
  width: "100%",
  maxWidth: 260,
  alignSelf: "center",
  aspectRatio: "1 / 1",
  borderRadius: 12,
  imageRendering: "pixelated",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
};

const digitMetaStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 12,
  color: "rgba(245, 247, 255, 0.86)",
};

const digitsConfidenceCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  background: "rgba(255, 255, 255, 0.04)",
};

const digitsConfidenceHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 8,
  color: "var(--text)",
};

const digitsConfidenceHintStyle: CSSProperties = {
  fontSize: 12,
  color: "rgba(107, 99, 117, 0.88)",
};

const digitsConfidenceListStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const digitsConfidenceRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "24px minmax(0, 1fr) 56px",
  alignItems: "center",
  gap: 10,
};

const digitsConfidenceLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text)",
};

const digitsConfidenceTrackStyle: CSSProperties = {
  position: "relative",
  height: 10,
  borderRadius: 999,
  background: "rgba(107, 99, 117, 0.12)",
  overflow: "hidden",
};

const digitsConfidenceValueStyle: CSSProperties = {
  fontSize: 12,
  textAlign: "right",
  color: "var(--text)",
};

const digitsConfidencePlaceholderStyle: CSSProperties = {
  minHeight: 160,
  borderRadius: 12,
  border: "1px dashed var(--border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  textAlign: "center",
  color: "var(--text)",
  background: "rgba(107, 99, 117, 0.04)",
};

const pagerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 12,
};

const pagerStatusStyle: CSSProperties = {
  fontSize: 12,
  color: "var(--text)",
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

function digitResultBadgeStyle(
  status: "correct" | "incorrect" | "neutral",
): CSSProperties {
  if (status === "correct") {
    return {
      alignSelf: "flex-start",
      padding: "4px 8px",
      borderRadius: 999,
      fontSize: 11,
      color: CORRECT_COLOR,
      background: "rgba(18, 112, 76, 0.18)",
      border: "1px solid rgba(18, 112, 76, 0.28)",
    };
  }

  if (status === "incorrect") {
    return {
      alignSelf: "flex-start",
      padding: "4px 8px",
      borderRadius: 999,
      fontSize: 11,
      color: INCORRECT_COLOR,
      background: "rgba(171, 77, 31, 0.18)",
      border: "1px solid rgba(171, 77, 31, 0.24)",
    };
  }

  return {
    alignSelf: "flex-start",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 11,
    color: DIGITS_CARD_FOREGROUND,
    background: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
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
      : "rgba(107, 99, 117, 0.5)";

  return {
    width,
    height: "100%",
    borderRadius: 999,
    background,
  };
}

function pagerButtonStyle(disabled: boolean): CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: disabled ? "var(--accent-bg)" : "var(--bg)",
    color: disabled ? "rgba(107, 99, 117, 0.48)" : "var(--text)",
    cursor: disabled ? "not-allowed" : "pointer",
    minWidth: 72,
  };
}

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
            background: "rgba(255, 159, 67, 0.14)",
            border: "rgba(255, 159, 67, 0.24)",
          }
        : trainingStatus === "training"
          ? {
              color: "var(--accent)",
              background: "rgba(170, 59, 255, 0.12)",
              border: "rgba(170, 59, 255, 0.22)",
            }
          : {
              color: "var(--text)",
              background: "var(--accent-bg)",
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
  };
}
