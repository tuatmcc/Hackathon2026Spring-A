import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { LayerNodeData } from "../types";

export function LayerNode({ data, selected }: NodeProps) {
  const layerData = data as LayerNodeData;

  return (
    <div className={`network-layer-node${selected ? " selected" : ""}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="network-layer-node__handle"
      />

      <div className="network-layer-node__header">{layerData.layerType}</div>
      <div className="network-layer-node__meta">
        <span>{layerData.units} units</span>
        <span>{layerData.activation ?? "linear"}</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="network-layer-node__handle"
      />
    </div>
  );
}
