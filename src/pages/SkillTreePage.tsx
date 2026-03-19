// ============================================================
// スキルツリー画面 (育成フェーズ)
// ============================================================

import { useGameStore } from "../stores/gameStore";
import { SkillTree } from "../components/SkillTree";

export function SkillTreePage() {
  const { points, unlockedSkills, unlockSkill } = useGameStore();

  return (
    <div style={{ padding: 24 }}>
      <SkillTree
        points={points}
        unlockedSkills={unlockedSkills}
        onUnlock={unlockSkill}
      />
    </div>
  );
}
