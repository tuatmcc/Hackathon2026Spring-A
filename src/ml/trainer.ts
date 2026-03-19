import * as tf from "@tensorflow/tfjs";
import type { Dataset } from "./datasets";
import type { TrainingMetrics } from "../types";
import { createShuffledIndices } from "./random";

export interface TrainOptions {
  epochs: number;
  batchSize: number;
  validationSplit?: number;
  shuffleBeforeSplit?: boolean;
  seed?: number;
  signal?: AbortSignal;
  onEpochEnd?: (metrics: TrainingMetrics) => void;
}

export interface TrainResult {
  finalLoss: number;
  finalAccuracy?: number;
}

function getMetricValue(
  source: Record<string, number | undefined>,
  keys: string[],
) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number") {
      return value;
    }
  }

  return undefined;
}

function getHistoryMetric(
  history: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const values = history[key];
    if (Array.isArray(values) && values.length > 0) {
      return values;
    }
  }

  return undefined;
}

function shuffleDataset(dataset: Dataset, seed?: number): Dataset {
  const sampleCount = dataset.xs.shape[0];
  const shuffledIndices =
    seed == null
      ? tf.util.createShuffledIndices(sampleCount)
      : createShuffledIndices(sampleCount, seed);
  const indexTensor = tf.tensor1d(Array.from(shuffledIndices), "int32");

  try {
    return {
      xs: tf.gather(dataset.xs, indexTensor),
      ys: tf.gather(dataset.ys, indexTensor),
    };
  } finally {
    indexTensor.dispose();
  }
}

export async function trainModel(
  model: tf.LayersModel,
  dataset: Dataset,
  options: TrainOptions,
): Promise<TrainResult> {
  const {
    epochs,
    batchSize,
    validationSplit = 0.2,
    shuffleBeforeSplit = true,
    seed,
    signal,
    onEpochEnd,
  } = options;

  if (signal?.aborted) {
    throw new Error("Training aborted");
  }

  const trainingDataset =
    shuffleBeforeSplit && (validationSplit > 0 || seed != null)
      ? shuffleDataset(dataset, seed)
      : dataset;

  try {
    const history = await model.fit(trainingDataset.xs, trainingDataset.ys, {
      epochs,
      batchSize,
      validationSplit,
      shuffle: seed == null,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (signal?.aborted) {
            model.stopTraining = true;
            throw new Error("Training aborted");
          }
          if (onEpochEnd && logs) {
            const metrics = logs as Record<string, number | undefined>;
            onEpochEnd({
              epoch,
              loss: metrics["loss"] ?? 0,
              valLoss: metrics["val_loss"],
              accuracy: getMetricValue(metrics, ["accuracy", "acc"]),
              valAccuracy: getMetricValue(metrics, ["val_accuracy", "val_acc"]),
            });
          }
        },
      },
    });

    const historyEntries = history.history as Record<string, unknown>;
    const losses = getHistoryMetric(historyEntries, ["loss"]) ?? [];
    const accuracies =
      getHistoryMetric(historyEntries, ["val_accuracy", "val_acc"]) ??
      getHistoryMetric(historyEntries, ["accuracy", "acc"]);

    return {
      finalLoss: (losses[losses.length - 1] as number) ?? 0,
      finalAccuracy: accuracies
        ? (accuracies[accuracies.length - 1] as number)
        : undefined,
    };
  } finally {
    if (trainingDataset !== dataset) {
      trainingDataset.xs.dispose();
      trainingDataset.ys.dispose();
    }
  }
}
