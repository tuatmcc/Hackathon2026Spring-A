/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as tf from "@tensorflow/tfjs";
import { loadDigitsData, isAsyncDataset, getAsyncDatasetLoader } from "./datasets";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

vi.stubGlobal("fetch", async () => {
  const filePath = join(__dirname, "../../public/data/digits.json");
  const content = readFileSync(filePath, "utf-8");
  return {
    ok: true,
    json: async () => JSON.parse(content),
  };
});

describe("digits dataset", () => {
  beforeEach(() => {
    tf.disposeVariables();
  });

  afterEach(() => {
    tf.disposeVariables();
  });

  describe("loadDigitsData", () => {
    it("正しい形状のテンソルを返す", async () => {
      const { xs, ys } = await loadDigitsData();

      expect(xs.shape).toEqual([1797, 8, 8, 1]);
      expect(ys.shape).toEqual([1797, 10]);

      xs.dispose();
      ys.dispose();
    });

    it("画素値が0-1の範囲にある", async () => {
      const { xs } = await loadDigitsData();
      
      const min = xs.min().dataSync()[0];
      const max = xs.max().dataSync()[0];
      
      expect(min).toBeGreaterThanOrEqual(0);
      expect(max).toBeLessThanOrEqual(1);

      xs.dispose();
    });

    it("全クラス（0-9）が含まれている", async () => {
      const { ys } = await loadDigitsData();
      
      const argMax = ys.argMax(1);
      const uniqueClasses = new Set(argMax.dataSync());
      
      expect(uniqueClasses.size).toBe(10);
      
      argMax.dispose();
      ys.dispose();
    });
  });

  describe("async dataset helpers", () => {
    it("isAsyncDatasetがdigitsを正しく判定する", () => {
      expect(isAsyncDataset("digits")).toBe(true);
      expect(isAsyncDataset("xor")).toBe(false);
      expect(isAsyncDataset("spiral")).toBe(false);
    });

    it("getAsyncDatasetLoaderがdigitsのローダーを返す", () => {
      const loader = getAsyncDatasetLoader("digits");
      expect(loader).toBeDefined();
      expect(typeof loader).toBe("function");
    });

    it("getAsyncDatasetLoaderが同期データセットにはnullを返す", () => {
      const loader = getAsyncDatasetLoader("xor");
      expect(loader).toBeNull();
    });
  });
});