// ============================================================
// LayerConfigPanel — 選択中ノードの設定UI
//
// 【担当者へ】
// 選択中のノードの units, activation, regularization を編集する。
// activation/regularization の選択肢は unlockedSkills でフィルタ。
// ============================================================

import { SKILL_DATA } from "../config/skills";
import { useGameStore } from "../stores/gameStore";
import { usePlayStore } from "../stores/playStore";
import type { LayerNodeData } from "../types";

interface Props {
  selectedNodeId: string | null;
}

export function LayerConfigPanel({ selectedNodeId }: Props) {
  const unlockedSkills = useGameStore((s) => s.unlockedSkills);
  const nodes = usePlayStore((s) => s.nodes);
  const updateNodeData = usePlayStore((s) => s.updateNodeData);

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) {
    return (
      <div style={{ padding: 8, color: "#888", fontSize: 12 }}>
        Select a layer to configure
      </div>
    );
  }

  const data = node.data as LayerNodeData;

  const availableActivations = SKILL_DATA.filter(
    (s) => s.treeId === "activation" && unlockedSkills.includes(s.id),
  );
  const availableRegularizations = SKILL_DATA.filter(
    (s) => s.treeId === "regularization" && unlockedSkills.includes(s.id),
  );

  return (
    <div style={{ padding: 8, borderTop: "1px solid #ddd", fontSize: 13 }}>
      <strong>{data.layerType} layer</strong>

      <div style={{ marginTop: 8 }}>
        <label>
          Units:{" "}
          <input
            type="number"
            value={data.units}
            min={1}
            max={512}
            onChange={(e) =>
              updateNodeData(node.id, { units: Number(e.target.value) })
            }
            style={{ width: 60 }}
          />
        </label>
      </div>

      <div style={{ marginTop: 4 }}>
        <label>
          Activation:{" "}
          <select
            value={data.activation ?? ""}
            onChange={(e) =>
              updateNodeData(node.id, {
                activation: e.target.value || null,
              })
            }
          >
            <option value="">none</option>
            {availableActivations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginTop: 4 }}>
        <label>
          Regularization:{" "}
          <select
            value={data.regularization ?? ""}
            onChange={(e) =>
              updateNodeData(node.id, {
                regularization: e.target.value || null,
              })
            }
          >
            <option value="">none</option>
            {availableRegularizations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {data.regularization === "dropout" && (
        <div style={{ marginTop: 4 }}>
          <label>
            Rate:{" "}
            <input
              type="number"
              value={data.regularizationRate}
              min={0}
              max={1}
              step={0.05}
              onChange={(e) =>
                updateNodeData(node.id, {
                  regularizationRate: Number(e.target.value),
                })
              }
              style={{ width: 60 }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
