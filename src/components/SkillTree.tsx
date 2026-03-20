// ============================================================
// SkillTree — Steampunk-themed skill tree UI
// ============================================================

import { useRef, useState, useLayoutEffect, useCallback, useMemo } from "react";
import type { CSSProperties } from "react";
import type { SkillDef } from "../types";
import { SteamParticles } from "./SteamParticles";
import { buildSkillTreeLayout } from "./skillTreeLayout";

interface Props {
  title: string;
  skills: SkillDef[];
  points: number;
  unlockedSkills: string[];
  onUnlock: (skillId: string) => void;
  onSkillClick?: (skillId: string) => void;
}

const NODE_WIDTH = 200;
const COLUMN_GAP = 36;
const ROW_STRIDE = 168;
const CANVAS_TOP_PADDING = 18;
const CANVAS_BOTTOM_PADDING = 28;
const CANVAS_SIDE_PADDING = 20;
const TITLE_BOTTOM_MARGIN = 30;
const TITLE_HORIZONTAL_PADDING = 32;
const MIN_TREE_WIDTH = 272;

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
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const [positions, setPositions] = useState<Map<string, DOMRect>>(new Map());
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null);
  const layout = useMemo(() => buildSkillTreeLayout(skills), [skills]);

  const canvasWidth = Math.max(
    MIN_TREE_WIDTH,
    layout.columnCount > 0
      ? layout.columnCount * NODE_WIDTH +
          Math.max(0, layout.columnCount - 1) * COLUMN_GAP +
          CANVAS_SIDE_PADDING * 2
      : MIN_TREE_WIDTH,
  );
  const canvasHeight =
    layout.levelCount > 0
      ? CANVAS_TOP_PADDING +
        (layout.levelCount - 1) * ROW_STRIDE +
        132 +
        CANVAS_BOTTOM_PADDING
      : 180;

  useLayoutEffect(() => {
    let frameId = 0;
    const measure = () => {
      const nextContainerRect = containerRef.current?.getBoundingClientRect();
      if (!nextContainerRect) return;

      const nextPositions = new Map<string, DOMRect>();
      skillRefs.current.forEach((element, id) => {
        nextPositions.set(id, element.getBoundingClientRect());
      });

      setContainerRect(nextContainerRect);
      setPositions(nextPositions);
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    skillRefs.current.forEach((element) => resizeObserver.observe(element));
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.cancelAnimationFrame(frameId);
    };
  }, [skills, points, unlockedSkills, justUnlocked, canvasWidth, canvasHeight]);

  const setSkillRef = useCallback(
    (skillId: string) => (element: HTMLDivElement | null) => {
      if (element) {
        skillRefs.current.set(skillId, element);
      } else {
        skillRefs.current.delete(skillId);
      }
    },
    [],
  );

  const isUnlocked = (id: string) => unlockedSkills.includes(id);

  const canUnlock = (skill: SkillDef) =>
    !isUnlocked(skill.id) &&
    points >= skill.cost &&
    skill.dependencies.every((dependencyId) =>
      unlockedSkills.includes(dependencyId),
    );

  const handleUnlock = (skillId: string) => {
    const skill = skills.find((candidate) => candidate.id === skillId);
    if (!skill || !canUnlock(skill)) {
      return;
    }

    onUnlock(skillId);
    setJustUnlocked(skillId);
    setTimeout(() => setJustUnlocked(null), 1500);
  };

  const connectors = useMemo(() => {
    if (!containerRect) return [];

    const nextConnectors: { path: string }[] = [];
    skills.forEach((skill) => {
      const toRect = positions.get(skill.id);
      if (!toRect) return;

      skill.dependencies.forEach((dependencyId) => {
        const fromRect = positions.get(dependencyId);
        if (!fromRect) return;

        const x1 = fromRect.left + fromRect.width / 2 - containerRect.left;
        const y1 = fromRect.bottom - containerRect.top;
        const x2 = toRect.left + toRect.width / 2 - containerRect.left;
        const y2 = toRect.top - containerRect.top;
        const midY = y1 + Math.max(24, (y2 - y1) / 2);

        nextConnectors.push({
          path: `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`,
        });
      });
    });

    return nextConnectors;
  }, [containerRect, positions, skills]);

  return (
    <div style={{ ...treeContainerStyle, width: canvasWidth }}>
      <div style={treeTitleStyle}>{title}</div>
      <div
        ref={containerRef}
        style={{
          ...treeCanvasStyle,
          width: canvasWidth,
          height: canvasHeight,
        }}
      >
        <svg style={connectorLayerStyle}>
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
          {connectors.map((connector, index) => (
            <path
              key={`glow-${index}`}
              d={connector.path}
              fill="none"
              stroke="rgba(181, 137, 33, 0.32)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {connectors.map((connector, index) => (
            <path
              key={`path-${index}`}
              d={connector.path}
              fill="none"
              stroke="#8b4513"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd="url(#arrowhead-brass)"
              style={{
                filter: "drop-shadow(0 0 3px rgba(181, 137, 33, 0.16))",
              }}
            />
          ))}
        </svg>

        {skills.map((skill) => {
          const unlocked = isUnlocked(skill.id);
          const canBuy = canUnlock(skill);
          const flashing = justUnlocked === skill.id;
          const position = layout.positions.get(skill.id);
          if (!position) {
            return null;
          }

          return (
            <div
              key={skill.id}
              ref={setSkillRef(skill.id)}
              onClick={() => onSkillClick?.(skill.id)}
              style={{
                ...nodeStyle,
                left:
                  CANVAS_SIDE_PADDING +
                  NODE_WIDTH / 2 +
                  position.column * (NODE_WIDTH + COLUMN_GAP),
                top: CANVAS_TOP_PADDING + position.level * ROW_STRIDE,
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
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="#b58921"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              )}
              <strong style={nodeTitleStyle(unlocked)}>{skill.name}</strong>
              <div style={nodeDescriptionStyle(unlocked)}>{skill.description}</div>
              {skill.cost > 0 && !unlocked && (
                <div style={costStyle}>Cost: {skill.cost}pt</div>
              )}
              {unlocked ? (
                <div style={unlockedBadgeStyle}>Unlocked</div>
              ) : (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
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
    </div>
  );
}

const treeContainerStyle: CSSProperties = {
  position: "relative",
  padding: "12px 0 12px 12px",
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
  marginBottom: TITLE_BOTTOM_MARGIN,
  width: `calc(100% - ${TITLE_HORIZONTAL_PADDING}px)`,
  marginLeft: TITLE_HORIZONTAL_PADDING / 2,
  boxSizing: "border-box",
};

const treeCanvasStyle: CSSProperties = {
  position: "relative",
  minHeight: 180,
};

const connectorLayerStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  zIndex: 1,
};

const nodeStyle: CSSProperties = {
  width: NODE_WIDTH,
  padding: 12,
  textAlign: "center",
  position: "absolute",
  cursor: "pointer",
  border: "2px solid",
  boxShadow: "4px 4px 0 var(--iron)",
  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  overflow: "hidden",
  transform: "translateX(-50%)",
  zIndex: 2,
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
  backgroundImage:
    "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px)",
  opacity: 0.85,
};

const flashStyle: CSSProperties = {
  animation: "pop-in 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
  borderColor: "#5adb78",
  boxShadow:
    "0 0 20px rgba(63, 185, 80, 0.4), 4px 4px 0 rgba(63, 185, 80, 0.5)",
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

function nodeTitleStyle(unlocked: boolean): CSSProperties {
  return {
    display: "block",
    fontSize: 12,
    color: unlocked ? "#3fb950" : "var(--text-h)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
}

function nodeDescriptionStyle(unlocked: boolean): CSSProperties {
  return {
    fontSize: 10,
    color: unlocked ? "#2d8a44" : "var(--text)",
    marginTop: 2,
    lineHeight: 1.4,
  };
}

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
