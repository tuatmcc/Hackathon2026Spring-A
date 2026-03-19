import * as tf from "@tensorflow/tfjs";
import type { Dataset } from "./datasets";
import type { TrainingMetrics } from "../types";

export interface TrainOptions {
  epochs: number;
  batchSize: number;
  validationSplit?: number;
  signal?: AbortSignal;
  onEpochEnd?: (metrics: TrainingMetrics) => void;
}

export interface TrainResult {
  finalLoss: number;
  finalAccuracy?: number;
}

export async function trainModel(
  model: tf.LayersModel,
  dataset: Dataset,
  options: TrainOptions,
): Promise<TrainResult> {
  const { epochs, batchSize, validationSplit = 0.2, signal, onEpochEnd } = options;

  if (signal?.aborted) {
    throw new Error("Training aborted");
  }

  const history = await model.fit(dataset.xs, dataset.ys, {
    epochs,
    batchSize,
    validationSplit,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (signal?.aborted) {
          model.stopTraining = true;
          throw new Error("Training aborted");
        }
        if (onEpochEnd && logs) {
          onEpochEnd({
            epoch,
            loss: logs["loss"] ?? 0,
            valLoss: logs["val_loss"] as number | undefined,
            accuracy: logs["acc"] as number | undefined,
            valAccuracy: logs["val_acc"] as number | undefined,
          });
        }
      },
    },
  });

  const losses = history.history["loss"];
  const accs = history.history["val_acc"] ?? history.history["acc"];

  return {
    finalLoss: (losses[losses.length - 1] as number) ?? 0,
    finalAccuracy: accs ? (accs[accs.length - 1] as number) : undefined,
  };
}
