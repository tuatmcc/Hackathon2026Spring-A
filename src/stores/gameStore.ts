// ============================================================
// ゲーム進行ストア (永続化)
// セーブデータ: points, unlockedSkills, clearedStages, currentStageIndex
// ============================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PageId } from "../types";
import { SKILL_DATA } from "../config/skills";
import { STAGE_DATA } from "../config/stages";
import { isStageUnlocked } from "../stageProgress";

/** 初期解放スキル (cost === 0) */
const initialSkills = SKILL_DATA.filter((s) => s.cost === 0).map((s) => s.id);

function normalizeUnlockedSkills(unlockedSkills: string[]) {
  const mergedSkills = [...unlockedSkills];

  for (const skillId of initialSkills) {
    if (!mergedSkills.includes(skillId)) {
      mergedSkills.push(skillId);
    }
  }

  return mergedSkills;
}

interface GameStore {
  // --- 永続化するセーブデータ ---
  points: number;
  unlockedSkills: string[];
  clearedStages: string[];
  currentStageIndex: number;
  hasSeenTutorial: boolean;
  seenStageIntroIds: string[];

  // --- UI ステート (非永続) ---
  currentPage: PageId;
  showMenu: boolean;
  hasHydrated: boolean;

  // --- アクション ---
  unlockSkill: (skillId: string) => void;
  addPoints: (amount: number) => void;
  clearStage: (stageId: string) => boolean;
  hasSavedProgress: () => boolean;
  resetProgress: () => void;
  selectStage: (index: number) => void;
  setPage: (page: PageId) => void;
  setShowMenu: (show: boolean) => void;
  markTutorialSeen: () => void;
  markStageIntroSeen: (stageId: string) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

const initialProgressState = {
  points: 0,
  unlockedSkills: normalizeUnlockedSkills(initialSkills),
  clearedStages: [],
  currentStageIndex: 0,
};

function isInitialProgressState(state: {
  points: number;
  unlockedSkills: string[];
  clearedStages: string[];
  currentStageIndex: number;
}) {
  return (
    state.points === initialProgressState.points &&
    state.currentStageIndex === initialProgressState.currentStageIndex &&
    state.clearedStages.length === 0 &&
    state.unlockedSkills.length === initialProgressState.unlockedSkills.length &&
    state.unlockedSkills.every(
      (skillId, index) => skillId === initialProgressState.unlockedSkills[index],
    )
  );
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialProgressState,
      hasSeenTutorial: false,
      seenStageIntroIds: [],
      currentPage: "play" as PageId,
      showMenu: false,
      hasHydrated: false,

      setPage: (page) => set({ currentPage: page }),
      setShowMenu: (show) => set({ showMenu: show }),
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      markTutorialSeen: () => set({ hasSeenTutorial: true }),
      markStageIntroSeen: (stageId: string) =>
        set((state) =>
          state.seenStageIntroIds.includes(stageId)
            ? state
            : { seenStageIntroIds: [...state.seenStageIntroIds, stageId] },
        ),

      unlockSkill: (skillId: string) => {
        const skill = SKILL_DATA.find((s) => s.id === skillId);
        if (!skill) return;
        const { points, unlockedSkills } = get();
        if (unlockedSkills.includes(skillId)) return;
        if (points < skill.cost) return;
        if (!skill.dependencies.every((d) => unlockedSkills.includes(d)))
          return;
        set({
          points: points - skill.cost,
          unlockedSkills: [...unlockedSkills, skillId],
        });
      },

      addPoints: (amount: number) =>
        set((s) => ({ points: s.points + amount })),

      hasSavedProgress: () => !isInitialProgressState(get()),

      resetProgress: () =>
        set({
          ...initialProgressState,
          hasSeenTutorial: false,
          seenStageIntroIds: [],
          currentPage: "play",
          showMenu: false,
        }),

      clearStage: (stageId: string) => {
        const { clearedStages, currentStageIndex } = get();
        const alreadyCleared = clearedStages.includes(stageId);
        const nextIndex = Math.min(
          currentStageIndex + 1,
          STAGE_DATA.length - 1,
        );
        set({
          clearedStages: alreadyCleared
            ? clearedStages
            : [...clearedStages, stageId],
          currentStageIndex:
            STAGE_DATA[currentStageIndex]?.id === stageId
              ? nextIndex
              : currentStageIndex,
        });
        return !alreadyCleared;
      },

      selectStage: (index: number) => {
        if (index < 0 || index >= STAGE_DATA.length) return;
        if (!isStageUnlocked(STAGE_DATA, get().clearedStages, index)) return;
        set({ currentStageIndex: index, showMenu: false });
      },
    }),
    {
      name: "nn-game-save",
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<GameStore> | undefined;

        return {
          ...currentState,
          ...state,
          unlockedSkills: normalizeUnlockedSkills(
            state?.unlockedSkills ?? currentState.unlockedSkills,
          ),
        };
      },
      partialize: (state) => ({
        points: state.points,
        unlockedSkills: state.unlockedSkills,
        clearedStages: state.clearedStages,
        currentStageIndex: state.currentStageIndex,
        hasSeenTutorial: state.hasSeenTutorial,
        seenStageIntroIds: state.seenStageIntroIds,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
