// ============================================================
// SkillTree — 1本のスキルツリーUI
//
// 【担当者へ】
// treeId でフィルタされた SkillDef[] を受け取り、
// ツリー状に表示する。依存関係の矢印表示等は TODO。
// ============================================================

import type { SkillDef } from "../types";

interface Props {
  title: string;
  skills: SkillDef[];
  points: number;
  unlockedSkills: string[];
  onUnlock: (skillId: string) => void;
}

export function SkillTree({
  title,
  skills,
  points,
  unlockedSkills,
  onUnlock,
}: Props) {
  const isUnlocked = (id: string) => unlockedSkills.includes(id);

  const canUnlock = (skill: SkillDef) =>
    !isUnlocked(skill.id) &&
    points >= skill.cost &&
    skill.dependencies.every((d) => unlockedSkills.includes(d));

  return (
    <div style={{ minWidth: 180, padding: 8 }}>
      <h4 style={{ marginBottom: 8 }}>{title}</h4>
      {/* TODO: ツリー状レイアウト + 依存関係の矢印表示 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {skills.map((skill) => (
          <div
            key={skill.id}
            style={{
              border: "1px solid",
              borderColor: isUnlocked(skill.id) ? "#4caf50" : "#666",
              borderRadius: 8,
              padding: 8,
              opacity: isUnlocked(skill.id) ? 1 : 0.6,
              background: isUnlocked(skill.id) ? "#e8f5e9" : "transparent",
            }}
          >
            <strong style={{ fontSize: 13 }}>{skill.name}</strong>
            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
              {skill.description}
            </div>
            {skill.cost > 0 && (
              <div style={{ fontSize: 11, marginTop: 2 }}>
                Cost: {skill.cost}pt
              </div>
            )}
            {!isUnlocked(skill.id) && (
              <button
                onClick={() => onUnlock(skill.id)}
                disabled={!canUnlock(skill)}
                style={{ marginTop: 4, fontSize: 11 }}
              >
                Unlock
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
