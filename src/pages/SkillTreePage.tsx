// ============================================================
// SkillTreePage — 4本のスキルツリーを並べる
// ============================================================

import { useGameStore } from "../stores/gameStore";
import { SkillTree } from "../components/SkillTree";
import { SKILL_DATA } from "../config/skills";
import type { SkillTreeId } from "../types";

const TREES: { id: SkillTreeId; title: string }[] = [
  { id: "layer", title: "Hidden Layers" },
  { id: "activation", title: "Activation" },
  { id: "optimizer", title: "Optimizer" },
  { id: "regularization", title: "Regularization" },
];

export function SkillTreePage() {
  const { points, unlockedSkills, unlockSkill } = useGameStore();

  return (
    <div style={{ padding: 16 }}>
      <h2>Skill Trees</h2>
      <p>Points: {points}pt</p>
      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          paddingBottom: 16,
        }}
      >
        {TREES.map((tree) => (
          <SkillTree
            key={tree.id}
            title={tree.title}
            skills={SKILL_DATA.filter((s) => s.treeId === tree.id)}
            points={points}
            unlockedSkills={unlockedSkills}
            onUnlock={unlockSkill}
          />
        ))}
      </div>
    </div>
  );
}
