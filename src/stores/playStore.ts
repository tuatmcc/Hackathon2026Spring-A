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
  StageDef,
  TrainingMetrics,
  TrainingStatus,
} from "../types";
import type {
  DecisionBoundarySnapshot,
  SerializedDataset,
} from "../types/visualizationTypes";
import { STAGE_DATA } from "../config/stages";
import { useGameStore } from "./gameStore";
import { buildModel } from "../ml/buildModel";
import { getDatasetGenerator } from "../ml/datasets";
import { trainModel } from "../ml/trainer";
import {
  createDecisionBoundarySnapshot,
  deserializeDataset,
  serializeDataset,
} from "../ml/visualization";

interface PlayStore {
  // --- グラフ（見た目の情報）---
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
  visualizationStageId: string | null;
  datasetPreview: SerializedDataset | null;
  boundarySnapshot: DecisionBoundarySnapshot | null;
  activeTrainingRunId: number | null;
  nextTrainingRunId: number;

  // --- グラフ操作 ---
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
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
  prepareVisualization: (stage: StageDef | null) => SerializedDataset | null;
  setBoundarySnapshot: (snapshot: DecisionBoundarySnapshot | null) => void;
  beginTrainingRun: () => number;
  isTrainingRunCurrent: (runId: number) => boolean;
  startTraining: () => Promise<void>;

  // --- リセット ---
  resetPlay: () => void;
}

const initialState = {
  nodes: [] as Node<LayerNodeData>[],
  edges: [] as Edge[],
  selectedOptimizer: "sgd",
  learningRate: 0.1,
  batchSize: 32,
  epochs: 50,
  trainingStatus: "idle" as TrainingStatus,
  metrics: [] as TrainingMetrics[],
  visualizationStageId: null as string | null,
  datasetPreview: null as SerializedDataset | null,
  boundarySnapshot: null as DecisionBoundarySnapshot | null,
  activeTrainingRunId: null as number | null,
  nextTrainingRunId: 0,
};

export const usePlayStore = create<PlayStore>()((set, get) => ({
  ...initialState,

  // --- グラフ操作 ---
  onNodesChange: (changes: NodeChange[]) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) as Node<LayerNodeData>[] }),
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
  prepareVisualization: (stage: StageDef | null) => {
    if (!stage) {
      set({
        visualizationStageId: null,
        datasetPreview: null,
        boundarySnapshot: null,
        trainingStatus: initialState.trainingStatus,
        metrics: initialState.metrics,
        activeTrainingRunId: null,
      });
      return null;
    }

    const current = get();
    if (
      current.visualizationStageId === stage.id &&
      current.datasetPreview != null
    ) {
      return current.datasetPreview;
    }

    const rawDataset = getDatasetGenerator(stage.datasetId)();

    try {
      const datasetPreview = serializeDataset(rawDataset, stage);
      set({
        visualizationStageId: stage.id,
        datasetPreview,
        boundarySnapshot: null,
        trainingStatus: initialState.trainingStatus,
        metrics: initialState.metrics,
        activeTrainingRunId: null,
      });
      return datasetPreview;
    } finally {
      rawDataset.xs.dispose();
      rawDataset.ys.dispose();
    }
  },
  setBoundarySnapshot: (snapshot: DecisionBoundarySnapshot | null) =>
    set({ boundarySnapshot: snapshot }),
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

    const datasetPreview = get().prepareVisualization(stage);
    if (!datasetPreview) return;

    const runId = get().beginTrainingRun();
    get().resetTrainingState();
    set({ trainingStatus: "training" });

    let dataset: ReturnType<typeof deserializeDataset> | null = null;
    let model: ReturnType<typeof buildModel> | null = null;

    try {
      const { nodes, selectedOptimizer, learningRate, epochs, batchSize } = get();
      const layers: LayerNodeData[] = nodes.map((node) => node.data);
      const activeModel = buildModel(
        layers,
        stage,
        selectedOptimizer,
        learningRate,
      );
      model = activeModel;

      dataset = deserializeDataset(datasetPreview);
      if (get().isTrainingRunCurrent(runId)) {
        get().setBoundarySnapshot(
          createDecisionBoundarySnapshot(activeModel, stage, { epoch: 0 }),
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
          get().setBoundarySnapshot(
            createDecisionBoundarySnapshot(activeModel, stage, {
              epoch: metrics.epoch + 1,
            }),
          );
        },
      });

      if (!get().isTrainingRunCurrent(runId)) {
        return;
      }

      get().setBoundarySnapshot(
        createDecisionBoundarySnapshot(activeModel, stage, { epoch: epochs }),
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
  resetPlay: () => set({ ...initialState }),
}));
