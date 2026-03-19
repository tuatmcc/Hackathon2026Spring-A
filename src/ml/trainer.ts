// ============================================================
// 学習ループ (スタブ)
// 実装担当者: ここにモデル学習・評価・停止ロジックを実装
// ============================================================

import * as tf from "@tensorflow/tfjs";
import type { Dataset } from "./datasets";
import type { TrainingMetrics } from "../types";

export interface TrainOptions {
  epochs: number;
  learningRate: number;
  onEpochEnd?: (metrics: TrainingMetrics) => void;
}

/**
 * モデルを学習させる。
 * epoch ごとに onEpochEnd コールバックで指標を返す。
 * 戻り値は最終 loss。
 */
export async function trainModel(
  model: tf.LayersModel,
  dataset: Dataset,
  options: TrainOptions,
): Promise<number> {
  const { epochs, onEpochEnd } = options;

  const history = await model.fit(dataset.xs, dataset.ys, {
    epochs,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (onEpochEnd && logs) {
          onEpochEnd({
            epoch,
            loss: logs["loss"] ?? 0,
            accuracy: logs["acc"] as number | undefined,
          });
        }
      },
    },
  });

  const finalLoss = history.history["loss"];
  return (finalLoss[finalLoss.length - 1] as number) ?? 0;
}
