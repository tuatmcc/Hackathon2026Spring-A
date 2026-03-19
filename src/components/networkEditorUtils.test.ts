import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import {
  isValidLayerConnection,
  validateSequentialLayerGraph,
} from "./networkEditorUtils";
import type { LayerNodeData, StageDef } from "../types";

const imageStage: StageDef = {
  id: "stage_digits",
  name: "Digits",
  description: "Image classification",
  datasetId: "digits",
  inputShape: [8, 8, 1],
  taskType: "multiclass",
  outputUnits: 10,
  outputActivation: "softmax",
  lossFunction: "categoricalCrossentropy",
  targetAccuracy: 0.85,
  rewardPoints: 200,
};

const vectorStage: StageDef = {
  id: "stage_xor",
  name: "XOR",
  description: "Binary classification",
  datasetId: "xor",
  inputShape: [2],
  taskType: "binary",
  outputUnits: 1,
  outputActivation: "sigmoid",
  lossFunction: "binaryCrossentropy",
  targetAccuracy: 0.9,
  rewardPoints: 100,
};

function createLayerNode(
  id: string,
  layerType: LayerNodeData["layerType"],
  x: number,
  overrides: Partial<LayerNodeData> = {},
): Node<LayerNodeData> {
  return {
    id,
    type: "layerNode",
    position: { x, y: 120 },
    data: {
      layerType,
      units: 16,
      activation: "relu",
      regularization: null,
      regularizationRate: 0,
      ...overrides,
    },
  };
}

function createFixedNodes(stage: StageDef): Node[] {
  return [
    {
      id: "__input__",
      type: "fixedNode",
      position: { x: 0, y: 120 },
      data: { nodeType: "input", shape: stage.inputShape },
    },
    {
      id: "__output__",
      type: "fixedNode",
      position: { x: 600, y: 120 },
      data: {
        nodeType: "output",
        shape: [stage.outputUnits],
        activation: stage.outputActivation,
        units: stage.outputUnits,
      },
    },
  ];
}

describe("isValidLayerConnection", () => {
  it("画像入力を dense に直接つなぐ接続を拒否する", () => {
    const nodes = [...createFixedNodes(imageStage), createLayerNode("dense-1", "dense", 180)];

    expect(
      isValidLayerConnection(
        {
          source: "__input__",
          target: "dense-1",
          sourceHandle: null,
          targetHandle: null,
        },
        nodes,
        [],
        imageStage,
      ),
    ).toBe(false);
  });

  it("画像入力を conv2d に接続できる", () => {
    const nodes = [
      ...createFixedNodes(imageStage),
      createLayerNode("conv-1", "conv2d", 180, { filters: 8, kernelSize: 3 }),
    ];

    expect(
      isValidLayerConnection(
        {
          source: "__input__",
          target: "conv-1",
          sourceHandle: null,
          targetHandle: null,
        },
        nodes,
        [],
        imageStage,
      ),
    ).toBe(true);
  });

  it("flatten 前の conv2d 出力を output に直接つなぐ接続を拒否する", () => {
    const nodes = [
      ...createFixedNodes(imageStage),
      createLayerNode("conv-1", "conv2d", 180, { filters: 8, kernelSize: 3 }),
    ];
    const edges: Edge[] = [{ id: "e1", source: "__input__", target: "conv-1" }];

    expect(
      isValidLayerConnection(
        {
          source: "conv-1",
          target: "__output__",
          sourceHandle: null,
          targetHandle: null,
        },
        nodes,
        edges,
        imageStage,
      ),
    ).toBe(false);
  });

  it("conv2d の後は flatten を接続できる", () => {
    const nodes = [
      ...createFixedNodes(imageStage),
      createLayerNode("conv-1", "conv2d", 180, { filters: 8, kernelSize: 3 }),
      createLayerNode("flatten-1", "flatten", 360, { units: 0, activation: null }),
    ];
    const edges: Edge[] = [{ id: "e1", source: "__input__", target: "conv-1" }];

    expect(
      isValidLayerConnection(
        {
          source: "conv-1",
          target: "flatten-1",
          sourceHandle: null,
          targetHandle: null,
        },
        nodes,
        edges,
        imageStage,
      ),
    ).toBe(true);
  });

  it("ベクトル入力では dense を経由して output に接続できる", () => {
    const nodes = [
      ...createFixedNodes(vectorStage),
      createLayerNode("dense-1", "dense", 180),
    ];
    const edges: Edge[] = [{ id: "e1", source: "__input__", target: "dense-1" }];

    expect(
      isValidLayerConnection(
        {
          source: "dense-1",
          target: "__output__",
          sourceHandle: null,
          targetHandle: null,
        },
        nodes,
        edges,
        vectorStage,
      ),
    ).toBe(true);
  });

  it("再接続時は差し替え対象の既存エッジを無視して検証できる", () => {
    const nodes = [
      ...createFixedNodes(vectorStage),
      createLayerNode("dense-1", "dense", 180),
      createLayerNode("dense-2", "dense", 360),
    ];
    const edges: Edge[] = [
      { id: "edge-input", source: "__input__", target: "dense-1" },
      { id: "edge-output", source: "dense-1", target: "__output__" },
    ];

    expect(
      isValidLayerConnection(
        {
          source: "dense-1",
          target: "dense-2",
          sourceHandle: null,
          targetHandle: null,
        },
        nodes,
        edges,
        vectorStage,
        { ignoreEdgeIds: ["edge-output"] },
      ),
    ).toBe(true);
  });
});

describe("validateSequentialLayerGraph", () => {
  it("input から output までの単一路を許可する", () => {
    const nodes = [createLayerNode("dense-1", "dense", 180)];
    const edges: Edge[] = [
      { id: "e1", source: "__input__", target: "dense-1" },
      { id: "e2", source: "dense-1", target: "__output__" },
    ];

    expect(() => validateSequentialLayerGraph(nodes, edges)).not.toThrow();
  });

  it("入力からの分岐を拒否する", () => {
    const nodes = [
      createLayerNode("dense-1", "dense", 180),
      createLayerNode("dense-2", "dense", 360),
    ];
    const edges: Edge[] = [
      { id: "e1", source: "__input__", target: "dense-1" },
      { id: "e2", source: "__input__", target: "dense-2" },
      { id: "e3", source: "dense-1", target: "__output__" },
      { id: "e4", source: "dense-2", target: "__output__" },
    ];

    expect(() => validateSequentialLayerGraph(nodes, edges)).toThrow(
      "Branched networks are not supported.",
    );
  });

  it("未接続の層がある構成を拒否する", () => {
    const nodes = [createLayerNode("dense-1", "dense", 180)];
    const edges: Edge[] = [{ id: "e1", source: "__input__", target: "dense-1" }];

    expect(() => validateSequentialLayerGraph(nodes, edges)).toThrow(
      "Connect every layer in a single path from Input to Output before training.",
    );
  });
});
