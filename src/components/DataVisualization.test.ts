import { describe, expect, it } from "vitest";
import type { DigitsPredictionSnapshot, SerializedDataset } from "../types/visualizationTypes";
import {
  extractDigitsSample,
  extractRegressionSamplePoints,
  getClampedDigitsSampleIndex,
  getRegressionDomainFromSamplePoints,
} from "./DataVisualization";

describe("DataVisualization helpers", () => {
  it("getClampedDigitsSampleIndexがサンプル範囲を超えないようにする", () => {
    expect(getClampedDigitsSampleIndex(-1, 3)).toBe(0);
    expect(getClampedDigitsSampleIndex(1, 3)).toBe(1);
    expect(getClampedDigitsSampleIndex(5, 3)).toBe(2);
    expect(getClampedDigitsSampleIndex(2, 0)).toBe(0);
  });

  it("extractDigitsSampleが単一サンプルと予測配列を切り出す", () => {
    const dataset = createSerializedDigitsDataset(18);
    const snapshot: DigitsPredictionSnapshot = {
      kind: "digits",
      epoch: 3,
      predictions: Array.from({ length: 18 }, (_, index) => ({
        sampleIndex: index,
        predictedLabel: (index + 1) % 10,
        confidence: 0.5 + index * 0.01,
        classConfidences: Array.from(
          { length: 10 },
          (_, label) => (label === ((index + 1) % 10) ? 0.5 + index * 0.01 : 0.01),
        ),
        isCorrect: index % 2 === 0,
      })),
    };

    const firstSample = extractDigitsSample(dataset, snapshot, 0);
    const clampedSample = extractDigitsSample(dataset, snapshot, 999);

    expect(firstSample).toMatchObject({
      index: 0,
      label: 0,
      predictedLabel: 1,
      isCorrect: true,
    });
    expect(firstSample?.confidence ?? 0).toBeCloseTo(0.5, 6);
    expect(firstSample?.classConfidences).toHaveLength(10);
    expect(firstSample?.classConfidences[1]).toBe(0.5);
    expect(clampedSample).toMatchObject({
      index: 17,
      label: 7,
      predictedLabel: 8,
      isCorrect: false,
    });
    expect(clampedSample?.confidence ?? 0).toBeCloseTo(0.67, 6);
    expect(clampedSample?.pixels).toHaveLength(64);
  });

  it("extractRegressionSamplePointsがx順に整列し、描画領域を計算できる", () => {
    const points = extractRegressionSamplePoints({
      sampleCount: 4,
      inputShape: [1],
      outputUnits: 1,
      xs: [0.5, -1, 1, 0],
      ys: [0.8, 0, 0, 0],
      labels: [0.8, 0, 0, 0],
      imageShape: null,
    });
    const domain = getRegressionDomainFromSamplePoints(points);

    expect(points).toEqual([
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 0.5, y: 0.8 },
      { x: 1, y: 0 },
    ]);
    expect(domain.minX).toBeLessThan(-1);
    expect(domain.maxX).toBeGreaterThan(1);
    expect(domain.maxY).toBeGreaterThan(0.8);
  });
});

function createSerializedDigitsDataset(sampleCount: number): SerializedDataset {
  const labels = Array.from({ length: sampleCount }, (_, index) => index % 10);
  const ys = labels.flatMap((label) =>
    Array.from({ length: 10 }, (_, unit) => (unit === label ? 1 : 0)),
  );
  const xs = Array.from({ length: sampleCount * 64 }, (_, index) =>
    (index % 64) / 63,
  );

  return {
    sampleCount,
    inputShape: [8, 8, 1],
    outputUnits: 10,
    xs,
    ys,
    labels,
    imageShape: [8, 8, 1],
  };
}
