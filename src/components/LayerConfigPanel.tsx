// ============================================================
// LayerConfigPanel — 選択中ノードの設定UI
//
// 【担当者へ】
// 選択中のノードの units, activation, regularization を編集する。
// activation/regularization の選択肢は unlockedSkills でフィルタ。
// ============================================================

import { useLayoutEffect, useRef, useState } from "react";
import { SKILL_DATA } from "../config/skills";
import { getLayerSizeOptions } from "../layerSizeOptions";
import { useGameStore } from "../stores/gameStore";
import { usePlayStore } from "../stores/playStore";
import type { LayerNodeData } from "../types";
import { isFixedNodeId } from "./networkEditorUtils";

interface Props {
  selectedNodeId: string | null;
}

function getSkillDescription(skillId: string | null) {
  if (!skillId) return null;
  return SKILL_DATA.find((skill) => skill.id === skillId)?.description ?? null;
}

function clampToRange(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function HelpTooltip({ text }: { text: string }) {
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updateTooltipPosition = () => {
      const tooltip = tooltipRef.current;
      const bubble = bubbleRef.current;
      if (!tooltip || !bubble) return;

      const triggerRect = tooltip.getBoundingClientRect();
      const bubbleRect = bubble.getBoundingClientRect();
      const margin = 8;
      const maxLeft = window.innerWidth - bubbleRect.width - margin;
      const centeredLeft = triggerRect.left + triggerRect.width / 2 - bubbleRect.width / 2;
      const nextLeft = Math.min(Math.max(centeredLeft, margin), Math.max(margin, maxLeft));
      const nextTop = Math.max(margin, triggerRect.top - bubbleRect.height - 8);

      setPosition({ left: nextLeft, top: nextTop });
    };

    updateTooltipPosition();
    window.addEventListener("resize", updateTooltipPosition);
    window.addEventListener("scroll", updateTooltipPosition, true);

    return () => {
      window.removeEventListener("resize", updateTooltipPosition);
      window.removeEventListener("scroll", updateTooltipPosition, true);
    };
  }, [isOpen, text]);

  return (
    <span
      ref={tooltipRef}
      className="layer-config__tooltip"
      tabIndex={0}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      ?
      <span
        ref={bubbleRef}
        className="layer-config__tooltip-bubble"
        data-open={isOpen}
        style={{
          left: `${position.left}px`,
          top: `${position.top}px`,
        }}
      >
        {text}
      </span>
    </span>
  );
}

