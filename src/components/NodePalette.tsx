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
import type { LayerNodeData } from "../types";
import type { Node } from "@xyflow/react";

let nodeIdCounter = 0;

function createLayerNode(layerType: string): Node<LayerNodeData> {
  nodeIdCounter++;
  return {
    id: `layer-${nodeIdCounter}`,
    type: "default",
    position: { x: 100, y: 80 * nodeIdCounter },
    data: {
      layerType,
      units: 32,
      activation: null,
      regularization: null,
      regularizationRate: 0.2,
    },
  };
}

export function NodePalette() {
  const unlockedSkills = useGameStore((s) => s.unlockedSkills);
  const addNode = usePlayStore((s) => s.addNode);

  const availableLayers = SKILL_DATA.filter(
    (s) => s.treeId === "layer" && unlockedSkills.includes(s.id),
  );

  return (
    <div style={{ padding: 8, borderBottom: "1px solid #ddd" }}>
      <strong>Layers</strong>
      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
        {availableLayers.map((skill) => (
          <button
            key={skill.id}
            onClick={() => addNode(createLayerNode(skill.id))}
            style={{ fontSize: 12, padding: "4px 8px" }}
          >
            + {skill.name}
          </button>
        ))}
      </div>
      {/* TODO: D&D 実装。現在はクリックでノード追加 */}
    </div>
  );
}
