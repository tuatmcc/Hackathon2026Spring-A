import * as tf from "@tensorflow/tfjs";

export interface Dataset {
  xs: tf.Tensor;
  ys: tf.Tensor;
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/** 線形分離可能なデータ */
export function generateLinearData(numSamples = 200): Dataset {
  const xsData: number[] = [];
  const ysData: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    const x = rand(-1, 1);
    const y = rand(-1, 1);
    xsData.push(x, y);
    ysData.push(x > 0 ? 1 : 0);
  }

  return {
    xs: tf.tensor2d(xsData, [numSamples, 2]),
    ys: tf.tensor2d(ysData, [numSamples, 1]),
  };
}

/** XOR データ */
export function generateXORData(numSamples = 200): Dataset {
  const xsData: number[] = [];
  const ysData: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    const x = rand(-1, 1);
    const y = rand(-1, 1);
    xsData.push(x, y);
    const label = (x > 0) !== (y > 0) ? 1 : 0;
    ysData.push(label);
  }

  return {
    xs: tf.tensor2d(xsData, [numSamples, 2]),
    ys: tf.tensor2d(ysData, [numSamples, 1]),
  };
}

/** 円形分離データ */
export function generateCircleData(numSamples = 200): Dataset {
  const xsData: number[] = [];
  const ysData: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    const x = rand(-1, 1);
    const y = rand(-1, 1);
    xsData.push(x, y);
    const r2 = x * x + y * y;
    ysData.push(r2 < 0.5 ? 1 : 0);
  }

  return {
    xs: tf.tensor2d(xsData, [numSamples, 2]),
    ys: tf.tensor2d(ysData, [numSamples, 1]),
  };
}

/** スパイラルデータ */
export function generateSpiralData(numSamples = 200): Dataset {
  const pointsPerClass = numSamples / 2;
  const xsData: number[] = [];
  const ysData: number[] = [];

  for (let i = 0; i < pointsPerClass; i++) {
    const r = (i / pointsPerClass) * 0.8 + 0.1;
    const t = (1.75 * i / pointsPerClass) * 2 * Math.PI;
    xsData.push(r * Math.sin(t), r * Math.cos(t));
    ysData.push(0);
  }

  for (let i = 0; i < pointsPerClass; i++) {
    const r = (i / pointsPerClass) * 0.8 + 0.1;
    const t = (1.75 * i / pointsPerClass) * 2 * Math.PI + Math.PI;
    xsData.push(r * Math.sin(t), r * Math.cos(t));
    ysData.push(1);
  }

  return {
    xs: tf.tensor2d(xsData, [numSamples, 2]),
    ys: tf.tensor2d(ysData, [numSamples, 1]),
  };
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
