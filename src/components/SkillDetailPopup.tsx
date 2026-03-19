import type { SkillDef } from "../types";

interface Props {
  skill: SkillDef | null;
  onClose: () => void;
}

export function SkillDetailPopup({ skill, onClose }: Props) {
  if (!skill) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        right: 32,
        transform: "translateY(-50%)",
        width: 280,
        background: "#fff",
        color: "#16171d",
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 48,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 1000,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          border: "none",
          background: "transparent",
          color: "#16171d",
          cursor: "pointer",
          fontSize: 20,
        }}
      >
        ×
      </button>
      <h3 style={{ marginBottom: 8 }}>{skill.name}</h3>
      <p style={{ fontSize: 16, color: "#666" }}>{skill.detail}</p>
    </div>
  );
}
