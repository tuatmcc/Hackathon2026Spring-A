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
import { STAGE_DATA } from "../config/stages";
import { SKILL_DATA } from "../config/skills";
import { useGameStore } from "./gameStore";
import { useVisualizerStore } from "./visualizerStore";
import { buildModel } from "../ml/buildModel";
import type { TrainResult } from "../ml/trainer";
import { trainModel } from "../ml/trainer";
import {
  createVisualizationSnapshot,
  deserializeDataset,
} from "../ml/visualization";
import {
  sortLayerNodesTopologically,
  validateSequentialLayerGraph,
} from "../components/networkEditorUtils";
import { deriveSeed } from "../ml/random";
import { sanitizeLayerNodeData } from "../layerSizeOptions";

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
  lastTrainingResult: TrainResult | null;
  pendingStageClearId: string | null;
  configuredStageId: string | null;
  trainingErrorMessage: string | null;

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
  syncStageTrainingSettings: (stage: StageDef, unlockedSkills: string[]) => void;

// --- 学習状態操作 ---
  setTrainingStatus: (status: TrainingStatus) => void;
  addMetrics: (m: TrainingMetrics) => void;
  resetTrainingState: () => void;
  beginTrainingRun: () => number;
  isTrainingRunCurrent: (runId: number) => boolean;
  startTraining: () => Promise<void>;
  dismissStageClearPopup: () => void;

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
  lastTrainingResult: null as TrainResult | null,
  pendingStageClearId: null as string | null,
  configuredStageId: null as string | null,
  trainingErrorMessage: null as string | null,
};

const optimizerSkillIds = SKILL_DATA
  .filter((skill) => skill.treeId === "optimizer")
  .map((skill) => skill.id);

