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
import type { TrainingStatus, TrainingMetrics, LayerNodeData } from "../types";

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

  // --- リセット ---
  resetPlay: () => set({ ...initialState }),
}));
