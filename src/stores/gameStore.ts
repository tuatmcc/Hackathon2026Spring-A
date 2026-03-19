import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameState, PageId } from "../types";
import { SKILL_DATA } from "../config/skills";

// 初期解放スキル (cost === 0)
const initialSkills = SKILL_DATA.filter((s) => s.cost === 0).map((s) => s.id);

interface GameStore extends GameState {
  currentPage: PageId;
  setPage: (page: PageId) => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      points: 0,
      unlockedSkills: initialSkills,
      clearedStages: [],
      currentPage: "stageSelect" as PageId,

      setPage: (page) => set({ currentPage: page }),

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

      clearStage: (stageId) =>
        set((s) => ({
          clearedStages: s.clearedStages.includes(stageId)
            ? s.clearedStages
            : [...s.clearedStages, stageId],
        })),
    }),
    {
      name: "nn-game-save",
    },
  ),
);
