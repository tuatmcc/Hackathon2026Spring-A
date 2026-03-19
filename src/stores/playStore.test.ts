import { beforeEach, describe, expect, it, vi } from "vitest";
import { STAGE_DATA } from "../config/stages";
import { useGameStore } from "./gameStore";
import { useVisualizerStore } from "./visualizerStore";
import { usePlayStore } from "./playStore";

const {
  buildModelMock,
  trainModelMock,
  deserializeDatasetMock,
  createVisualizationSnapshotMock,
} = vi.hoisted(() => ({
  buildModelMock: vi.fn(),
  trainModelMock: vi.fn(),
  deserializeDatasetMock: vi.fn(),
  createVisualizationSnapshotMock: vi.fn(),
}));

vi.mock("../ml/buildModel", () => ({
  buildModel: buildModelMock,
}));

vi.mock("../ml/trainer", () => ({
  trainModel: trainModelMock,
}));

vi.mock("../ml/visualization", () => ({
  deserializeDataset: deserializeDatasetMock,
  createVisualizationSnapshot: createVisualizationSnapshotMock,
}));

const linearStage = STAGE_DATA.find((stage) => stage.id === "stage_linear")!;
const circleStage = STAGE_DATA.find((stage) => stage.id === "stage_circle")!;

describe("playStore fixed nodes", () => {
  beforeEach(() => {
    localStorage.clear();
    usePlayStore.getState().resetPlay();
    useGameStore.setState({
      points: 0,
      unlockedSkills: ["dense", "sigmoid", "sgd"],
      clearedStages: [],
      currentStageIndex: 0,
    });

    buildModelMock.mockReset();
    buildModelMock.mockImplementation(() => ({
      dispose: vi.fn(),
    }));

    trainModelMock.mockReset();
    trainModelMock.mockResolvedValue({
      finalLoss: 0.1,
      finalAccuracy: linearStage.targetAccuracy,
    });

    deserializeDatasetMock.mockReset();
    deserializeDatasetMock.mockImplementation(() => ({
      xs: { dispose: vi.fn() },
      ys: { dispose: vi.fn() },
    }));

    createVisualizationSnapshotMock.mockReset();
    createVisualizationSnapshotMock.mockReturnValue(null);

    useVisualizerStore.setState({
      visualizationStageId: null,
      datasetPreview: null,
      visualizationSnapshot: null,
      prepareVisualization: vi.fn(async () => ({
        sampleCount: 1,
        inputShape: linearStage.inputShape,
        outputUnits: linearStage.outputUnits,
        xs: [],
        ys: [],
        labels: [],
        imageShape: null,
      })),
      setVisualizationSnapshot: vi.fn(),
    });
  });

  it("固定ノードを初期化できる", () => {
    usePlayStore.getState().initializeFixedNodes();

    const { fixedNodes } = usePlayStore.getState();
    expect(fixedNodes.map((node) => node.id)).toEqual(["__input__", "__output__"]);
    expect(fixedNodes[0]?.position).toEqual({ x: 0, y: 150 });
    expect(fixedNodes[1]?.position).toEqual({ x: 600, y: 150 });
  });

  it("固定ノードの位置を更新しても再初期化で上書きしない", () => {
    const store = usePlayStore.getState();
    store.initializeFixedNodes();
    store.onFixedNodesChange([
      {
        id: "__input__",
        type: "position",
        position: { x: 120, y: 240 },
        dragging: false,
      },
    ]);

    usePlayStore.getState().initializeFixedNodes();

    expect(usePlayStore.getState().fixedNodes[0]?.position).toEqual({
      x: 120,
      y: 240,
    });
  });

  it("ステージ切替時に training preset を反映する", () => {
    const store = usePlayStore.getState();

    store.syncStageTrainingSettings(linearStage, ["dense", "sigmoid", "sgd"]);
    expect(usePlayStore.getState()).toMatchObject({
      configuredStageId: linearStage.id,
      selectedOptimizer: "sgd",
      learningRate: linearStage.trainingPreset?.learningRate,
      batchSize: linearStage.trainingPreset?.batchSize,
      epochs: linearStage.trainingPreset?.epochs,
    });

    usePlayStore.setState({
      learningRate: 0.2,
      batchSize: 16,
      epochs: 12,
      trainingStatus: "failed",
      trainingErrorMessage: "old error",
    });

    store.syncStageTrainingSettings(circleStage, ["dense", "sigmoid", "sgd", "adam"]);

    expect(usePlayStore.getState()).toMatchObject({
      configuredStageId: circleStage.id,
      selectedOptimizer: "adam",
      learningRate: circleStage.trainingPreset?.learningRate,
      batchSize: circleStage.trainingPreset?.batchSize,
      epochs: circleStage.trainingPreset?.epochs,
      trainingStatus: "idle",
      trainingErrorMessage: null,
    });
  });

  it("同じステージでは手動調整を保持しつつ未解放 optimizer を fallback する", () => {
    const store = usePlayStore.getState();

    store.syncStageTrainingSettings(circleStage, ["dense", "sigmoid", "sgd", "adam"]);
    usePlayStore.setState({
      learningRate: 0.02,
      batchSize: 24,
      epochs: 90,
      selectedOptimizer: "adam",
    });

    store.syncStageTrainingSettings(circleStage, ["dense", "sigmoid", "sgd", "adam"]);
    expect(usePlayStore.getState()).toMatchObject({
      learningRate: 0.02,
      batchSize: 24,
      epochs: 90,
      selectedOptimizer: "adam",
    });

    store.syncStageTrainingSettings(circleStage, ["dense", "sigmoid", "sgd"]);
    expect(usePlayStore.getState()).toMatchObject({
      learningRate: 0.02,
      batchSize: 24,
      epochs: 90,
      selectedOptimizer: "sgd",
    });
  });

  it("Dense ノードの幅は現在の解放段階までに clamp する", () => {
    const store = usePlayStore.getState();

    store.addNode({
      id: "layer-1",
      type: "layerNode",
      position: { x: 120, y: 120 },
      data: {
        layerType: "dense",
        units: 32,
        activation: "relu",
        regularization: null,
        regularizationRate: 0,
      },
    });

    expect(usePlayStore.getState().nodes[0]?.data.units).toBe(2);

    store.updateNodeData("layer-1", { units: 64 });

    expect(usePlayStore.getState().nodes[0]?.data.units).toBe(2);

    useGameStore.setState({
      unlockedSkills: ["dense", "sigmoid", "sgd", "dense_width_cap_4"],
    });

    store.updateNodeData("layer-1", { units: 64 });

    expect(usePlayStore.getState().nodes[0]?.data.units).toBe(4);
  });

  it("非シーケンシャルなネットワークでは警告メッセージを表示する", async () => {
    usePlayStore.setState({
      nodes: [
        {
          id: "layer-1",
          type: "layerNode",
          position: { x: 120, y: 120 },
          data: {
            layerType: "dense",
            units: 2,
            activation: "relu",
            regularization: null,
            regularizationRate: 0,
          },
        },
      ],
      edges: [{ id: "e1", source: "__input__", target: "layer-1" }],
    });

    await usePlayStore.getState().startTraining();

    expect(usePlayStore.getState()).toMatchObject({
      trainingStatus: "failed",
      trainingErrorMessage:
        "Connect every layer in a single path from Input to Output before training.",
    });
  });

  it("同じステージを再クリアしてもポイントは初回分しか増えない", async () => {
    await usePlayStore.getState().startTraining();

    expect(useGameStore.getState().points).toBe(linearStage.rewardPoints);
    expect(useGameStore.getState().clearedStages).toEqual([linearStage.id]);
    expect(usePlayStore.getState().pendingStageClearId).toBe(linearStage.id);
    expect(usePlayStore.getState().pendingStageClearRewardPoints).toBe(
      linearStage.rewardPoints,
    );

    usePlayStore.getState().dismissStageClearPopup();
    useGameStore.getState().selectStage(0);

    await usePlayStore.getState().startTraining();

    expect(useGameStore.getState().points).toBe(linearStage.rewardPoints);
    expect(useGameStore.getState().clearedStages).toEqual([linearStage.id]);
    expect(usePlayStore.getState().pendingStageClearId).toBe(linearStage.id);
    expect(usePlayStore.getState().pendingStageClearRewardPoints).toBe(0);
  });
});
