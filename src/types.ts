// ============================================================
// 共通型定義
// ============================================================

import type { Node, Edge, NodeChange, EdgeChange, Connection } from "@xyflow/react";

// ---------- マスターデータ ----------

/** スキル（層・活性化関数・正則化など）のマスターデータ */
export interface SkillDef {
  id: string;
  name: string;
  type: "layer" | "activation" | "regularization" | "optimizer";
  cost: number; // 解放に必要なポイント。0 = 初期解放
  dependencies: string[]; // 前提スキルID
  description: string;
  /** layer 固有: 設定可能な最大ユニット数 */
  maxNodes?: number;
}

/** ステージのマスターデータ */
export interface StageDef {
  id: string;
  name: string;
  description: string;
  /** データセットを生成する関数の識別子 */
  datasetId: string;
  /** クリア条件の Loss しきい値 */
  targetLoss: number;
  /** クリア報酬ポイント */
  rewardPoints: number;
}

// ---------- ストア ----------

/** ゲーム進行ストアの状態 */
export interface GameState {
  points: number;
  unlockedSkills: string[];
  clearedStages: string[];
  /** 現在挑戦中のステージIndex (STAGE_DATA の添字) */
  currentStageIndex: number;
  unlockSkill: (skillId: string) => void;
  addPoints: (amount: number) => void;
  /** ステージクリア → clearedStages に追加し、次ステージへ自動進行 */
  clearStage: (stageId: string) => void;
  /** メニューから任意のステージに切り替える（過去ステージ再挑戦用） */
  selectStage: (index: number) => void;
}

/** 学習指標 */
export interface TrainingMetrics {
  epoch: number;
  loss: number;
  accuracy?: number;
}

export type TrainingStatus = "idle" | "training" | "completed" | "failed";

/** プレイ用ストアの状態 */
export interface PlayState {
  nodes: Node[];
  edges: Edge[];
  trainingStatus: TrainingStatus;
  metrics: TrainingMetrics[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setTrainingStatus: (status: TrainingStatus) => void;
  addMetrics: (m: TrainingMetrics) => void;
  resetPlay: () => void;
}

// ---------- ルーティング ----------

export type PageId = "play" | "skillTree";
