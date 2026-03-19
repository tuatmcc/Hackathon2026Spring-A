import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import type { PlayState, TrainingStatus, TrainingMetrics } from "../types";
import type { Node, Edge, NodeChange, EdgeChange, Connection } from "@xyflow/react";

const initialState: Omit<
  PlayState,
  | "setNodes"
  | "setEdges"
  | "onNodesChange"
  | "onEdgesChange"
  | "onConnect"
  | "setTrainingStatus"
  | "addMetrics"
  | "resetPlay"
> = {
  nodes: [],
  edges: [],
  trainingStatus: "idle" as TrainingStatus,
  metrics: [] as TrainingMetrics[],
};

export const usePlayStore = create<PlayState>()((set, get) => ({
  ...initialState,

  setNodes: (nodes: Node[]) => set({ nodes }),
  setEdges: (edges: Edge[]) => set({ edges }),

  onNodesChange: (changes: NodeChange[]) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes: EdgeChange[]) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection: Connection) =>
    set({ edges: addEdge(connection, get().edges) }),

  setTrainingStatus: (status: TrainingStatus) => set({ trainingStatus: status }),

  addMetrics: (m: TrainingMetrics) =>
    set((s) => ({ metrics: [...s.metrics, m] })),

  resetPlay: () => set({ ...initialState }),
}));
