import * as tf from "@tensorflow/tfjs";
import type {
  DecisionBoundarySnapshot,
  DigitsPredictionSnapshot,
  RegressionCurveSnapshot,
  SerializedDataset,
  VisualizationDomain,
  VisualizationSnapshot,
} from "../types/visualizationTypes";
import type { StageDef } from "../types";
import type { Dataset } from "./datasets";

export const DEFAULT_VISUALIZATION_DOMAIN: VisualizationDomain = {
  minX: -1.2,
  maxX: 1.2,
  minY: -1.2,
  maxY: 1.2,
};

export const DEFAULT_BOUNDARY_GRID_SIZE = 36;
export const DEFAULT_REGRESSION_CURVE_POINTS = 96;

export function serializeDataset(
  dataset: Dataset,
  stage: StageDef,
): SerializedDataset {
  const ys = Array.from(dataset.ys.dataSync());

  return {
    sampleCount: dataset.xs.shape[0] ?? 0,
    inputShape: [...stage.inputShape],
    outputUnits: stage.outputUnits,
    xs: Array.from(dataset.xs.dataSync()),
    ys,
    labels: extractLabels(ys, stage.outputUnits, dataset.xs.shape[0] ?? 0),
    imageShape: stage.inputShape.length >= 2 ? [...stage.inputShape] : null,
  };
}

export function deserializeDataset(dataset: SerializedDataset): Dataset {
  return {
    xs: tf.tensor(dataset.xs, [dataset.sampleCount, ...dataset.inputShape]),
    ys: tf.tensor(dataset.ys, [dataset.sampleCount, dataset.outputUnits]),
  };
}

export function createDecisionBoundarySnapshot(
  model: tf.LayersModel,
  stage: StageDef,
  options?: {
    domain?: VisualizationDomain;
    gridSize?: number;
    epoch?: number;
  },
): DecisionBoundarySnapshot | null {
  if (stage.inputShape.length !== 1 || stage.inputShape[0] !== 2) {
    return null;
  }

  const domain = options?.domain ?? DEFAULT_VISUALIZATION_DOMAIN;
  const gridSize = options?.gridSize ?? DEFAULT_BOUNDARY_GRID_SIZE;
  const samples: number[] = [];

  for (let row = 0; row < gridSize; row++) {
    const y =
      domain.maxY -
      (row / Math.max(gridSize - 1, 1)) * (domain.maxY - domain.minY);

    for (let col = 0; col < gridSize; col++) {
      const x =
        domain.minX +
        (col / Math.max(gridSize - 1, 1)) * (domain.maxX - domain.minX);
      samples.push(x, y);
    }
  }

  const values = tf.tidy(() => {
    const gridTensor = tf.tensor2d(samples, [gridSize * gridSize, 2]);
    const prediction = model.predict(gridTensor) as tf.Tensor;
    const flattened =
      stage.taskType === "multiclass"
        ? prediction.max(-1)
        : prediction.reshape([gridSize * gridSize]);

    return Array.from(flattened.dataSync()).map((value) =>
      Number.isFinite(value) ? value : 0,
    );
  });

  return {
    kind: "boundary",
    gridSize,
    values,
    domain,
    epoch: options?.epoch,
  };
}

export function createDigitsPredictionSnapshot(
  model: tf.LayersModel,
  dataset: Dataset,
  stage: StageDef,
  options?: {
    epoch?: number;
  },
): DigitsPredictionSnapshot | null {
  if (!isDigitsStage(stage)) {
    return null;
  }

  const predictions = tf.tidy(() => {
    const predictionTensor = model.predict(dataset.xs) as tf.Tensor;
    const labelTensor = predictionTensor.argMax(-1);
    const confidenceTensor = predictionTensor.max(-1);
    const targetTensor = dataset.ys.argMax(-1);
    const predictionValues = Array.from(predictionTensor.dataSync());

    const predictedLabels = Array.from(labelTensor.dataSync());
    const confidences = Array.from(confidenceTensor.dataSync());
    const targetLabels = Array.from(targetTensor.dataSync());

    return predictedLabels.map((predictedLabel, index) => ({
      sampleIndex: index,
      predictedLabel,
      confidence: Number.isFinite(confidences[index] ?? NaN)
        ? confidences[index] ?? 0
        : 0,
      classConfidences: Array.from(
        { length: stage.outputUnits },
        (_, unit) => predictionValues[index * stage.outputUnits + unit] ?? 0,
      ).map((value) => (Number.isFinite(value) ? value : 0)),
      isCorrect: predictedLabel === (targetLabels[index] ?? -1),
    }));
  });

  return {
    kind: "digits",
    predictions,
    epoch: options?.epoch,
  };
}

