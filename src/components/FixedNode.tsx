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
          className="network-fixed-node__handle"
        />
      )}

      <div className="network-fixed-node__header">{label}</div>
      <div className="network-fixed-node__meta">
        <span>{shapeStr}</span>
        {!isInput && nodeData.activation && (
          <span>{nodeData.activation}</span>
        )}
        {!isInput && nodeData.units !== undefined && (
          <span>{nodeData.units} units</span>
        )}
      </div>

      {!isInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="network-fixed-node__handle"
        />
      )}
    </div>
  );
}
