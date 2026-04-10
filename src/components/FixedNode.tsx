import { Handle, Position, type NodeProps } from "@xyflow/react";

export type FixedNodeType = "input" | "output";

export interface FixedNodeData {
  nodeType: FixedNodeType;
  shape: number[];
  activation?: string;
  units?: number;
}

export function FixedNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as FixedNodeData;
  const isInput = nodeData.nodeType === "input";
  const label = isInput ? "Input" : "Output";
  const shapeStr = nodeData.shape.join("×");

  return (
    <div className={`network-fixed-node${selected ? " selected" : ""}`}>
      {isInput && (
        <Handle
          type="source"
          position={Position.Right}
          className="network-fixed-node__handle network-fixed-node__handle--source"
        />
      )}

      <div className="network-fixed-node__eyebrow">
        <span className="network-fixed-node__pill">
          {isInput ? "Dataset Entry" : "Prediction Head"}
        </span>
      </div>
      <div className="network-fixed-node__header">{label}</div>
      <div className="network-fixed-node__stats">
        <div className="network-fixed-node__stat">
          <span>Shape</span>
          <strong>{shapeStr}</strong>
        </div>
        {!isInput && nodeData.activation && (
          <div className="network-fixed-node__stat">
            <span>Activation</span>
            <strong>{nodeData.activation.toUpperCase()}</strong>
          </div>
        )}
        {!isInput && nodeData.units !== undefined && (
          <div className="network-fixed-node__stat">
            <span>Units</span>
            <strong>{nodeData.units}</strong>
          </div>
        )}
      </div>
      {!isInput && (
        <div className="network-fixed-node__drop-indicator">Drop edge here</div>
      )}

      {!isInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="network-fixed-node__handle network-fixed-node__handle--target"
        />
      )}
    </div>
  );
}
