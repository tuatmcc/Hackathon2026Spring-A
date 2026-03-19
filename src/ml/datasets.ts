// ============================================================
// データセット生成 (スタブ)
// 実装担当者: ここに各ステージ用のデータ生成ロジックを実装
// ============================================================

import * as tf from "@tensorflow/tfjs";

export interface Dataset {
  xs: tf.Tensor;
  ys: tf.Tensor;
}

/** 線形分離可能なデータ */
export function generateLinearData(numSamples = 200): Dataset {
  // TODO: 実装。仮で乱数を返す
  const xs = tf.randomUniform([numSamples, 2], -1, 1);
  const ys = tf.tidy(() => {
    const labels = xs.slice([0, 0], [-1, 1]).greater(0).cast("float32");
    return labels.reshape([numSamples, 1]);
  });
  return { xs, ys };
}

/** XOR データ */
export function generateXORData(numSamples = 200): Dataset {
  // TODO: 実装。仮で乱数を返す
  const xs = tf.randomUniform([numSamples, 2], -1, 1);
  const ys = tf.tidy(() => {
    const col0 = xs.slice([0, 0], [-1, 1]);
    const col1 = xs.slice([0, 1], [-1, 1]);
    const labels = col0.greater(0).logicalXor(col1.greater(0)).cast("float32");
    return labels.reshape([numSamples, 1]);
  });
  return { xs, ys };
}

/** 円形分離データ */
export function generateCircleData(numSamples = 200): Dataset {
  // TODO: 実装。仮で乱数を返す
  const xs = tf.randomUniform([numSamples, 2], -1, 1);
  const ys = tf.tidy(() => {
    const r2 = xs.square().sum(1);
    const labels = r2.less(0.5).cast("float32");
    return labels.reshape([numSamples, 1]);
  });
  return { xs, ys };
}

/** datasetId からジェネレータを引く */
const GENERATORS: Record<string, (n?: number) => Dataset> = {
  linear: generateLinearData,
  xor: generateXORData,
  circle: generateCircleData,
};

export function getDatasetGenerator(
  datasetId: string,
): (n?: number) => Dataset {
  const gen = GENERATORS[datasetId];
  if (!gen) throw new Error(`Unknown dataset: ${datasetId}`);
  return gen;
}
