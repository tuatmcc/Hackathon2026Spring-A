import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameState, PageId } from "../types";
import { SKILL_DATA } from "../config/skills";
import { STAGE_DATA } from "../config/stages";

// 初期解放スキル (cost === 0)
const initialSkills = SKILL_DATA.filter((s) => s.cost === 0).map((s) => s.id);

interface GameStore extends GameState {
  currentPage: PageId;
  showMenu: boolean;
  setPage: (page: PageId) => void;
  setShowMenu: (show: boolean) => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      points: 0,
      unlockedSkills: initialSkills,
      clearedStages: [],
      currentStageIndex: 0,
      currentPage: "play" as PageId,
      showMenu: false,

      setPage: (page) => set({ currentPage: page }),
      setShowMenu: (show) => set({ showMenu: show }),

      unlockSkill: (skillId) => {
        const skill = SKILL_DATA.find((s) => s.id === skillId);
        if (!skill) return;
        const { points, unlockedSkills } = get();
        if (unlockedSkills.includes(skillId)) return;
        if (points < skill.cost) return;
        if (!skill.dependencies.every((d) => unlockedSkills.includes(d))) return;
        set({
          points: points - skill.cost,
          unlockedSkills: [...unlockedSkills, skillId],
        });
      },

      addPoints: (amount) => set((s) => ({ points: s.points + amount })),

      clearStage: (stageId) => {
        const { clearedStages, currentStageIndex } = get();
        const alreadyCleared = clearedStages.includes(stageId);
        const nextIndex = Math.min(currentStageIndex + 1, STAGE_DATA.length - 1);
        set({
          clearedStages: alreadyCleared
            ? clearedStages
            : [...clearedStages, stageId],
          // 現在のステージをクリアした場合のみ自動進行
          currentStageIndex:
            STAGE_DATA[currentStageIndex]?.id === stageId
              ? nextIndex
              : currentStageIndex,
        });
      },

      selectStage: (index) => {
        if (index < 0 || index >= STAGE_DATA.length) return;
        set({ currentStageIndex: index, showMenu: false });
      },
    }),
    {
      name: "nn-game-save",
      // showMenu は永続化しない
      partialize: (state) => ({
        points: state.points,
        unlockedSkills: state.unlockedSkills,
        clearedStages: state.clearedStages,
        currentStageIndex: state.currentStageIndex,
        currentPage: state.currentPage,
      }),
    },
  ),
);
