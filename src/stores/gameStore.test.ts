import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "./gameStore";

describe("gameStore.resetProgress", () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.setState({
      points: 0,
      unlockedSkills: ["dense", "model_params_cap_32", "sigmoid", "sgd"],
      clearedStages: [],
      currentStageIndex: 0,
      currentPage: "play",
      showMenu: false,
    });
  });

  it("進捗を初期状態に戻す", () => {
    useGameStore.setState({
      points: 320,
      unlockedSkills: ["dense", "sgd", "sigmoid", "adam"],
      clearedStages: ["stage_linear", "stage_xor"],
      currentStageIndex: 3,
      currentPage: "skillTree",
      showMenu: true,
    });

    useGameStore.getState().resetProgress();

    const state = useGameStore.getState();
    expect(state.points).toBe(0);
    expect(state.unlockedSkills).toEqual(["dense", "model_params_cap_32", "sigmoid", "sgd"]);
    expect(state.clearedStages).toEqual([]);
    expect(state.currentStageIndex).toBe(0);
    expect(state.currentPage).toBe("play");
    expect(state.showMenu).toBe(false);
    expect(state.hasSavedProgress()).toBe(false);
  });

  it("初期状態では進捗なし扱いになる", () => {
    expect(useGameStore.getState().hasSavedProgress()).toBe(false);
  });

  it("進捗があれば保存あり扱いになる", () => {
    useGameStore.setState({
      points: 100,
      unlockedSkills: ["dense", "sigmoid", "sgd", "adam"],
      clearedStages: ["stage_linear"],
      currentStageIndex: 1,
    });

    expect(useGameStore.getState().hasSavedProgress()).toBe(true);
  });
});