export function createRegressionCurveSnapshot(
  model: tf.LayersModel,
  dataset: Dataset,
  stage: StageDef,
  options?: {
    epoch?: number;
    pointCount?: number;
  },
): RegressionCurveSnapshot | null {
  if (!isRegressionCurveStage(stage)) {
    return null;
  }

  const sampleXs = Array.from(dataset.xs.dataSync());
  const sampleYs = Array.from(dataset.ys.dataSync());
  const xMin = Math.min(...sampleXs);
  const xMax = Math.max(...sampleXs);
  const pointCount = options?.pointCount ?? DEFAULT_REGRESSION_CURVE_POINTS;
  const inputXs = Array.from({ length: pointCount }, (_, index) => {
    if (pointCount <= 1) {
      return xMin;
    }

    return xMin + (index / (pointCount - 1)) * (xMax - xMin);
  });

  const predictedYs = tf.tidy(() => {
    const inputTensor = tf.tensor2d(inputXs, [inputXs.length, 1]);
    const prediction = model.predict(inputTensor) as tf.Tensor;
    const flattened = prediction.reshape([inputXs.length]);

    return Array.from(flattened.dataSync()).map((value) =>
      Number.isFinite(value) ? value : 0,
    );
  });

  const domain = createVisualizationDomain(
    inputXs,
    sampleYs.concat(predictedYs),
  );

  return {
    kind: "regression",
    predictedPoints: inputXs.map((x, index) => ({
      x,
      y: predictedYs[index] ?? 0,
    })),
    domain,
    epoch: options?.epoch,
  };
}

export function createVisualizationSnapshot(
  model: tf.LayersModel,
  dataset: Dataset,
  stage: StageDef,
  options?: {
    domain?: VisualizationDomain;
    gridSize?: number;
    epoch?: number;
  },
): VisualizationSnapshot | null {
  if (isTwoDimensionalStage(stage)) {
    return createDecisionBoundarySnapshot(model, stage, options);
  }

  if (isDigitsStage(stage)) {
    return createDigitsPredictionSnapshot(model, dataset, stage, options);
  }

  if (isRegressionCurveStage(stage)) {
    return createRegressionCurveSnapshot(model, dataset, stage, options);
  }

  return null;
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

function isRegressionCurveStage(stage: StageDef) {
  return (
    stage.taskType === "regression" &&
    stage.inputShape.length === 1 &&
    stage.inputShape[0] === 1
  );
}

function createVisualizationDomain(xs: number[], ys: number[]): VisualizationDomain {
  const [minX, maxX] = expandRange(Math.min(...xs), Math.max(...xs), 0.08, 0.2);
  const [minY, maxY] = expandRange(Math.min(...ys), Math.max(...ys), 0.12, 0.4);

  return {
    minX,
    maxX,
    minY,
    maxY,
  };
}

function expandRange(
  minValue: number,
  maxValue: number,
  paddingRatio: number,
  fallbackSpan: number,
): [number, number] {
  const safeMin = Number.isFinite(minValue) ? minValue : 0;
  const safeMax = Number.isFinite(maxValue) ? maxValue : 0;
  const span = Math.max(safeMax - safeMin, fallbackSpan);
  const center = (safeMin + safeMax) / 2;
  const normalizedMin = safeMax > safeMin ? safeMin : center - span / 2;
  const normalizedMax = safeMax > safeMin ? safeMax : center + span / 2;
  const padding = span * paddingRatio;

  return [normalizedMin - padding, normalizedMax + padding];
}

function extractLabels(
  ys: number[],
  outputUnits: number,
  sampleCount: number,
) {
  const labels: number[] = [];

  for (let index = 0; index < sampleCount; index++) {
    labels.push(readLabel(ys, index * outputUnits, outputUnits));
  }

  return labels;
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
