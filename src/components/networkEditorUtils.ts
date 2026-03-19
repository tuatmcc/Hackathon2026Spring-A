import type { Connection, Edge, Node } from "@xyflow/react";
import type { LayerNodeData, StageDef } from "../types";

const INPUT_NODE_ID = "__input__";
const OUTPUT_NODE_ID = "__output__";
type TensorShape = Array<number | null>;
type FixedNodeKind = "input" | "output";

interface FixedNodeDataLike {
  nodeType: FixedNodeKind;
}

export function isFixedNodeId(nodeId: string): boolean {
  return nodeId === INPUT_NODE_ID || nodeId === OUTPUT_NODE_ID;
}

function isLayerNodeData(data: unknown): data is LayerNodeData {
  return data !== null && typeof data === "object" && "layerType" in data;
}

function isFixedNodeData(data: unknown): data is FixedNodeDataLike {
  return (
    data !== null &&
    typeof data === "object" &&
    "nodeType" in data &&
    (((data as FixedNodeDataLike).nodeType === "input") ||
      (data as FixedNodeDataLike).nodeType === "output")
  );
}

function getNodeById(nodeId: string, nodes: Node[]): Node | undefined {
  return nodes.find((node) => node.id === nodeId);
}

function getIncomingEdge(nodeId: string, edges: Edge[]): Edge | undefined {
  return edges.find((edge) => edge.target === nodeId);
}

function inferLayerOutputShape(
  layer: LayerNodeData,
  inputShape: TensorShape | null,
): TensorShape | null {
  switch (layer.layerType) {
    case "dense":
      if (inputShape !== null && inputShape.length !== 1) {
        return null;
      }
      return [layer.units];

    case "conv2d": {
      const filters = layer.filters ?? layer.units;
      const kernelSize = layer.kernelSize ?? 3;

      if (inputShape === null) {
        return [null, null, filters];
      }

      if (inputShape.length !== 3) {
        return null;
      }

      const [height, width] = inputShape;
      if (
        (height !== null && height < kernelSize) ||
        (width !== null && width < kernelSize)
      ) {
        return null;
      }

      return [
        height === null ? null : height - kernelSize + 1,
        width === null ? null : width - kernelSize + 1,
        filters,
      ];
    }

    case "flatten":
      if (inputShape === null || inputShape.length === 0) {
        return [null];
      }
      if (inputShape.some((dim) => dim === null)) {
        return [null];
      }
      return [inputShape.reduce<number>((product, dim) => product * (dim as number), 1)];

    default:
      return null;
  }
}

function canAcceptInputShape(
  targetNode: Node,
  sourceShape: TensorShape,
): boolean {
  if (isFixedNodeId(targetNode.id)) {
    return sourceShape.length === 1;
  }

  if (!isLayerNodeData(targetNode.data)) {
    return false;
  }

  switch (targetNode.data.layerType) {
    case "dense":
      return sourceShape.length === 1;

    case "conv2d": {
      if (sourceShape.length !== 3) {
        return false;
      }
      const kernelSize = targetNode.data.kernelSize ?? 3;
      const [height, width] = sourceShape;
      return (
        (height === null || height >= kernelSize) &&
        (width === null || width >= kernelSize)
      );
    }

    case "flatten":
      return sourceShape.length >= 1;

    default:
      return false;
  }
}

function inferNodeOutputShape(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  stage: StageDef | null,
  visiting = new Set<string>(),
): TensorShape | null {
  if (visiting.has(nodeId)) {
    return null;
  }

  const node = getNodeById(nodeId, nodes);
  if (!node) {
    return null;
  }

  if (nodeId === INPUT_NODE_ID) {
    return stage?.inputShape ?? null;
  }

  if (nodeId === OUTPUT_NODE_ID) {
    return [stage?.outputUnits ?? null];
  }

  if (!isLayerNodeData(node.data)) {
    return null;
  }

  const nextVisiting = new Set(visiting);
  nextVisiting.add(nodeId);

  const incomingEdge = getIncomingEdge(nodeId, edges);
  const inputShape = incomingEdge?.source
    ? inferNodeOutputShape(incomingEdge.source, nodes, edges, stage, nextVisiting)
    : null;

  return inferLayerOutputShape(node.data, inputShape);
}

