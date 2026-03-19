import * as tf from "@tensorflow/tfjs";
import { createSeededRandom, type RandomSource } from "./random";

export interface Dataset {
  xs: tf.Tensor;
  ys: tf.Tensor;
}

export type DatasetLoader = () => Dataset | Promise<Dataset>;

interface DigitsJSON {
  numSamples: number;
  imageShape: [number, number];
  numClasses: number;
  images: number[][];
  labels: number[];
}

function rand(
  min: number,
  max: number,
  random: RandomSource = Math.random,
): number {
  return random() * (max - min) + min;
}

/** 線形分離可能なデータ */
export function generateLinearData(numSamples = 200, seed?: number): Dataset {
  const random = seed == null ? Math.random : createSeededRandom(seed);
  const xsData: number[] = [];
  const ysData: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    const x = rand(-1, 1, random);
    const y = rand(-1, 1, random);
    xsData.push(x, y);
    ysData.push(x > 0 ? 1 : 0);
  }

  return {
    xs: tf.tensor2d(xsData, [numSamples, 2]),
    ys: tf.tensor2d(ysData, [numSamples, 1]),
  };
}

/** XOR データ */
export function generateXORData(numSamples = 200, seed?: number): Dataset {
  const random = seed == null ? Math.random : createSeededRandom(seed);
  const xsData: number[] = [];
  const ysData: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    const x = rand(-1, 1, random);
    const y = rand(-1, 1, random);
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
export function generateCircleData(numSamples = 200, seed?: number): Dataset {
  const random = seed == null ? Math.random : createSeededRandom(seed);
  const xsData: number[] = [];
  const ysData: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    const x = rand(-1, 1, random);
    const y = rand(-1, 1, random);
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

/** y = sin(πx) 関数近似用データ（回帰） */
export function generateSinData(numSamples = 200, seed?: number): Dataset {
  const random = seed == null ? Math.random : createSeededRandom(seed);
  const xsData: number[] = [];
  const ysData: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    const x = rand(-1, 1, random);
    xsData.push(x);
    ysData.push(Math.sin(Math.PI * x));
  }

  return {
    xs: tf.tensor2d(xsData, [numSamples, 1]),
    ys: tf.tensor2d(ysData, [numSamples, 1]),
  };
}

/** 手書き数字データ（sklearn digits） */
export async function loadDigitsData(): Promise<Dataset> {
  const response = await fetch("/data/digits.json");
  if (!response.ok) {
    throw new Error(`Failed to load digits data: ${response.status}`);
  }
  
  const data: DigitsJSON = await response.json();
  const { numSamples, imageShape, numClasses, images, labels } = data;
  
  const xs = tf.tensor4d(
    images.flat(),
    [numSamples, imageShape[0], imageShape[1], 1]
  );
  
  const labelsTensor = tf.tensor1d(labels, "int32");
  const ys = tf.oneHot(labelsTensor, numClasses);
  labelsTensor.dispose();
  
  return { xs, ys };
}

// ---------- レジストリ ----------

const GENERATORS: Record<string, (n?: number, seed?: number) => Dataset> = {
  linear: generateLinearData,
  xor: generateXORData,
  circle: generateCircleData,
  spiral: generateSpiralData,
  sin: generateSinData,
};

const ASYNC_LOADERS: Record<string, DatasetLoader> = {
  digits: loadDigitsData,
};

export function getDatasetGenerator(
  datasetId: string,
): (n?: number, seed?: number) => Dataset {
  const gen = GENERATORS[datasetId];
  if (!gen) throw new Error(`Unknown dataset: ${datasetId}`);
  return gen;
}

export function getAsyncDatasetLoader(datasetId: string): DatasetLoader | null {
  return ASYNC_LOADERS[datasetId] ?? null;
}

export function isAsyncDataset(datasetId: string): boolean {
  return datasetId in ASYNC_LOADERS;
}
