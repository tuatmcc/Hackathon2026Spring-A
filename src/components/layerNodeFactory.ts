import type { Node } from "@xyflow/react";
import type { LayerNodeData } from "../types";

let nodeIdCounter = 0;

export function createLayerNode(
  layerType: string,
  position?: { x: number; y: number },
): Node<LayerNodeData> {
  nodeIdCounter++;
  return {
    id: `layer-${nodeIdCounter}`,
    type: "layerNode",
    position: position ?? { x: 100, y: 80 * nodeIdCounter },
    data: {
      layerType,
      units: 32,
      activation: null,
      regularization: null,
      regularizationRate: 0.2,
    },
  };
}
