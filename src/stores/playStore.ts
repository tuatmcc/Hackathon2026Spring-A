// ============================================================
// プレイ用ストア (一時、非永続)
// グラフ (nodes/edges) + 学習条件 + 学習状態
// ============================================================

import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import type {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
} from "@xyflow/react";
import type {
  LayerNodeData,
  TrainingMetrics,
  TrainingStatus,
} from "../types";
import { STAGE_DATA } from "../config/stages";
import { useGameStore } from "./gameStore";
import { useVisualizerStore } from "./visualizerStore";
import { buildModel } from "../ml/buildModel";
import { trainModel } from "../ml/trainer";
import {
  createVisualizationSnapshot,
  deserializeDataset,
} from "../ml/visualization";
import { sortLayerNodesTopologically } from "../components/networkEditorUtils";

interface PlayStore {
  // --- グラフ（見た目の情報）---
  fixedNodes: Node[];
  nodes: Node<LayerNodeData>[];
  edges: Edge[];

  // --- 学習条件（TrainingPanel が編集）---
  selectedOptimizer: string;
  learningRate: number;
  batchSize: number;
  epochs: number;

  // --- 学習状態 ---
  trainingStatus: TrainingStatus;
  metrics: TrainingMetrics[];
  activeTrainingRunId: number | null;
  nextTrainingRunId: number;

  // --- グラフ操作 ---
  onNodesChange: (changes: NodeChange[]) => void;
  onFixedNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  initializeFixedNodes: () => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node<LayerNodeData>) => void;
  updateNodeData: (nodeId: string, data: Partial<LayerNodeData>) => void;

  // --- 学習条件操作 ---
  setSelectedOptimizer: (id: string) => void;
  setLearningRate: (lr: number) => void;
  setBatchSize: (bs: number) => void;
  setEpochs: (epochs: number) => void;

// --- 学習状態操作 ---
  setTrainingStatus: (status: TrainingStatus) => void;
  addMetrics: (m: TrainingMetrics) => void;
  resetTrainingState: () => void;
  beginTrainingRun: () => number;
  isTrainingRunCurrent: (runId: number) => boolean;
  startTraining: () => Promise<void>;

  // --- リセット ---
  resetPlay: () => void;
}

const initialState = {
  fixedNodes: [] as Node[],
  nodes: [] as Node<LayerNodeData>[],
  edges: [] as Edge[],
  selectedOptimizer: "sgd",
  learningRate: 0.1,
  batchSize: 32,
  epochs: 50,
  trainingStatus: "idle" as TrainingStatus,
  metrics: [] as TrainingMetrics[],
  activeTrainingRunId: null as number | null,
  nextTrainingRunId: 0,
};

