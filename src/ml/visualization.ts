import * as tf from "@tensorflow/tfjs";
import type {
  DecisionBoundarySnapshot,
  SerializedDataset,
  VisualizationDomain,
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

export function serializeDataset(
  dataset: Dataset,
  stage: StageDef,
): SerializedDataset {
  return {
    sampleCount: dataset.xs.shape[0] ?? 0,
    inputShape: [...stage.inputShape],
    outputUnits: stage.outputUnits,
    xs: Array.from(dataset.xs.dataSync()),
    ys: Array.from(dataset.ys.dataSync()),
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
    gridSize,
    values,
    domain,
    epoch: options?.epoch,
  };
}
