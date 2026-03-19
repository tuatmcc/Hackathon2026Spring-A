import { describe, it, expect } from "vitest";
import { generateSpiralData, generateSinData, generateXORData, getDatasetGenerator } from "./datasets";

describe("datasets", () => {
  describe("generateSpiralData", () => {
    it("正しい形状のテンソルを返す", () => {
      const { xs, ys } = generateSpiralData(100);

      expect(xs.shape).toEqual([100, 2]);
      expect(ys.shape).toEqual([100, 1]);

      xs.dispose();
      ys.dispose();
    });

    it("2つのクラスが含まれている", () => {
      const { xs, ys } = generateSpiralData(200);

      const labels = ys.dataSync();
      const uniqueLabels = new Set(labels);

      expect(uniqueLabels.size).toBe(2);
      expect(uniqueLabels.has(0)).toBe(true);
      expect(uniqueLabels.has(1)).toBe(true);

      xs.dispose();
      ys.dispose();
    });

    it("クラスのバランスが取れている", () => {
      const { xs, ys } = generateSpiralData(200);

      const labels = ys.dataSync();
      let count0 = 0;
      let count1 = 0;
      for (let i = 0; i < labels.length; i++) {
        if (labels[i] === 0) count0++;
        else count1++;
      }

      expect(count0).toBe(100);
      expect(count1).toBe(100);

      xs.dispose();
      ys.dispose();
    });

    it("螺旋形状のデータである（外側の点は半径が大きい）", () => {
      const { xs, ys } = generateSpiralData(200);

      const data = xs.dataSync();
      const labels = ys.dataSync();

      const pointsClass0: number[][] = [];
      const pointsClass1: number[][] = [];

      for (let i = 0; i < 200; i++) {
        const x = data[i * 2];
        const y = data[i * 2 + 1];
        const label = labels[i];

        if (label === 0) {
          pointsClass0.push([x, y]);
        } else {
          pointsClass1.push([x, y]);
        }
      }

      expect(pointsClass0.length).toBe(100);
      expect(pointsClass1.length).toBe(100);

      const r0Max = Math.max(...pointsClass0.map(([x, y]) => Math.sqrt(x * x + y * y)));
      const r1Max = Math.max(...pointsClass1.map(([x, y]) => Math.sqrt(x * x + y * y)));

      expect(r0Max).toBeGreaterThan(0.5);
      expect(r1Max).toBeGreaterThan(0.5);

      xs.dispose();
      ys.dispose();
    });
  });

  describe("generateSinData", () => {
    it("正しい形状のテンソルを返す", () => {
      const { xs, ys } = generateSinData(100);

      expect(xs.shape).toEqual([100, 1]);
      expect(ys.shape).toEqual([100, 1]);

      xs.dispose();
      ys.dispose();
    });

    it("入力値が[-1, 1]の範囲にある", () => {
      const { xs } = generateSinData(200);

      const data = xs.dataSync();
      for (const x of data) {
        expect(x).toBeGreaterThanOrEqual(-1);
        expect(x).toBeLessThanOrEqual(1);
      }

      xs.dispose();
    });

    it("出力値がsin(πx)の範囲[-1, 1]にある", () => {
      const { xs, ys } = generateSinData(200);

      const xsData = xs.dataSync();
      const ysData = ys.dataSync();

      for (let i = 0; i < 200; i++) {
        const x = xsData[i];
        const expectedY = Math.sin(Math.PI * x);
        const actualY = ysData[i];

        expect(Math.abs(actualY - expectedY)).toBeLessThan(0.0001);
      }

      xs.dispose();
      ys.dispose();
    });

    it("境界値で正しく計算される", () => {
      const { xs, ys } = generateSinData(500);

      const ysData = ys.dataSync();

      let foundNearZero = false;
      let foundNearOne = false;
      let foundNearMinusOne = false;

      for (let i = 0; i < 500; i++) {
        const y = ysData[i];
        if (Math.abs(y) < 0.1) foundNearZero = true;
        if (y > 0.9) foundNearOne = true;
        if (y < -0.9) foundNearMinusOne = true;
      }

      expect(foundNearZero).toBe(true);
      expect(foundNearOne).toBe(true);
      expect(foundNearMinusOne).toBe(true);

      xs.dispose();
      ys.dispose();
    });
  });

  describe("getDatasetGenerator", () => {
    it("sinデータセットを取得できる", () => {
      const generator = getDatasetGenerator("sin");
      expect(generator).toBeDefined();

      const { xs, ys } = generator(50);
      expect(xs.shape).toEqual([50, 1]);
      expect(ys.shape).toEqual([50, 1]);

      xs.dispose();
      ys.dispose();
    });
  });

  describe("seeded generation", () => {
    it("同じseedなら同じXORデータを返す", () => {
      const first = generateXORData(32, 1234);
      const second = generateXORData(32, 1234);

      expect(Array.from(first.xs.dataSync())).toEqual(Array.from(second.xs.dataSync()));
      expect(Array.from(first.ys.dataSync())).toEqual(Array.from(second.ys.dataSync()));

      first.xs.dispose();
      first.ys.dispose();
      second.xs.dispose();
      second.ys.dispose();
    });
  });
});
