// ============================================================
// スキルツリー
// 実装担当者: RPG風スキルツリーUI、依存関係の表示、解放ロジック
// ============================================================

import { SKILL_DATA } from "../config/skills";
import type { SkillDef } from "../types";

interface Props {
  points: number;
  unlockedSkills: string[];
  onUnlock: (skillId: string) => void;
}

export function SkillTree({ points, unlockedSkills, onUnlock }: Props) {
  const isUnlocked = (id: string) => unlockedSkills.includes(id);

  const canUnlock = (skill: SkillDef) =>
    !isUnlocked(skill.id) &&
    points >= skill.cost &&
    skill.dependencies.every((d) => unlockedSkills.includes(d));

  return (
    <div style={{ padding: 16 }}>
      <h3>Skill Tree</h3>
      <p>Points: {points}</p>

      {/* TODO: ツリー状のビジュアル配置。現在はリスト表示 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {SKILL_DATA.map((skill) => (
          <div
            key={skill.id}
            style={{
              border: "1px solid",
              borderColor: isUnlocked(skill.id) ? "#4caf50" : "#666",
              borderRadius: 8,
              padding: 12,
              opacity: isUnlocked(skill.id) ? 1 : 0.6,
              background: isUnlocked(skill.id) ? "#e8f5e9" : "transparent",
            }}
          >
            <strong>{skill.name}</strong>
            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
              {skill.description}
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Cost: {skill.cost}pt
            </div>
            {!isUnlocked(skill.id) && (
              <button
                onClick={() => onUnlock(skill.id)}
                disabled={!canUnlock(skill)}
                style={{ marginTop: 8 }}
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
