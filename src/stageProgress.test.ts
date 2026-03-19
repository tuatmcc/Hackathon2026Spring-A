import { describe, expect, it } from "vitest";
import { STAGE_DATA } from "./config/stages";
import { getUnlockedStageCount, isStageUnlocked } from "./stageProgress";

describe("stageProgress", () => {
  it("初期状態では最初のステージだけ開放される", () => {
    expect(getUnlockedStageCount(STAGE_DATA, [])).toBe(1);
    expect(isStageUnlocked(STAGE_DATA, [], 0)).toBe(true);
    expect(isStageUnlocked(STAGE_DATA, [], 1)).toBe(false);
  });

  it("連続してクリアした分だけ次のステージが開放される", () => {
    expect(
      getUnlockedStageCount(STAGE_DATA, ["stage_linear", "stage_xor"]),
    ).toBe(3);
    expect(
      isStageUnlocked(STAGE_DATA, ["stage_linear", "stage_xor"], 2),
    ).toBe(true);
    expect(
      isStageUnlocked(STAGE_DATA, ["stage_linear", "stage_xor"], 3),
    ).toBe(false);
  });

  it("クリア履歴に抜けがある場合は未到達ステージを開放しない", () => {
    expect(getUnlockedStageCount(STAGE_DATA, ["stage_xor"])).toBe(1);
    expect(
      getUnlockedStageCount(STAGE_DATA, ["stage_linear", "stage_circle"]),
    ).toBe(2);
  });

  it("全ステージクリア後は全件開放される", () => {
    expect(
      getUnlockedStageCount(
        STAGE_DATA,
        STAGE_DATA.map((stage) => stage.id),
      ),
    ).toBe(STAGE_DATA.length);
  });
});
