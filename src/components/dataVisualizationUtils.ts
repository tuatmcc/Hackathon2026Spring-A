import type {
  DigitsPredictionSnapshot,
  SerializedDataset,
  VisualizationDomain,
} from "../types/visualizationTypes";

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

const DEFAULT_REGRESSION_DOMAIN: VisualizationDomain = {
  minX: -1.1,
  maxX: 1.1,
  minY: -1.2,
  maxY: 1.2,
};

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

function expandDomainEdge(
  minValue: number,
  maxValue: number,
  ratio: number,
  minimumPadding: number,
  edge: "min" | "max",
) {
  const span = maxValue - minValue;
  const padding = Math.max(span * ratio, minimumPadding);

  return edge === "min" ? minValue - padding : maxValue + padding;
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
