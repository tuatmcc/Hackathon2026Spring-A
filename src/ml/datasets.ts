// ============================================================
// データセット生成
//
// 【担当者へ】
// 新しいデータセットを追加するには:
//   1. generate___Data 関数を書く
//   2. GENERATORS に登録する
// ============================================================

import * as tf from "@tensorflow/tfjs";

export interface Dataset {
  xs: tf.Tensor;
  ys: tf.Tensor;
}

/** 線形分離可能なデータ */
export function generateLinearData(numSamples = 200): Dataset {
  const xs = tf.randomUniform([numSamples, 2], -1, 1);
  const ys = tf.tidy(() => {
    const labels = xs.slice([0, 0], [-1, 1]).greater(0).cast("float32");
    return labels.reshape([numSamples, 1]);
  });
  return { xs, ys };
}

/** XOR データ */
export function generateXORData(numSamples = 200): Dataset {
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
  const xs = tf.randomUniform([numSamples, 2], -1, 1);
  const ys = tf.tidy(() => {
    const r2 = xs.square().sum(1);
    const labels = r2.less(0.5).cast("float32");
    return labels.reshape([numSamples, 1]);
  });
  return { xs, ys };
}

/** スパイラルデータ — TODO: 実装 */
export function generateSpiralData(numSamples = 200): Dataset {
  // スタブ: 円形データで代用
  return generateCircleData(numSamples);
}

// ---------- レジストリ ----------

const GENERATORS: Record<string, (n?: number) => Dataset> = {
  linear: generateLinearData,
  xor: generateXORData,
  circle: generateCircleData,
  spiral: generateSpiralData,
};

export function getDatasetGenerator(
  datasetId: string,
): (n?: number) => Dataset {
  const gen = GENERATORS[datasetId];
  if (!gen) throw new Error(`Unknown dataset: ${datasetId}`);
  return gen;
}
