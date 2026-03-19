// ============================================================
// 学習ループ
//
// 【担当者へ】
// React を import しない。純粋な async 関数。
// PlayPage (コントローラ) から呼ばれる。
// ============================================================

import * as tf from "@tensorflow/tfjs";
import type { Dataset } from "./datasets";
import type { TrainingMetrics } from "../types";

export interface TrainOptions {
  epochs: number;
  batchSize: number;
  onEpochEnd?: (metrics: TrainingMetrics) => void;
}

export interface TrainResult {
  finalLoss: number;
  finalAccuracy?: number;
}

/**
 * モデルを学習させる。
 * epoch ごとに onEpochEnd コールバックで指標を返す。
 */
export async function trainModel(
  model: tf.LayersModel,
  dataset: Dataset,
  options: TrainOptions,
): Promise<TrainResult> {
  const { epochs, batchSize, onEpochEnd } = options;

  const history = await model.fit(dataset.xs, dataset.ys, {
    epochs,
    batchSize,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
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
