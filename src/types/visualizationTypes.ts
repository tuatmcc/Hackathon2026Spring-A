// ---------- ビジュアライザ型定義 ----------

export interface SerializedDataset {
  sampleCount: number;
  inputShape: number[];
  outputUnits: number;
  xs: number[];
  ys: number[];
  labels: number[];
  imageShape: number[] | null;
}

export interface VisualizationDomain {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface DecisionBoundarySnapshot {
  kind: "boundary";
  gridSize: number;
  values: number[];
  domain: VisualizationDomain;
  epoch?: number;
}

export interface DigitsPrediction {
  sampleIndex: number;
  predictedLabel: number;
  confidence: number;
  classConfidences: number[];
  isCorrect: boolean;
}

export interface DigitsPredictionSnapshot {
  kind: "digits";
  predictions: DigitsPrediction[];
  epoch?: number;
}

export interface RegressionCurvePoint {
  x: number;
  y: number;
}

export interface RegressionCurveSnapshot {
  kind: "regression";
  predictedPoints: RegressionCurvePoint[];
  domain: VisualizationDomain;
  epoch?: number;
}

export type VisualizationSnapshot =
  | DecisionBoundarySnapshot
  | DigitsPredictionSnapshot
  | RegressionCurveSnapshot;
