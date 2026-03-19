import { create } from "zustand";
import type { StageDef } from "../types";
import type {
  SerializedDataset,
  VisualizationSnapshot,
} from "../types/visualizationTypes";
import {
  getAsyncDatasetLoader,
  getDatasetGenerator,
  isAsyncDataset,
} from "../ml/datasets";
import { serializeDataset } from "../ml/visualization";

interface VisualizerStore {
  visualizationStageId: string | null;
  datasetPreview: SerializedDataset | null;
  visualizationSnapshot: VisualizationSnapshot | null;
  prepareVisualization: (stage: StageDef | null) => Promise<SerializedDataset | null>;
  setVisualizationSnapshot: (snapshot: VisualizationSnapshot | null) => void;
  resetVisualization: () => void;
}

const initialState = {
  visualizationStageId: null as string | null,
  datasetPreview: null as SerializedDataset | null,
  visualizationSnapshot: null as VisualizationSnapshot | null,
};

export const useVisualizerStore = create<VisualizerStore>()((set, get) => ({
  ...initialState,

  prepareVisualization: async (stage: StageDef | null) => {
    if (!stage) {
      set({ ...initialState });
      return null;
    }

    const current = get();
    if (
      current.visualizationStageId === stage.id &&
      current.datasetPreview != null
    ) {
      return current.datasetPreview;
    }

    const rawDataset = await loadDataset(stage);

    try {
      const datasetPreview = serializeDataset(rawDataset, stage);
      set({
        visualizationStageId: stage.id,
        datasetPreview,
        visualizationSnapshot: null,
      });
      return datasetPreview;
    } finally {
      rawDataset.xs.dispose();
      rawDataset.ys.dispose();
    }
  },

  setVisualizationSnapshot: (snapshot: VisualizationSnapshot | null) =>
    set({ visualizationSnapshot: snapshot }),

  resetVisualization: () => set({ ...initialState }),
}));

async function loadDataset(stage: StageDef) {
  if (isAsyncDataset(stage.datasetId)) {
    const loader = getAsyncDatasetLoader(stage.datasetId);
    if (!loader) {
      throw new Error(`Unknown async dataset: ${stage.datasetId}`);
    }

    return await loader();
  }

  return getDatasetGenerator(stage.datasetId)();
}
