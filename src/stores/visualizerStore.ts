import * as tf from "@tensorflow/tfjs";
import { create } from "zustand";
import type { StageDef } from "../types";
import type {
  DigitsPredictionSnapshot,
  SerializedDataset,
  VisualizationSnapshot,
} from "../types/visualizationTypes";
import {
  getAsyncDatasetLoader,
  getDatasetGenerator,
  isAsyncDataset,
} from "../ml/datasets";
import { predictDigitsSample, serializeDataset } from "../ml/visualization";

interface VisualizerStore {
  visualizationStageId: string | null;
  datasetPreview: SerializedDataset | null;
  visualizationSnapshot: VisualizationSnapshot | null;
  visualizationModelStageId: string | null;
  visualizationModel: tf.LayersModel | null;
  prepareVisualization: (stage: StageDef | null) => Promise<SerializedDataset | null>;
  setVisualizationSnapshot: (snapshot: VisualizationSnapshot | null) => void;
  setVisualizationModel: (
    stageId: string | null,
    model: tf.LayersModel | null,
  ) => void;
  ensureDigitsPrediction: (stage: StageDef, sampleIndex: number) => Promise<void>;
  resetVisualization: () => void;
}

const initialState = {
  visualizationStageId: null as string | null,
  datasetPreview: null as SerializedDataset | null,
  visualizationSnapshot: null as VisualizationSnapshot | null,
  visualizationModelStageId: null as string | null,
  visualizationModel: null as tf.LayersModel | null,
};

const pendingDigitsPredictionRequests = new Map<string, Promise<void>>();

function disposeVisualizationModel(model: tf.LayersModel | null) {
  model?.dispose();
}

export const useVisualizerStore = create<VisualizerStore>()((set, get) => ({
  ...initialState,

  prepareVisualization: async (stage: StageDef | null) => {
    if (!stage) {
      disposeVisualizationModel(get().visualizationModel);
      pendingDigitsPredictionRequests.clear();
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
      if (current.visualizationStageId !== stage.id) {
        disposeVisualizationModel(current.visualizationModel);
        pendingDigitsPredictionRequests.clear();
      }
      set({
        visualizationStageId: stage.id,
        datasetPreview,
        visualizationSnapshot: null,
        visualizationModelStageId:
          current.visualizationStageId === stage.id
            ? current.visualizationModelStageId
            : null,
        visualizationModel:
          current.visualizationStageId === stage.id
            ? current.visualizationModel
            : null,
      });
      return datasetPreview;
    } finally {
      rawDataset.xs.dispose();
      rawDataset.ys.dispose();
    }
  },

  setVisualizationSnapshot: (snapshot: VisualizationSnapshot | null) =>
    set({ visualizationSnapshot: snapshot }),

  setVisualizationModel: (stageId, model) => {
    const currentModel = get().visualizationModel;
    if (currentModel && currentModel !== model) {
      disposeVisualizationModel(currentModel);
    }

    pendingDigitsPredictionRequests.clear();
    set((state) => ({
      visualizationModelStageId: stageId,
      visualizationModel: model,
      visualizationSnapshot:
        stageId != null &&
        state.visualizationStageId === stageId &&
        state.visualizationSnapshot?.kind === "digits"
          ? {
              ...state.visualizationSnapshot,
              predictions: [],
            }
          : state.visualizationSnapshot,
    }));
  },

  ensureDigitsPrediction: async (stage, sampleIndex) => {
    const initial = get();
    const snapshot = initial.visualizationSnapshot;
    if (
      initial.visualizationStageId !== stage.id ||
      initial.visualizationModelStageId !== stage.id ||
      initial.datasetPreview == null ||
      initial.visualizationModel == null ||
      snapshot?.kind !== "digits"
    ) {
      return;
    }

    if (snapshot.predictions[sampleIndex]) {
      return;
    }

    const requestKey = `${stage.id}:${sampleIndex}`;
    const existingRequest = pendingDigitsPredictionRequests.get(requestKey);
    if (existingRequest) {
      await existingRequest;
      return;
    }

    const request = (async () => {
      const prediction = await predictDigitsSample(
        initial.visualizationModel!,
        initial.datasetPreview!,
        stage,
        sampleIndex,
      );
      if (!prediction) {
        return;
      }

      const current = get();
      const currentSnapshot = current.visualizationSnapshot;
      if (
        current.visualizationStageId !== stage.id ||
        current.visualizationModelStageId !== stage.id ||
        currentSnapshot?.kind !== "digits"
      ) {
        return;
      }

      if (currentSnapshot.predictions[prediction.sampleIndex]) {
        return;
      }

      const nextPredictions = currentSnapshot.predictions.slice();
      nextPredictions[prediction.sampleIndex] = prediction;

      set({
        visualizationSnapshot: {
          ...(currentSnapshot as DigitsPredictionSnapshot),
          predictions: nextPredictions,
        },
      });
    })().finally(() => {
      pendingDigitsPredictionRequests.delete(requestKey);
    });

    pendingDigitsPredictionRequests.set(requestKey, request);
    await request;
  },

  resetVisualization: () => {
    disposeVisualizationModel(get().visualizationModel);
    pendingDigitsPredictionRequests.clear();
    set({ ...initialState });
  },
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
