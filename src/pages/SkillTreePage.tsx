// ============================================================
// SkillTreePage — 4本のスキルツリーを並べる
// ============================================================

import { useState } from "react";
import { useGameStore } from "../stores/gameStore";
import { SkillTree } from "../components/SkillTree";
import { SkillDetailPopup } from "../components/SkillDetailPopup";
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
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  const selectedSkill = SKILL_DATA.find((s) => s.id === selectedSkillId) ?? null;

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
            onSkillClick={setSelectedSkillId}
          />
))}
       </div>
      <SkillDetailPopup
        skill={selectedSkill}
        onClose={() => setSelectedSkillId(null)}
      />
     </div>
   );
 }
