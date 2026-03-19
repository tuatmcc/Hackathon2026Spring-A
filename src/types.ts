// ============================================================
// 共通型定義 — 全モジュールの「共通言語」
// ============================================================

// ---------- スキルツリー (マスターデータ) ----------

/** スキルツリーの種別。画面上で4本のツリーとして表示される */
export type SkillTreeId =
  | "layer"
  | "activation"
  | "optimizer"
  | "regularization";

/** スキル定義 — ゲームバランスの関心事のみ。ML の build 方法は含まない */
export interface SkillDef {
  id: string;
  treeId: SkillTreeId;
  name: string;
  description: string;
  detail: string;
  cost: number; // 0 = 初期解放
  dependencies: string[]; // 前提スキルID（なければ空配列）
}

// ---------- ステージ (マスターデータ) ----------

export interface StageDef {
  id: string;
  name: string;
  description: string;
  /** datasets.ts のレジストリキー */
  datasetId: string;
  /** 入力テンソルの形状。[1] = 1D特徴量, [2] = 2D特徴量, [28,28,1] = 画像 */
  inputShape: number[];
  taskType: "binary" | "multiclass" | "regression";
  /** ステージが固定する最終層 */
  outputUnits: number;
  outputActivation: string; // "sigmoid" | "softmax" | "linear"
  lossFunction: string; // "binaryCrossentropy" | "categoricalCrossentropy" | "meanSquaredError"
  /** クリア条件: 分類は accuracy >= targetAccuracy */
  targetAccuracy: number;
  /** クリア条件: 回帰は MSE <= targetLoss */
  targetLoss?: number;
  rewardPoints: number;
}

// ---------- プレイ中のノードデータ ----------

/** React Flow の Node.data に入れるもの。「見た目の情報」 */
export interface LayerNodeData {
  /** 層の種類。スキルID と一致する ("dense" | "conv2d" | "flatten") */
  layerType: string;
  /** ユニット数 */
  units: number;
  /** 活性化関数。スキルID と一致する ("relu" | "sigmoid" | null) */
  activation: string | null;
  /** 正則化。スキルID と一致する ("dropout" | "l1" | "l2" | null) */
  regularization: string | null;
  regularizationRate: number;
  /** conv2d用: フィルタ数 */
  filters?: number;
  /** conv2d用: カーネルサイズ */
  kernelSize?: number;
  [key: string]: unknown; // React Flow 互換
}

// ---------- 学習 ----------

export interface TrainingMetrics {
  epoch: number;
  loss: number;
  valLoss?: number;
  accuracy?: number;
  valAccuracy?: number;
}

export type TrainingStatus = "idle" | "training" | "completed" | "failed";

// ---------- ルーティング ----------

export type PageId = "play" | "skillTree";
