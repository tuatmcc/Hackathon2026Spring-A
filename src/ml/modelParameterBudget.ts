import type { LayerNodeData, StageDef } from "../types";

export const BASE_MODEL_PARAMETER_CAP = 32;

export const MODEL_PARAMETER_CAP_SKILL_OPTIONS = [
  { skillId: "model_params_cap_32", value: 32 },
  { skillId: "model_params_cap_64", value: 64 },
  { skillId: "model_params_cap_128", value: 128 },
  { skillId: "model_params_cap_256", value: 256 },
  { skillId: "model_params_cap_512", value: 512 },
  { skillId: "model_params_cap_1024", value: 1024 },
  { skillId: "model_params_cap_4096", value: 4096 },
] as const;

export interface ModelParameterEstimate {
  parameterCount: number;
  outputShape: number[];
  isOutputShapeValid: boolean;
}

function multiplyShape(shape: number[]) {
  return shape.reduce((product, dim) => product * dim, 1);
}

function formatShape(shape: number[]) {
  return `[batch, ${shape.join(", ")}]`;
}

function ensurePositiveInt(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function applyDenseShape(inputShape: number[], units: number) {
  const lastDimension = inputShape[inputShape.length - 1];
  ensurePositiveInt(lastDimension, "Dense input dimension");
  ensurePositiveInt(units, "Dense units");

  return {
    nextShape: [...inputShape.slice(0, -1), units],
    parameterCount: lastDimension * units + units,
  };
}

function applyConv2dShape(inputShape: number[], filters: number, kernelSize: number) {
  if (inputShape.length !== 3) {
    throw new Error(
      `Conv2D requires [height, width, channels] input. Current shape is ${formatShape(inputShape)}.`,
    );
  }

  const [height, width, channels] = inputShape;
  ensurePositiveInt(height, "Conv2D input height");
  ensurePositiveInt(width, "Conv2D input width");
  ensurePositiveInt(channels, "Conv2D input channels");
  ensurePositiveInt(filters, "Conv2D filters");
  ensurePositiveInt(kernelSize, "Conv2D kernel size");

  const nextHeight = height - kernelSize + 1;
  const nextWidth = width - kernelSize + 1;
  if (nextHeight <= 0 || nextWidth <= 0) {
    throw new Error(
      `Conv2D kernel ${kernelSize} is too large for input shape ${formatShape(inputShape)}.`,
    );
  }

  return {
    nextShape: [nextHeight, nextWidth, filters],
    parameterCount: kernelSize * kernelSize * channels * filters + filters,
  };
}

function applyFlattenShape(inputShape: number[]) {
  return {
    nextShape: [multiplyShape(inputShape)],
    parameterCount: 0,
  };
}

export function formatParameterCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function getModelParameterCap(unlockedSkills: string[]) {
  let maxParameters = BASE_MODEL_PARAMETER_CAP;

  for (const { skillId, value } of MODEL_PARAMETER_CAP_SKILL_OPTIONS) {
    if (unlockedSkills.includes(skillId)) {
      maxParameters = Math.max(maxParameters, value);
    }
  }

  return maxParameters;
}

export function estimateModelParameterCount(
  layers: LayerNodeData[],
  stage: StageDef,
): ModelParameterEstimate {
  let currentShape = [...stage.inputShape];
  let parameterCount = 0;

  for (const layer of layers) {
    switch (layer.layerType) {
      case "dense": {
        const denseResult = applyDenseShape(currentShape, layer.units);
        currentShape = denseResult.nextShape;
        parameterCount += denseResult.parameterCount;
        break;
      }

      case "conv2d": {
        const convResult = applyConv2dShape(
          currentShape,
          layer.filters ?? layer.units,
          layer.kernelSize ?? 3,
        );
        currentShape = convResult.nextShape;
        parameterCount += convResult.parameterCount;
        break;
      }

      case "flatten": {
        const flattenResult = applyFlattenShape(currentShape);
        currentShape = flattenResult.nextShape;
        break;
      }

      default: {
        const denseResult = applyDenseShape(currentShape, layer.units);
        currentShape = denseResult.nextShape;
        parameterCount += denseResult.parameterCount;
      }
    }
  }

  const outputResult = applyDenseShape(currentShape, stage.outputUnits);
  parameterCount += outputResult.parameterCount;

  return {
    parameterCount,
    outputShape: outputResult.nextShape,
    isOutputShapeValid: outputResult.nextShape.length === 1,
  };
}