export const usePlayStore = create<PlayStore>()((set, get) => ({
  ...initialState,

  // --- グラフ操作 ---
  initializeFixedNodes: () => {
    const existingIds = new Set(get().fixedNodes.map((node) => node.id));
    if (existingIds.has("__input__") && existingIds.has("__output__")) {
      return;
    }

    set({
      fixedNodes: [
        {
          id: "__input__",
          type: "fixedNode",
          position: { x: 0, y: 150 },
          data: {},
          selectable: true,
          deletable: false,
        },
        {
          id: "__output__",
          type: "fixedNode",
          position: { x: 600, y: 150 },
          data: {},
          selectable: true,
          deletable: false,
        },
      ],
    });
  },
  onNodesChange: (changes: NodeChange[]) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) as Node<LayerNodeData>[] }),
  onFixedNodesChange: (changes: NodeChange[]) =>
    set({
      fixedNodes: applyNodeChanges(
        changes,
        get().fixedNodes,
      ).filter((node) => node.id === "__input__" || node.id === "__output__"),
    }),
  onEdgesChange: (changes: EdgeChange[]) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: (connection: Connection) =>
    set({ edges: addEdge(connection, get().edges) }),
  addNode: (node: Node<LayerNodeData>) =>
    set((s) => ({ nodes: [...s.nodes, node] })),
  updateNodeData: (nodeId: string, data: Partial<LayerNodeData>) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
      ),
    })),

  // --- 学習条件操作 ---
  setSelectedOptimizer: (id: string) => set({ selectedOptimizer: id }),
  setLearningRate: (lr: number) => set({ learningRate: lr }),
  setBatchSize: (bs: number) => set({ batchSize: bs }),
  setEpochs: (epochs: number) => set({ epochs }),

  // --- 学習状態操作 ---
  setTrainingStatus: (status: TrainingStatus) =>
    set({ trainingStatus: status }),
  addMetrics: (m: TrainingMetrics) =>
    set((s) => ({ metrics: [...s.metrics, m] })),
  resetTrainingState: () =>
    set({
      trainingStatus: initialState.trainingStatus,
      metrics: initialState.metrics,
    }),
  beginTrainingRun: () => {
    const runId = get().nextTrainingRunId + 1;
    set({
      nextTrainingRunId: runId,
      activeTrainingRunId: runId,
    });
    return runId;
  },
  isTrainingRunCurrent: (runId: number) =>
    get().activeTrainingRunId === runId,
  startTraining: async () => {
    const { currentStageIndex, addPoints, clearStage } = useGameStore.getState();
    const stage = STAGE_DATA[currentStageIndex];
    if (!stage) return;

    const visualizerStore = useVisualizerStore.getState();
    const datasetPreview = await visualizerStore.prepareVisualization(stage);
    if (!datasetPreview) return;

    const runId = get().beginTrainingRun();
    get().resetTrainingState();
    set({ trainingStatus: "training" });

    let dataset: ReturnType<typeof deserializeDataset> | null = null;
    let model: ReturnType<typeof buildModel> | null = null;

    try {
      const { nodes, edges, selectedOptimizer, learningRate, epochs, batchSize } = get();
      const sortedNodes = edges.length > 0 && nodes.length > 1
        ? sortLayerNodesTopologically(nodes, edges)
        : nodes;
      const layers: LayerNodeData[] = sortedNodes.map((node) => node.data);
      const activeModel = buildModel(
        layers,
        stage,
        selectedOptimizer,
        learningRate,
      );
      model = activeModel;

      dataset = deserializeDataset(datasetPreview);
      if (get().isTrainingRunCurrent(runId)) {
        visualizerStore.setVisualizationSnapshot(
          createVisualizationSnapshot(activeModel, dataset, stage, { epoch: 0 }),
        );
      }

      const result = await trainModel(activeModel, dataset, {
        epochs,
        batchSize,
        onEpochEnd: (metrics) => {
          if (!get().isTrainingRunCurrent(runId)) {
            return;
          }

          get().addMetrics(metrics);
          visualizerStore.setVisualizationSnapshot(
            createVisualizationSnapshot(activeModel, dataset!, stage, {
              epoch: metrics.epoch + 1,
            }),
          );
        },
      });

      if (!get().isTrainingRunCurrent(runId)) {
        return;
      }

      visualizerStore.setVisualizationSnapshot(
        createVisualizationSnapshot(activeModel, dataset, stage, { epoch: epochs }),
      );

      const accuracy = result.finalAccuracy ?? 0;
      if (accuracy >= stage.targetAccuracy) {
        clearStage(stage.id);
        addPoints(stage.rewardPoints);
        set({ trainingStatus: "completed" });
      } else {
        set({ trainingStatus: "failed" });
      }
    } catch (error) {
      console.error("Training failed:", error);
      if (get().isTrainingRunCurrent(runId)) {
        set({ trainingStatus: "failed" });
      }
    } finally {
      dataset?.xs.dispose();
      dataset?.ys.dispose();
      model?.dispose();
    }
  },

  // --- リセット ---
  resetPlay: () => {
    set({ ...initialState });
    useVisualizerStore.getState().resetVisualization();
  },
}));
