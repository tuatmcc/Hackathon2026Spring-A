// ============================================================
// SkillTree — Steampunk-themed skill tree UI
// ============================================================

import { useRef, useState, useLayoutEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import type { SkillDef } from "../types";
import { SteamParticles } from "./SteamParticles";

function getDependencyOrderScore(
  skill: SkillDef,
  previousLevelOrder: Map<string, number>,
  originalIndexById: Map<string, number>,
) {
  if (skill.dependencies.length === 0) {
    return originalIndexById.get(skill.id) ?? 0;
  }

  const dependencyOrders = skill.dependencies.map(
    (dependencyId) =>
      previousLevelOrder.get(dependencyId) ?? originalIndexById.get(dependencyId) ?? 0,
  );

  return dependencyOrders.reduce((total, order) => total + order, 0) / dependencyOrders.length;
}

export function groupByLevel(skills: SkillDef[]): SkillDef[][] {
  const levels = new Map<string, number>();
  const originalIndexById = new Map(skills.map((skill, index) => [skill.id, index]));
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));

  function getLevel(skill: SkillDef): number {
    if (levels.has(skill.id)) return levels.get(skill.id)!;
    if (skill.dependencies.length === 0) {
      levels.set(skill.id, 0);
      return 0;
    }
    const maxDepLevel = Math.max(
      ...skill.dependencies.map((d) => {
        const dep = skillById.get(d);
        return dep ? getLevel(dep) : 0;
      }),
    );
    levels.set(skill.id, maxDepLevel + 1);
    return maxDepLevel + 1;
  }

  skills.forEach((s) => getLevel(s));

  const maxLevel = Math.max(...levels.values(), 0);
  const grouped = Array.from({ length: maxLevel + 1 }, (_, i) =>
    skills.filter((skill) => levels.get(skill.id) === i),
  );

  let previousLevelOrder = new Map<string, number>();
  grouped.forEach((levelSkills) => {
    // Keep later tiers aligned with the horizontal order of their dependencies to reduce crossing edges.
    levelSkills.sort((leftSkill, rightSkill) => {
      const leftScore = getDependencyOrderScore(
        leftSkill,
        previousLevelOrder,
        originalIndexById,
      );
      const rightScore = getDependencyOrderScore(
        rightSkill,
        previousLevelOrder,
        originalIndexById,
      );

      if (leftScore !== rightScore) {
        return leftScore - rightScore;
      }

      return (originalIndexById.get(leftSkill.id) ?? 0) - (originalIndexById.get(rightSkill.id) ?? 0);
    });

    previousLevelOrder = new Map(levelSkills.map((skill, index) => [skill.id, index]));
  });

  return grouped;
}

interface Props {
  title: string;
  skills: SkillDef[];
  points: number;
  unlockedSkills: string[];
  onUnlock: (skillId: string) => void;
  onSkillClick?: (skillId: string) => void;
}

