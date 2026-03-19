import type { Node } from "@xyflow/react";
import type { LayerNodeData } from "../types";

let nodeIdCounter = 0;

export function createLayerNode(
  layerType: string,
  position?: { x: number; y: number },
): Node<LayerNodeData> {
  nodeIdCounter++;
  const existingCount = nodeIdCounter;
  return {
    id: `layer-${nodeIdCounter}`,
    type: "layerNode",
    position: position ?? { x: 200 + existingCount * 150, y: 150 },
    data: {
      layerType,
      units: 32,
      activation: null,
      regularization: null,
      regularizationRate: 0.2,
    },
  };
}