function compareNodePositions(
  a: Node<LayerNodeData>,
  b: Node<LayerNodeData>,
): number {
  if (a.position.x !== b.position.x) {
    return a.position.x - b.position.x;
  }
  if (a.position.y !== b.position.y) {
    return a.position.y - b.position.y;
  }
  return a.id.localeCompare(b.id);
}

function wouldCreateCycle(
  edges: Edge[],
  sourceId: string,
  targetId: string,
): boolean {
  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)?.push(edge.target);
  }

  if (!adjacency.has(sourceId)) {
    adjacency.set(sourceId, []);
  }
  adjacency.get(sourceId)?.push(targetId);

  const stack = [targetId];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) {
      continue;
    }
    if (current === sourceId) {
      return true;
    }

    visited.add(current);
    for (const next of adjacency.get(current) ?? []) {
      stack.push(next);
    }
  }

  return false;
}

export function isValidLayerConnection(
  connection: Connection | Edge,
  nodes: Node[],
  edges: Edge[],
  stage: StageDef | null = null,
): boolean {
  const { source, target } = connection;
  const hasFixedNodes = stage !== null;

  if (!source || !target || source === target) {
    return false;
  }

  if (hasFixedNodes) {
    if (source === OUTPUT_NODE_ID) {
      return false;
    }
    if (target === INPUT_NODE_ID) {
      return false;
    }
    if (source === INPUT_NODE_ID && target === OUTPUT_NODE_ID) {
      return false;
    }
  }

  const sourceNode = nodes.find((node) => node.id === source);
  const targetNode = nodes.find((node) => node.id === target);

  if (!sourceNode || !targetNode) {
    return false;
  }

  if (
    isFixedNodeData(sourceNode.data) &&
    sourceNode.data.nodeType === "output"
  ) {
    return false;
  }

  if (
    isFixedNodeData(targetNode.data) &&
    targetNode.data.nodeType === "input"
  ) {
    return false;
  }

  if (sourceNode.position.x >= targetNode.position.x) {
    return false;
  }

  if (edges.some((edge) => edge.source === source && edge.target === target)) {
    return false;
  }

  if (!isFixedNodeId(source) && edges.some((edge) => edge.source === source)) {
    return false;
  }

  if (!isFixedNodeId(target) && edges.some((edge) => edge.target === target)) {
    return false;
  }

  const sourceShape = inferNodeOutputShape(source, nodes, edges, stage);
  if (!sourceShape || !canAcceptInputShape(targetNode, sourceShape)) {
    return false;
  }

  return !wouldCreateCycle(edges, source, target);
}

export function sortLayerNodesTopologically(
  nodes: Node<LayerNodeData>[],
  edges: Edge[],
): Node<LayerNodeData>[] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const indegree = new Map<string, number>();
  const outdegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    indegree.set(node.id, 0);
    outdegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    if (!edge.source || !edge.target) {
      continue;
    }
    
    if (isFixedNodeId(edge.source) || isFixedNodeId(edge.target)) {
      continue;
    }
    
    if (!nodesById.has(edge.source) || !nodesById.has(edge.target)) {
      throw new Error("Edge references a missing node.");
    }

    adjacency.get(edge.source)?.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    outdegree.set(edge.source, (outdegree.get(edge.source) ?? 0) + 1);
  }

  for (const node of nodes) {
    if ((indegree.get(node.id) ?? 0) > 1 || (outdegree.get(node.id) ?? 0) > 1) {
      throw new Error("Each layer can only have one input and one output.");
    }
  }

  if (edges.length > 0 && nodes.length > 1) {
    const disconnectedNodes = nodes.filter(
      (node) =>
        (indegree.get(node.id) ?? 0) === 0 && (outdegree.get(node.id) ?? 0) === 0,
    );

    if (disconnectedNodes.length > 0) {
      throw new Error("All layers must be connected before training.");
    }
  }

  const queue = nodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .sort(compareNodePositions);
  const sorted: Node<LayerNodeData>[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    sorted.push(current);

    for (const nextId of adjacency.get(current.id) ?? []) {
      const nextIndegree = (indegree.get(nextId) ?? 0) - 1;
      indegree.set(nextId, nextIndegree);

      if (nextIndegree === 0) {
        const nextNode = nodesById.get(nextId);
        if (nextNode) {
          queue.push(nextNode);
          queue.sort(compareNodePositions);
        }
      }
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error("Cycle detected in network graph.");
  }

  return sorted;
}
