import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { LayerNodeData } from "../types";

export function LayerNode({ data, selected }: NodeProps) {
  const layerData = data as LayerNodeData;
  const activationLabel = (layerData.activation ?? "linear").toUpperCase();
  const sizeValue = layerData.layerType === "conv2d"
    ? (layerData.filters ?? layerData.units)
    : layerData.units;
  const sizeLabel = layerData.layerType === "conv2d" ? "Filters" : "Width";

  return (
    <div className={`network-layer-node${selected ? " selected" : ""}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="network-layer-node__handle network-layer-node__handle--target"
      />

      <div className="network-layer-node__eyebrow">
        <span className="network-layer-node__pill">Hidden Layer</span>
        <span className="network-layer-node__pill network-layer-node__pill--muted">
          Trainable
        </span>
      </div>

      <div className="network-layer-node__header">
        {formatLayerLabel(layerData.layerType)}
      </div>
      <div className="network-layer-node__stats">
        <div className="network-layer-node__stat">
          <span>{sizeLabel}</span>
          <strong>{sizeValue}</strong>
        </div>
        <div className="network-layer-node__stat">
          <span>Activation</span>
          <strong>{activationLabel}</strong>
        </div>
      </div>
      <div className="network-layer-node__drop-indicator">Drop edge here</div>

      <Handle
        type="source"
        position={Position.Right}
        className="network-layer-node__handle network-layer-node__handle--source"
      />
    </div>
  );
}

function formatLayerLabel(layerType: string) {
  if (layerType === "conv2d") {
    return "Conv 2D";
  }

  return layerType.charAt(0).toUpperCase() + layerType.slice(1);
}
