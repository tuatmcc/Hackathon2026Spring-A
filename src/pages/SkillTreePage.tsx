import { useEffect, useRef, useState } from "react";
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
    thumbWidthPercent: 100,
    thumbOffsetPercent: 0,
  });

  const selectedSkill = SKILL_DATA.find((s) => s.id === selectedSkillId) ?? null;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let frameId = 0;
    const updateScrollState = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const hasOverflow = viewport.scrollWidth > viewport.clientWidth + 8;
        const canScrollLeft = viewport.scrollLeft > 8;
        const canScrollRight =
          viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 8;
        const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        const thumbWidthPercent = hasOverflow
          ? Math.max(18, (viewport.clientWidth / viewport.scrollWidth) * 100)
          : 100;
        const thumbTravelPercent = Math.max(0, 100 - thumbWidthPercent);
        const thumbOffsetPercent =
          maxScrollLeft === 0
            ? 0
            : (viewport.scrollLeft / maxScrollLeft) * thumbTravelPercent;

        setScrollState((current) => {
          if (
            current.hasOverflow === hasOverflow &&
            current.canScrollLeft === canScrollLeft &&
            current.canScrollRight === canScrollRight &&
            current.thumbWidthPercent === thumbWidthPercent &&
            current.thumbOffsetPercent === thumbOffsetPercent
          ) {
            return current;
          }

          return {
            hasOverflow,
            canScrollLeft,
            canScrollRight,
            thumbWidthPercent,
            thumbOffsetPercent,
          };
        });
      });
    };

    updateScrollState();

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(viewport);

    const content = viewport.firstElementChild;
    if (content instanceof HTMLElement) {
      resizeObserver.observe(content);
    }

    viewport.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      viewport.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

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
      <div style={treeViewportFrameStyle}>
        <div
          ref={viewportRef}
          className="skill-tree-page__viewport"
          style={treeViewportStyle}
        >
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
        {scrollState.canScrollLeft && (
          <div style={{ ...edgeFadeStyle, ...leftEdgeFadeStyle }} />
        )}
        {scrollState.canScrollRight && (
          <div style={{ ...edgeFadeStyle, ...rightEdgeFadeStyle }} />
        )}
        {scrollState.hasOverflow && (
          <div style={scrollIndicatorDockStyle}>
            <div style={scrollIndicatorTrackStyle}>
              <div
                style={{
                  ...scrollIndicatorThumbStyle,
                  width: `${scrollState.thumbWidthPercent}%`,
                  transform: `translateX(${scrollState.thumbOffsetPercent}%)`,
                }}
              />
            </div>
          </div>
        )}
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
  minHeight: 0,
  overflow: "auto",
  padding: "32px 24px",
  position: "relative",
  background: "var(--paper)",
};

const treeContentStyle: CSSProperties = {
  display: "flex",
  gap: 48,
  width: "max-content",
  paddingRight: 24,
};

const treeViewportFrameStyle: CSSProperties = {
  position: "relative",
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: "var(--paper)",
};

const edgeFadeStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 28,
  width: 36,
  pointerEvents: "none",
  zIndex: 3,
};

const leftEdgeFadeStyle: CSSProperties = {
  left: 0,
  background:
    "linear-gradient(90deg, rgba(220, 208, 185, 0.96), rgba(220, 208, 185, 0))",
};

const rightEdgeFadeStyle: CSSProperties = {
  right: 0,
  background:
    "linear-gradient(270deg, rgba(220, 208, 185, 0.96), rgba(220, 208, 185, 0))",
};

const scrollIndicatorDockStyle: CSSProperties = {
  padding: "0 24px 12px",
  background: "var(--paper)",
  pointerEvents: "none",
};

const scrollIndicatorTrackStyle: CSSProperties = {
  height: 16,
  padding: 2,
  border: "2px solid rgba(44, 44, 44, 0.32)",
  background:
    "linear-gradient(180deg, rgba(44, 44, 44, 0.88), rgba(26, 26, 26, 0.92))",
  boxShadow:
    "0 0 0 1px rgba(181, 137, 33, 0.28), inset 0 0 12px rgba(181, 137, 33, 0.22)",
  boxSizing: "border-box",
};

const scrollIndicatorThumbStyle: CSSProperties = {
  height: "100%",
  minWidth: 72,
  background:
    "linear-gradient(180deg, rgba(212, 164, 42, 0.98), rgba(184, 115, 51, 0.98))",
  border: "1px solid rgba(26, 26, 26, 0.78)",
  boxShadow:
    "inset 0 0 0 1px rgba(240, 235, 224, 0.18), 0 0 10px rgba(181, 137, 33, 0.18)",
  boxSizing: "border-box",
};
