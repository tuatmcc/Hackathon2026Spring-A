import type { CSSProperties } from "react";
import type { SkillDef } from "../types";

interface Props {
  skill: SkillDef | null;
  onClose: () => void;
}

export function SkillDetailPopup({ skill, onClose }: Props) {
  if (!skill) return null;

  return (
    <div style={backdropStyle}>
      <div style={panelStyle}>
        <button onClick={onClose} style={closeButtonStyle}>x</button>
        <div style={kickerStyle}>Skill Detail</div>
        <h3 style={titleStyle}>{skill.name}</h3>
        <p style={descriptionStyle}>{skill.detail}</p>
      </div>
    </div>
  );
}

const backdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(4px)",
};

const panelStyle: CSSProperties = {
  position: "relative",
  width: 320,
  background: "var(--iron)",
  color: "var(--text-h)",
  border: "3px solid var(--brass)",
  padding: "28px 24px",
  boxShadow: "6px 6px 0 rgba(0, 0, 0, 0.4), 0 0 40px rgba(181, 137, 33, 0.08)",
};

const closeButtonStyle: CSSProperties = {
  position: "absolute",
  top: 8,
  right: 10,
  border: "none",
  background: "var(--brass)",
  color: "#000",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 800,
  width: 24,
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const kickerStyle: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  color: "var(--copper)",
  marginBottom: 8,
};

const titleStyle: CSSProperties = {
  marginBottom: 12,
  color: "var(--brass)",
  fontSize: 16,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  paddingBottom: 8,
  borderBottom: "1px solid var(--brass)",
};

const descriptionStyle: CSSProperties = {
  fontSize: 13,
  color: "var(--text)",
  lineHeight: 1.6,
};