export function SkillTree({
  title,
  skills,
  points,
  unlockedSkills,
  onUnlock,
  onSkillClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const skillRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [positions, setPositions] = useState<Map<string, DOMRect>>(new Map());
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null);

  useLayoutEffect(() => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    const newPositions = new Map<string, DOMRect>();
    skillRefs.current.forEach((el, id) => {
      newPositions.set(id, el.getBoundingClientRect());
    });
    setPositions(newPositions);
  }, [skills, points, unlockedSkills, justUnlocked]);

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

  const handleUnlock = (skillId: string) => {
    onUnlock(skillId);
    setJustUnlocked(skillId);
    setTimeout(() => setJustUnlocked(null), 1500);
  };

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
    <div ref={containerRef} style={treeContainerStyle}>
      <div style={treeTitleStyle}>{title}</div>
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
            id="arrowhead-brass"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#8b4513" />
          </marker>
        </defs>
        {getLines().map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#8b4513"
            strokeWidth="2"
            markerEnd="url(#arrowhead-brass)"
          />
        ))}
      </svg>
      <div style={levelsContainerStyle}>
        {levels.map((levelSkills) => (
          <div key={levelSkills[0]?.id} style={tierStyle}>
            {levelSkills.map((skill) => {
              const unlocked = isUnlocked(skill.id);
              const canBuy = canUnlock(skill);
              const flashing = justUnlocked === skill.id;
              return (
                <div
                  key={skill.id}
                  ref={setSkillRef(skill.id)}
                  onClick={() => onSkillClick?.(skill.id)}
                  style={{
                    ...nodeStyle,
                    ...(unlocked ? unlockedNodeStyle : lockedNodeStyle),
                    ...(flashing ? flashStyle : {}),
                    ...(unlocked && !flashing ? unlockedIdleStyle : {}),
                  }}
                >
                  {flashing && (
                    <SteamParticles active kind="unlock" count={25} duration={1200} />
                  )}
                  {!unlocked && (
                    <div style={lockIconStyle}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#b58921" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                  )}
                  <strong style={{
                    fontSize: 12,
                    color: unlocked ? "#3fb950" : "var(--text-h)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}>
                    {skill.name}
                  </strong>
                  <div style={{
                    fontSize: 10,
                    color: unlocked ? "#2d8a44" : "var(--text)",
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}>
                    {skill.description}
                  </div>
                  {skill.cost > 0 && !unlocked && (
                    <div style={costStyle}>Cost: {skill.cost}pt</div>
                  )}
                  {unlocked ? (
                    <div style={unlockedBadgeStyle}>Unlocked</div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnlock(skill.id);
                      }}
                      disabled={!canBuy}
                      style={unlockButtonStyle(canBuy)}
                    >
                      Unlock
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const treeContainerStyle: CSSProperties = {
  padding: 12,
  position: "relative",
  minWidth: 260,
};

const treeTitleStyle: CSSProperties = {
  background: "var(--iron)",
  color: "var(--brass)",
  padding: "8px 16px",
  fontWeight: 800,
  border: "2px solid var(--brass)",
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 11,
  marginBottom: 48,
};

const levelsContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 80,
  position: "relative",
  zIndex: 2,
};

const tierStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  justifyContent: "center",
};

const nodeStyle: CSSProperties = {
  width: 200,
  padding: 12,
  textAlign: "center",
  position: "relative",
  cursor: "pointer",
  border: "2px solid",
  boxShadow: "4px 4px 0 var(--iron)",
  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  overflow: "hidden",
};

const unlockedNodeStyle: CSSProperties = {
  borderColor: "#3fb950",
  background: "rgba(63, 185, 80, 0.08)",
  boxShadow: "4px 4px 0 rgba(63, 185, 80, 0.3)",
};

const unlockedIdleStyle: CSSProperties = {
  animation: "border-pulse-green 3s ease-in-out infinite",
};

const lockedNodeStyle: CSSProperties = {
  borderColor: "var(--border)",
  background: "var(--bg-surface)",
  backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px)",
  opacity: 0.85,
};

const flashStyle: CSSProperties = {
  animation: "pop-in 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
  borderColor: "#5adb78",
  boxShadow: "0 0 20px rgba(63, 185, 80, 0.4), 4px 4px 0 rgba(63, 185, 80, 0.5)",
};

const lockIconStyle: CSSProperties = {
  position: "absolute",
  top: -10,
  right: -10,
  background: "var(--iron)",
  border: "2px solid var(--brass)",
  borderRadius: "50%",
  width: 26,
  height: 26,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 5,
};

const costStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--rust)",
  marginTop: 4,
};

const unlockedBadgeStyle: CSSProperties = {
  marginTop: 6,
  padding: "3px 8px",
  fontSize: 9,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#3fb950",
  border: "1px solid rgba(63, 185, 80, 0.3)",
  background: "rgba(63, 185, 80, 0.08)",
  display: "inline-block",
};

function unlockButtonStyle(canBuy: boolean): CSSProperties {
  return {
    marginTop: 6,
    padding: "4px 12px",
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    border: canBuy ? "2px solid var(--brass)" : "1px solid var(--border)",
    background: canBuy ? "var(--brass)" : "transparent",
    color: canBuy ? "#000" : "var(--text)",
    cursor: canBuy ? "pointer" : "not-allowed",
    opacity: canBuy ? 1 : 0.5,
    transition: "all 0.15s",
    width: "100%",
    boxSizing: "border-box",
  };
}
