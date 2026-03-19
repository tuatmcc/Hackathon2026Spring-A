// ============================================================
// SkillTree — 1本のスキルツリーUI
//
// 【担当者へ】
// treeId でフィルタされた SkillDef[] を受け取り、
// ツリー状に表示する。依存関係の矢印表示等は TODO。
// ============================================================

import { useRef, useState, useLayoutEffect, useCallback } from "react";
import type { SkillDef } from "../types";

function groupByLevel(skills: SkillDef[]): SkillDef[][] {
  const levels = new Map<string, number>();

  function getLevel(skill: SkillDef): number {
    if (levels.has(skill.id)) return levels.get(skill.id)!;
    if (skill.dependencies.length === 0) {
      levels.set(skill.id, 0);
      return 0;
    }
    const maxDepLevel = Math.max(
      ...skill.dependencies.map(d => {
        const dep = skills.find(s => s.id === d);
        return dep ? getLevel(dep) : 0;
      })
    );
    levels.set(skill.id, maxDepLevel + 1);
    return maxDepLevel + 1;
  }

  skills.forEach(s => getLevel(s));

  const maxLevel = Math.max(...levels.values(), 0);
  return Array.from({ length: maxLevel + 1 }, (_, i) =>
    skills.filter(s => levels.get(s.id) === i)
  );
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const skillRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [positions, setPositions] = useState<Map<string, DOMRect>>(new Map());

  useLayoutEffect(() => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    const newPositions = new Map<string, DOMRect>();
    skillRefs.current.forEach((el, id) => {
      newPositions.set(id, el.getBoundingClientRect());
    });
    setPositions(newPositions);
  }, [skills]);

  const setSkillRef = useCallback((skillId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      skillRefs.current.set(skillId, el);
    } else {
      skillRefs.current.delete(skillId);
    }
  }, []);

  const isUnlocked = (id: string) => unlockedSkills.includes(id);

  const canUnlock = (skill: SkillDef) =>
    !isUnlocked(skill.id) &&
    points >= skill.cost &&
    skill.dependencies.every((d) => unlockedSkills.includes(d));

  const levels = groupByLevel(skills);

  const containerRect = containerRef.current?.getBoundingClientRect();

  const getLines = () => {
    if (!containerRect) return [];
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    skills.forEach((skill) => {
      const toRect = positions.get(skill.id);
      if (!toRect) return;
      skill.dependencies.forEach((depId) => {
        const fromRect = positions.get(depId);
        if (!fromRect) return;
        lines.push({
          x1: fromRect.left + fromRect.width / 2 - containerRect.left,
          y1: fromRect.bottom - containerRect.top,
          x2: toRect.left + toRect.width / 2 - containerRect.left,
          y2: toRect.top - containerRect.top,
        });
      });
    });
    return lines;
  };

  return (
    <div ref={containerRef} style={{ minWidth: 180, padding: 8, position: "relative" }}>
      <h4 style={{ marginBottom: 8 }}>{title}</h4>
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#888" />
          </marker>
        </defs>
        {getLines().map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#888"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
        ))}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative", zIndex: 2 }}>
        {levels.map((levelSkills) => (
          <div key={levelSkills[0]?.id} style={{ display: "flex", gap: 8 }}>
            {levelSkills.map((skill) => (
              <div
                key={skill.id}
                ref={setSkillRef(skill.id)}
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
        ))}
      </div>
    </div>
  );
}