function getAvailableOptimizerIds(unlockedSkills: string[]) {
  return optimizerSkillIds.filter((skillId) => unlockedSkills.includes(skillId));
}

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
  addNode: (node: Node<LayerNodeData>) => {
    const unlockedSkills = useGameStore.getState().unlockedSkills;
    set((s) => ({
      nodes: [
        ...s.nodes,
        {
          ...node,
          data: sanitizeLayerNodeData(node.data, unlockedSkills),
        },
      ],
    }));
  },
  updateNodeData: (nodeId: string, data: Partial<LayerNodeData>) => {
    const unlockedSkills = useGameStore.getState().unlockedSkills;
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: sanitizeLayerNodeData({ ...n.data, ...data }, unlockedSkills),
            }
          : n,
      ),
    }));
  },

  // --- 学習条件操作 ---
  setSelectedOptimizer: (id: string) => set({ selectedOptimizer: id }),
  setLearningRate: (lr: number) => set({ learningRate: lr }),
  setBatchSize: (bs: number) => set({ batchSize: bs }),
  setEpochs: (epochs: number) => set({ epochs }),
  syncStageTrainingSettings: (stage, unlockedSkills) =>
    set((state) => {
      const stageChanged = state.configuredStageId !== stage.id;
      const availableOptimizerIds = getAvailableOptimizerIds(unlockedSkills);
      const recommendedOptimizer = stage.trainingPreset?.recommendedOptimizer;
      const preferredOptimizer =
        recommendedOptimizer && availableOptimizerIds.includes(recommendedOptimizer)
          ? recommendedOptimizer
          : availableOptimizerIds[0] ?? state.selectedOptimizer;

      const nextState: Partial<PlayStore> = {};

      if (stageChanged) {
        nextState.configuredStageId = stage.id;
        nextState.learningRate =
          stage.trainingPreset?.learningRate ?? state.learningRate;
        nextState.batchSize = stage.trainingPreset?.batchSize ?? state.batchSize;
        nextState.epochs = stage.trainingPreset?.epochs ?? state.epochs;
        nextState.trainingStatus = initialState.trainingStatus;
        nextState.metrics = [];
        nextState.activeTrainingRunId = null;
        nextState.lastTrainingResult = null;
        nextState.pendingStageClearId = null;
        nextState.trainingErrorMessage = null;
      }

      if (
        !availableOptimizerIds.includes(state.selectedOptimizer) ||
        (stageChanged && preferredOptimizer !== state.selectedOptimizer)
      ) {
        nextState.selectedOptimizer = preferredOptimizer;
      }

      return Object.keys(nextState).length > 0 ? nextState : state;
    }),

  // --- 学習状態操作 ---
  setTrainingStatus: (status: TrainingStatus) =>
    set({ trainingStatus: status }),
  addMetrics: (m: TrainingMetrics) =>
    set((s) => ({ metrics: [...s.metrics, m] })),
  resetTrainingState: () =>
    set({
      trainingStatus: initialState.trainingStatus,
      metrics: initialState.metrics,
      lastTrainingResult: initialState.lastTrainingResult,
      pendingStageClearId: initialState.pendingStageClearId,
      trainingErrorMessage: initialState.trainingErrorMessage,
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
  dismissStageClearPopup: () => set({ pendingStageClearId: null }),
  startTraining: async () => {
    const { currentStageIndex, addPoints, clearStage } = useGameStore.getState();
    const stage = STAGE_DATA[currentStageIndex];
    if (!stage) return;

    const { nodes, edges, selectedOptimizer, learningRate, epochs, batchSize } = get();
    let sortedNodes = nodes;

    try {
      validateSequentialLayerGraph(nodes, edges);
      sortedNodes =
        edges.length > 0 && nodes.length > 1
          ? sortLayerNodesTopologically(nodes, edges)
          : nodes;
    } catch (error) {
      set({
        trainingStatus: "failed",
        metrics: [],
        activeTrainingRunId: null,
        lastTrainingResult: null,
        pendingStageClearId: null,
        trainingErrorMessage:
          error instanceof Error ? error.message : "Training failed.",
      });
      return;
    }

    const layers: LayerNodeData[] = sortedNodes.map((node) =>
      sanitizeLayerNodeData(node.data, useGameStore.getState().unlockedSkills),
    );

    const visualizerStore = useVisualizerStore.getState();
    const datasetPreview = await visualizerStore.prepareVisualization(stage);
    if (!datasetPreview) {
      set({
        trainingStatus: "failed",
        metrics: [],
        activeTrainingRunId: null,
        lastTrainingResult: null,
        pendingStageClearId: null,
        trainingErrorMessage: "Failed to prepare the dataset.",
      });
      return;
    }

    const runId = get().beginTrainingRun();
    const trainingSeed = deriveSeed(currentStageIndex + 1, runId);
    get().resetTrainingState();
    set({ trainingStatus: "training" });

    let dataset: ReturnType<typeof deserializeDataset> | null = null;
    let model: ReturnType<typeof buildModel> | null = null;

    try {
      const activeModel = buildModel(
        layers,
        stage,
        selectedOptimizer,
        learningRate,
        trainingSeed,
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
        seed: trainingSeed,
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

      const cleared =
        stage.taskType === "regression"
          ? result.finalLoss <= (stage.targetLoss ?? Number.POSITIVE_INFINITY)
          : (result.finalAccuracy ?? 0) >= stage.targetAccuracy;

      if (cleared) {
        clearStage(stage.id);
        addPoints(stage.rewardPoints);
        set({
          trainingStatus: "completed",
          lastTrainingResult: result,
          pendingStageClearId: stage.id,
          trainingErrorMessage: null,
        });
      } else {
        set({
          trainingStatus: "failed",
          lastTrainingResult: result,
          pendingStageClearId: null,
          trainingErrorMessage: null,
        });
      }
    } catch (error) {
      console.error("Training failed:", error);
      if (get().isTrainingRunCurrent(runId)) {
        set({
          trainingStatus: "failed",
          lastTrainingResult: null,
          pendingStageClearId: null,
          trainingErrorMessage:
            error instanceof Error ? error.message : "Training failed.",
        });
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
