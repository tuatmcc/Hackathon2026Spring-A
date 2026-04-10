import type { Node } from "@xyflow/react";
import type { LayerNodeData } from "../types";
import { getDefaultLayerSize } from "../layerSizeOptions";

let nodeIdCounter = 0;
const DEFAULT_NODE_X_POSITIONS = [180, 340, 500];
const DEFAULT_NODE_Y_POSITIONS = [120, 260, 400];

export function createLayerNode(
  layerType: string,
  position?: { x: number; y: number },
): Node<LayerNodeData> {
  nodeIdCounter++;
  const existingCount = nodeIdCounter - 1;
  const defaultSize = getDefaultLayerSize(layerType);
  const defaultPosition = {
    x: DEFAULT_NODE_X_POSITIONS[existingCount % DEFAULT_NODE_X_POSITIONS.length] ?? 180,
    y:
      DEFAULT_NODE_Y_POSITIONS[
        Math.floor(existingCount / DEFAULT_NODE_X_POSITIONS.length) %
          DEFAULT_NODE_Y_POSITIONS.length
      ] ?? 120,
  };
  return {
    id: `layer-${nodeIdCounter}`,
    type: "layerNode",
    position: position ?? defaultPosition,
    data: {
      layerType,
      units: defaultSize,
      activation: null,
      regularization: null,
      regularizationRate: 0.2,
      ...(layerType === "conv2d"
        ? {
            filters: defaultSize,
            kernelSize: 3,
          }
        : {}),
    },
  };
}
