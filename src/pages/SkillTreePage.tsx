import { useState } from "react";
import type { CSSProperties } from "react";
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
    <div style={pageStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <div style={eyebrowStyle}>Skill Laboratory</div>
          <h2 style={pageTitleStyle}>Skill Trees</h2>
        </div>
        <div style={pointsGaugeStyle}>
          <span style={pointsLabelStyle}>Points</span>
          <strong style={pointsValueStyle}>{points}pt</strong>
        </div>
      </div>
      <div style={treeViewportStyle}>
        <div style={treeContentStyle}>
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
      </div>
      <SkillDetailPopup
        skill={selectedSkill}
        onClose={() => setSelectedSkillId(null)}
      />
    </div>
  );
}

const pageStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  background: "var(--paper)",
  backgroundImage: "radial-gradient(circle at 2px 2px, rgba(181, 137, 33, 0.06) 1px, transparent 0)",
  backgroundSize: "40px 40px",
};

const pageHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 24px",
  borderBottom: "3px solid var(--brass)",
  background: "linear-gradient(180deg, var(--iron), #000)",
};

const eyebrowStyle: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.2em",
  color: "var(--copper)",
  marginBottom: 4,
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  color: "var(--brass)",
  letterSpacing: "0.06em",
};

const pointsGaugeStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 2,
  padding: "8px 16px",
  border: "2px solid var(--brass)",
  background: "#000",
  boxShadow: "inset 0 0 6px rgba(181, 137, 33, 0.2)",
};

const pointsLabelStyle: CSSProperties = {
  fontSize: 8,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  color: "var(--text)",
};

const pointsValueStyle: CSSProperties = {
  fontSize: 18,
  color: "var(--brass)",
};

const treeViewportStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: "32px 24px",
};

const treeContentStyle: CSSProperties = {
  display: "flex",
  gap: 48,
  width: "max-content",
};