export function LayerConfigPanel({ selectedNodeId }: Props) {
  const unlockedSkills = useGameStore((s) => s.unlockedSkills);
  const nodes = usePlayStore((s) => s.nodes);
  const updateNodeData = usePlayStore((s) => s.updateNodeData);

  if (selectedNodeId && isFixedNodeId(selectedNodeId)) {
    return (
      <div style={{ padding: 8, color: "#888", fontSize: 12 }}>
        <div style={{ fontWeight: "bold", marginBottom: 4 }}>
          {selectedNodeId === "__input__" ? "Input Layer" : "Output Layer"}
        </div>
        <div>
          {selectedNodeId === "__input__"
            ? "Fixed by stage definition."
            : "Fixed by stage definition."}
        </div>
      </div>
    );
  }

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
  const activationDescription = getSkillDescription(data.activation);
  const regularizationDescription = getSkillDescription(data.regularization);
  const isUnitsEditable = data.layerType !== "flatten";
  const isConvLayer = data.layerType === "conv2d";
  const sizeOptions = getLayerSizeOptions(data.layerType, unlockedSkills);
  const currentSize = isConvLayer ? (data.filters ?? data.units) : data.units;
  const sizeSliderIndexCandidate = sizeOptions.findIndex((value) => value >= currentSize);
  const sizeSliderIndex =
    sizeSliderIndexCandidate === -1 ? sizeOptions.length - 1 : sizeSliderIndexCandidate;
  const minSize = sizeOptions[0] ?? 1;
  const maxSize = sizeOptions[sizeOptions.length - 1] ?? 1;
  const sizeLabel = isConvLayer ? "Filters" : "Units";
  const summaryParts = [
    data.layerType,
    isUnitsEditable
      ? `${currentSize} ${isConvLayer ? "filters" : "units"}`
      : null,
    data.activation ?? "linear",
    data.regularization === "dropout"
      ? `dropout ${data.regularizationRate.toFixed(2)}`
      : data.regularization,
  ].filter(Boolean);

  return (
    <div className="layer-config-panel">
      <div className="layer-config__header">
        <strong>{data.layerType} layer</strong>
        <div className="layer-config__summary">{summaryParts.join(" / ")}</div>
      </div>

      <section className="layer-config__section">
        <div className="layer-config__section-title">
          Layer
          <HelpTooltip text="Hidden layer settings. The output layer is fixed by the current stage." />
        </div>

        {isUnitsEditable ? (
          <div className="layer-config__field">
            <label className="layer-config__label" htmlFor="layer-size">
              {sizeLabel}
              <HelpTooltip
                text={
                  isConvLayer
                    ? "Controls the number of convolution filters. More filters can capture richer image features, but increase model size."
                    : "Controls layer width. Dense widths unlock in steps up to 2, 4, 6, and 8 units."
                }
              />
            </label>
            <div className="layer-config__control-group">
              <input
                id="layer-size"
                type="range"
                min={0}
                max={sizeOptions.length - 1}
                step={1}
                value={sizeSliderIndex}
                onChange={(e) =>
                  updateNodeData(
                    node.id,
                    isConvLayer
                      ? {
                          units: sizeOptions[Number(e.target.value)] ?? currentSize,
                          filters: sizeOptions[Number(e.target.value)] ?? currentSize,
                        }
                      : {
                          units: sizeOptions[Number(e.target.value)] ?? currentSize,
                        },
                  )
                }
              />
              <div className="layer-config__unit-scale">
                {sizeOptions.map((value) => (
                  <span key={value}>{value}</span>
                ))}
              </div>
              <input
                className="layer-config__number-input"
                type="number"
                value={currentSize}
                min={minSize}
                max={maxSize}
                onChange={(e) =>
                  updateNodeData(
                    node.id,
                    isConvLayer
                      ? {
                          units: clampToRange(Number(e.target.value), minSize, maxSize),
                          filters: clampToRange(Number(e.target.value), minSize, maxSize),
                        }
                      : {
                          units: clampToRange(Number(e.target.value), minSize, maxSize),
                        },
                  )
                }
              />
            </div>
          </div>
        ) : (
          <div className="layer-config__hint">
            `flatten` does not use `units`. It reshapes the tensor before the next layer.
          </div>
        )}
      </section>

      <section className="layer-config__section">
        <div className="layer-config__section-title">
          Activation
          <HelpTooltip text="Applies a nonlinear transform after the layer output." />
        </div>
        <div className="layer-config__field">
          <label className="layer-config__label" htmlFor="layer-activation">
            Function
          </label>
          <select
            id="layer-activation"
            className="layer-config__select"
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
        </div>
        <div className="layer-config__hint">
          {activationDescription ?? "No activation selected. The layer output stays linear."}
        </div>
      </section>

      <section className="layer-config__section">
        <div className="layer-config__section-title">
          Regularization
          <HelpTooltip text="Helps reduce overfitting by constraining or perturbing the layer during training." />
        </div>
        <div className="layer-config__field">
          <label className="layer-config__label" htmlFor="layer-regularization">
            Method
          </label>
          <select
            id="layer-regularization"
            className="layer-config__select"
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
        </div>

        <div className="layer-config__hint">
          {regularizationDescription ?? "No regularization selected."}
        </div>

        {data.regularization === "dropout" && (
          <div className="layer-config__field">
            <label className="layer-config__label" htmlFor="layer-dropout-rate">
              Dropout rate
              <HelpTooltip text="Fraction of units dropped during training. Higher values regularize more aggressively." />
            </label>
            <div className="layer-config__control-group layer-config__control-group--inline">
              <input
                id="layer-dropout-rate"
                type="range"
                value={data.regularizationRate}
                min={0}
                max={1}
                step={0.05}
                onChange={(e) =>
                  updateNodeData(node.id, {
                    regularizationRate: Number(e.target.value),
                  })
                }
              />
              <input
                className="layer-config__number-input"
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
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
