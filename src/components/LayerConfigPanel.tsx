// ============================================================
// LayerConfigPanel — 選択中ノードの設定UI
//
// 【担当者へ】
// 選択中のノードの size, activation, regularization を編集する。
// activation/regularization の選択肢は unlockedSkills でフィルタ。
// ============================================================

import { useLayoutEffect, useRef, useState } from "react";
import { SKILL_DATA } from "../config/skills";
import { getLayerSizeOptions } from "../layerSizeOptions";
import { useGameStore } from "../stores/gameStore";
import { usePlayStore } from "../stores/playStore";
import type { LayerNodeData } from "../types";
import { isFixedNodeId } from "./networkEditorUtils";
import { FormNumberStepper } from "./FormNumberStepper";
import { RichSelect } from "./RichSelect";

interface Props {
  selectedNodeId: string | null;
  onDeleteNode: (nodeId: string) => void;
}

function getSkillDescription(skillId: string | null) {
  if (!skillId) return null;
  return SKILL_DATA.find((skill) => skill.id === skillId)?.description ?? null;
}

function clampToRange(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function getRegularizationRateConfig(regularization: string | null) {
  if (regularization === "dropout") {
    return {
      label: "Dropout rate",
      min: 0,
      max: 1,
      step: 0.05,
      tooltip:
        "Fraction of units dropped during training. Higher values regularize more aggressively.",
    };
  }

  if (regularization === "l1" || regularization === "l2") {
    return {
      label: `${regularization.toUpperCase()} coefficient (lambda)`,
      min: 0,
      max: 0.1,
      step: 0.001,
      tooltip:
        "Penalty strength applied to layer weights. Larger values enforce stronger regularization.",
    };
  }

  return null;
}

function getRegularizationUpdate(
  currentRegularization: string | null,
  currentRate: number,
  nextValue: string,
) {
  if (nextValue === "l1" || nextValue === "l2") {
    return {
      regularization: nextValue,
      regularizationRate:
        currentRegularization === nextValue
          ? currentRate
          : 0.01,
    };
  }

  return {
    regularization: nextValue || null,
  };
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

export function LayerConfigPanel({ selectedNodeId, onDeleteNode }: Props) {
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
  const currentSize = data.units;
  const sizeSliderIndexCandidate = sizeOptions.findIndex((value) => value >= currentSize);
  const sizeSliderIndex =
    sizeSliderIndexCandidate === -1 ? sizeOptions.length - 1 : sizeSliderIndexCandidate;
  const minSize = sizeOptions[0] ?? 1;
  const maxSize = sizeOptions[sizeOptions.length - 1] ?? 1;
  const sizeLabel = isConvLayer ? "Filters" : "Units";
  const kernelSize = data.kernelSize ?? 3;
  const regularizationRateConfig = getRegularizationRateConfig(data.regularization);
  const summaryParts = [
    data.layerType,
    isUnitsEditable
      ? `${currentSize} ${isConvLayer ? "filters" : "units"}`
      : null,
    isConvLayer ? `k=${kernelSize}` : null,
    data.activation ?? "linear",
    data.regularization === "dropout"
      ? `dropout ${data.regularizationRate.toFixed(2)}`
      : data.regularization === "l1" || data.regularization === "l2"
        ? `${data.regularization} lambda=${data.regularizationRate.toFixed(3)}`
      : data.regularization,
  ].filter(Boolean);

  return (
    <div className="layer-config-panel">
      <div className="layer-config__header">
        <div className="layer-config__header-main">
          <strong>{data.layerType} layer</strong>
          <div className="layer-config__summary">{summaryParts.join(" / ")}</div>
          <div className="layer-config__danger-note">
            Deleting this layer also removes connected edges.
          </div>
        </div>
        <button
          type="button"
          className="layer-config__delete-button"
          onClick={() => onDeleteNode(node.id)}
        >
          Delete
        </button>
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
                    : "Controls layer width. Dense widths unlock in stages up to 2, 4, 6, 8, 10, and 12 units."
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
              <FormNumberStepper
                id="layer-size-input"
                value={currentSize}
                min={minSize}
                max={maxSize}
                onChange={(value) =>
                  updateNodeData(
                    node.id,
                    isConvLayer
                      ? {
                          units: clampToRange(value, minSize, maxSize),
                        }
                      : {
                          units: clampToRange(value, minSize, maxSize),
                        },
                  )
                }
                inputClassName="layer-config__number-input rich-control rich-control--number"
              />
            </div>
          </div>
        ) : (
          <div className="layer-config__hint">
            `flatten` does not use `units`. It reshapes the tensor before the next layer.
          </div>
        )}

        {isConvLayer && (
          <div className="layer-config__field">
            <label className="layer-config__label" htmlFor="layer-kernel-size">
              Kernel size
              <HelpTooltip text="Spatial kernel size used by Conv2D. Larger kernels increase receptive field and parameter count." />
            </label>
            <div className="layer-config__control-group layer-config__control-group--inline">
              <input
                id="layer-kernel-size"
                type="range"
                min={1}
                max={7}
                step={1}
                value={kernelSize}
                onChange={(e) =>
                  updateNodeData(node.id, {
                    kernelSize: clampToRange(Number(e.target.value), 1, 7),
                  })
                }
              />
              <FormNumberStepper
                value={kernelSize}
                min={1}
                max={7}
                step={1}
                onChange={(value) =>
                  updateNodeData(node.id, {
                    kernelSize: clampToRange(value, 1, 7),
                  })
                }
                inputClassName="layer-config__number-input rich-control rich-control--number"
              />
            </div>
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
          <RichSelect
            id="layer-activation"
            value={data.activation ?? ""}
            onValueChange={(nextValue) =>
              updateNodeData(node.id, {
                activation: nextValue || null,
              })
            }
            options={[
              { value: "", label: "none" },
              ...availableActivations.map((skill) => ({
                value: skill.id,
                label: skill.name,
              })),
            ]}
            triggerClassName="layer-config__select-shell"
            valueClassName="layer-config__select-value"
          />
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
          <RichSelect
            id="layer-regularization"
            value={data.regularization ?? ""}
            onValueChange={(nextValue) =>
              updateNodeData(
                node.id,
                getRegularizationUpdate(
                  data.regularization,
                  data.regularizationRate,
                  nextValue,
                ),
              )
            }
            options={[
              { value: "", label: "none" },
              ...availableRegularizations.map((skill) => ({
                value: skill.id,
                label: skill.name,
              })),
            ]}
            triggerClassName="layer-config__select-shell"
            valueClassName="layer-config__select-value"
          />
        </div>

        <div className="layer-config__hint">
          {regularizationDescription ?? "No regularization selected."}
        </div>

        {regularizationRateConfig && (
          <div className="layer-config__field">
            <label className="layer-config__label" htmlFor="layer-regularization-rate">
              {regularizationRateConfig.label}
              <HelpTooltip text={regularizationRateConfig.tooltip} />
            </label>
            <div className="layer-config__control-group layer-config__control-group--inline">
              <input
                id="layer-regularization-rate"
                type="range"
                value={data.regularizationRate}
                min={regularizationRateConfig.min}
                max={regularizationRateConfig.max}
                step={regularizationRateConfig.step}
                onChange={(e) =>
                  updateNodeData(node.id, {
                    regularizationRate: Number(e.target.value),
                  })
                }
              />
              <FormNumberStepper
                value={data.regularizationRate}
                min={regularizationRateConfig.min}
                max={regularizationRateConfig.max}
                step={regularizationRateConfig.step}
                onChange={(value) =>
                  updateNodeData(node.id, {
                    regularizationRate: value,
                  })
                }
                inputClassName="layer-config__number-input rich-control rich-control--number"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
