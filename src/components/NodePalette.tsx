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
    <div className="node-palette">
      <strong className="node-palette__title">Layers</strong>
      <div className="node-palette__list">
        {availableLayers.map((skill) => (
          <button
            className="node-palette__button"
            key={skill.id}
            onClick={() => addNode(createLayerNode(skill.id))}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("application/reactflow", skill.id);
              event.dataTransfer.effectAllowed = "move";
            }}
          >
            + {skill.name}
          </button>
        ))}
      </div>
    </div>
  );
}
