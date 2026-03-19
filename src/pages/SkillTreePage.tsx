// ============================================================
// スキルツリー画面 (育成フェーズ)
// ============================================================

import { useGameStore } from "../stores/gameStore";
import { SkillTree } from "../components/SkillTree";

export function SkillTreePage() {
  const { points, unlockedSkills, unlockSkill, setPage } = useGameStore();

  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => setPage("stageSelect")}>&larr; Back</button>
      <SkillTree
        points={points}
        unlockedSkills={unlockedSkills}
        onUnlock={unlockSkill}
      />
    </div>
  );
}
