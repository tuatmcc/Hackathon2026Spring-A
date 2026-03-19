// ============================================================
// NodePalette — D&D 用パレット
//
// 【担当者へ】
// このコンポーネントは unlockedSkills を読んで、
// 使える層の種類だけを表示する。
// ドラッグ操作で NetworkEditor にノードを追加する。
// ============================================================

import { SKILL_DATA } from "../config/skills";
import { useGameStore } from "../stores/gameStore";
import { usePlayStore } from "../stores/playStore";
import { createLayerNode } from "./layerNodeFactory";

export function NodePalette() {
  const unlockedSkills = useGameStore((s) => s.unlockedSkills);
  const addNode = usePlayStore((s) => s.addNode);

  const availableLayers = SKILL_DATA.filter(
    (s) => s.treeId === "layer" && unlockedSkills.includes(s.id),
  );

  return (
    <div style={{ padding: 8, borderBottom: "1px solid #ddd" }}>
      <strong>Layers</strong>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 8,
          flexWrap: "wrap",
        }}
      >
        {availableLayers.map((skill) => (
          <button
            key={skill.id}
            onClick={() => addNode(createLayerNode(skill.id))}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("application/reactflow", skill.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            style={{
              minWidth: 152,
              padding: "12px 16px",
              border: "1px solid #b8b8b8",
              borderRadius: 14,
              background: "linear-gradient(180deg, #ffffff 0%, #f2f2f2 100%)",
              boxShadow:
                "rgba(0, 0, 0, 0.08) 0 10px 18px -8px, rgba(0, 0, 0, 0.12) 0 4px 10px -6px",
              fontSize: 12,
              textAlign: "left",
              cursor: "grab",
            }}
          >
            + {skill.name}
          </button>
        ))}
      </div>
    </div>
  );
}
