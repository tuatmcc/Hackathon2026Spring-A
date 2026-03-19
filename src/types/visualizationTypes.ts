// ---------- ビジュアライザ型定義 ----------

export interface SerializedDataset {
    sampleCount: number;
    inputShape: number[];
    outputUnits: number;
    xs: number[];
    ys: number[];
}

export interface VisualizationDomain {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export interface DecisionBoundarySnapshot {
    gridSize: number;
    values: number[];
    domain: VisualizationDomain;
    epoch?: number;
}