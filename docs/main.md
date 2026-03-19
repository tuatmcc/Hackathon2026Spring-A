## 1. システムアーキテクチャ概要

ゲームの進行状況（永続化）と、各ステージプレイ中の機械学習の推論・学習状態（非永続化）を明確に分離することが設計の要になります。

* **フロントエンド:** React 19 (Vite 8)
* **ノードエディタ:** @xyflow/react (React Flow v12)
* **機械学習エンジン:** TensorFlow.js (@tensorflow/tfjs)
* **状態管理:** Zustand (persistミドルウェアを活用)
* **ページ遷移:** Zustandのステート (`currentPage`) による2タブ切替（React Router は不使用）。ステージ選択はメニューオーバーレイで行う
* **グラフ描画:** 未導入（Recharts / Chart.js 等を今後導入予定）

---

## 2. プロジェクト構成

```
src/
├── types.ts                 # 共通型定義 (SkillDef, StageDef, GameState, PlayState 等)
├── config/
│   ├── skills.ts            # スキルマスターデータ
│   └── stages.ts            # ステージマスターデータ
├── stores/
│   ├── gameStore.ts         # ゲーム進行ストア (Zustand persist → localStorage)
│   └── playStore.ts         # プレイ用ストア (メモリのみ)
├── ml/
│   ├── datasets.ts          # データセット生成関数 + レジストリ
│   ├── graphToModel.ts      # React Flow グラフ → tf.LayersModel 変換
│   └── trainer.ts           # 学習ループ (model.fit ラッパー)
├── components/
│   ├── NetworkEditor.tsx    # React Flow ノードエディタ
│   ├── TrainingPanel.tsx    # 学習開始ボタン・メトリクス表示
│   ├── DataVisualization.tsx # データ散布図・決定境界（プレースホルダー）
│   └── SkillTree.tsx        # スキルツリーUI
├── pages/
│   ├── StageSelectPage.tsx  # メニューオーバーレイ（ステージ選択・設定）
│   ├── PlayPage.tsx         # メイン画面（構築・バトル）
│   └── SkillTreePage.tsx    # スキルツリー画面
├── App.tsx                  # ルート（ボトムタブ2画面 + メニューオーバーレイ）
├── App.css                  # レイアウトCSS
├── index.css                # グローバルCSS
└── main.tsx                 # エントリポイント
```

---

## 3. 状態管理設計 (Zustand)

Zustandのストアを「ゲーム進行用」と「プレイ（ML）用」の2つに分けることで、「ゲーム側のセーブデータのみローカルストレージに保存する」をシンプルに実現しています。

### ゲーム進行ストア (Game Store) — `src/stores/gameStore.ts`

Zustandの `persist` ミドルウェアを使用してローカルストレージに自動保存します（キー名: `nn-game-save`）。

| 状態名 | 型 | 説明 |
| :--- | :--- | :--- |
| `points` | `number` | 現在の所持ポイント |
| `unlockedSkills` | `string[]` | 解放済みのスキルID一覧（初期値: `SKILL_DATA` の `cost === 0` から動的に算出。現在は `['dense_layer', 'relu']`） |
| `clearedStages` | `string[]` | クリア済みのステージID一覧 |
| `currentStageIndex` | `number` | 現在挑戦中のステージの添字（`STAGE_DATA` のインデックス）。クリア時に自動で次へ進行する |
| `currentPage` | `PageId` | 現在表示中のタブ（`"play"` / `"skillTree"`） |
| `showMenu` | `boolean` | メニューオーバーレイの表示状態（永続化しない） |
| `unlockSkill` | `(skillId: string) => void` | ポイントを消費してスキルを解放するアクション（コスト・依存関係・重複チェック付き） |
| `addPoints` | `(amount: number) => void` | ステージクリア時にポイントを追加するアクション |
| `clearStage` | `(stageId: string) => void` | ステージをクリア済みとして記録し、現在のステージであれば次ステージへ自動進行するアクション |
| `selectStage` | `(index: number) => void` | メニューから任意のステージに切り替えるアクション（過去ステージ再挑戦用） |
| `setPage` | `(page: PageId) => void` | タブ切替アクション |
| `setShowMenu` | `(show: boolean) => void` | メニューオーバーレイの開閉 |

### プレイ用ストア (Play Store) — `src/stores/playStore.ts`

ローカルストレージには保存せず、メモリ上でのみ管理します。`resetPlay()` でステージを離れるたびにリセットします。

モデル (`tf.LayersModel`) はストアには保存せず、学習実行時にその場で構築・破棄します。

| 状態名 | 型 | 説明 |
| :--- | :--- | :--- |
| `nodes` | `Node[]` | React Flowのノード情報（配置された層） |
| `edges` | `Edge[]` | React Flowのエッジ情報（層の接続） |
| `trainingStatus` | `TrainingStatus` | `"idle"` / `"training"` / `"completed"` / `"failed"` |
| `metrics` | `TrainingMetrics[]` | Epochごとの `{ epoch, loss, accuracy? }` の履歴配列 |
| `setNodes` | `(nodes: Node[]) => void` | ノード一括設定 |
| `setEdges` | `(edges: Edge[]) => void` | エッジ一括設定 |
| `onNodesChange` | `(changes: NodeChange[]) => void` | React Flow のノード変更ハンドラ（`applyNodeChanges` を使用） |
| `onEdgesChange` | `(changes: EdgeChange[]) => void` | React Flow のエッジ変更ハンドラ（`applyEdgeChanges` を使用） |
| `onConnect` | `(connection: Connection) => void` | React Flow の接続ハンドラ（`addEdge` を使用） |
| `setTrainingStatus` | `(status: TrainingStatus) => void` | 学習状態の更新 |
| `addMetrics` | `(m: TrainingMetrics) => void` | メトリクスを1エポック分追加 |
| `resetPlay` | `() => void` | 全状態を初期値にリセット |

※ 現在プレイ中のステージはGame Storeの `currentStageIndex` で管理します。Play Storeはステージ情報を持ちません。

---

## 4. データ定義設計 (拡張性の確保)

ステージやスキルを後から簡単に追加・調整できるように、マスターデータとして独立した設定ファイルに定義します。型定義は `src/types.ts` にあります。

### スキル定義 — `src/config/skills.ts`

```typescript
// src/types.ts
export interface SkillDef {
  id: string;
  name: string;
  type: "layer" | "activation" | "regularization" | "optimizer";
  cost: number;           // 解放に必要なポイント。0 = 初期解放
  dependencies: string[]; // 前提スキルID（必須。なければ空配列）
  description: string;
  maxNodes?: number;      // layer 固有: 設定可能な最大ユニット数
}
```

```typescript
// src/config/skills.ts
export const SKILL_DATA: SkillDef[] = [
  {
    id: 'dense_layer',
    name: '全結合層 (Dense)',
    type: 'layer',
    cost: 0,
    dependencies: [],
    maxNodes: 128,
    description: '基本的なニューラルネットワークの層です。'
  },
  {
    id: 'relu',
    name: 'ReLU',
    type: 'activation',
    cost: 0,
    dependencies: [],
    description: '負の値を0にする活性化関数。最も一般的に使われます。'
  },
  {
    id: 'dropout',
    name: 'Dropout',
    type: 'regularization',
    cost: 150,
    dependencies: ['dense_layer'],
    description: '過学習を防ぐために、ランダムにノードを無効化します。'
  },
  // ... sigmoid, adam 等
];
```

### ステージ定義 — `src/config/stages.ts`

ステージ設定には関数への直接参照ではなく、文字列の `datasetId` を持たせ、`src/ml/datasets.ts` のレジストリ (`getDatasetGenerator`) 経由で実行時に解決します。これにより設定データがシリアライズ可能な純粋なデータとして保たれます。

```typescript
// src/types.ts
export interface StageDef {
  id: string;
  name: string;
  description: string;
  datasetId: string;     // datasets.ts のレジストリキー（例: "linear", "xor", "circle"）
  targetLoss: number;    // クリア条件の Loss しきい値
  rewardPoints: number;  // クリア報酬ポイント
}
```

```typescript
// src/config/stages.ts
export const STAGE_DATA: StageDef[] = [
  {
    id: 'stage_1_linear',
    name: '線形分離',
    description: '直線で2つのデータを分類しよう',
    datasetId: 'linear',
    targetLoss: 0.05,
    rewardPoints: 100
  },
  {
    id: 'stage_2_xor',
    name: 'XOR問題',
    description: '非線形なデータを分類しよう。隠れ層が必要になるかも？',
    datasetId: 'xor',
    targetLoss: 0.01,
    rewardPoints: 250
  },
  {
    id: 'stage_3_circle',
    name: '円形分離',
    description: '円形に分布するデータを分類しよう',
    datasetId: 'circle',
    targetLoss: 0.02,
    rewardPoints: 300
  }
];
```

---

## 5. MLモジュール — `src/ml/`

### データセット生成 — `datasets.ts`

```typescript
export interface Dataset {
  xs: tf.Tensor;
  ys: tf.Tensor;
}

export function generateLinearData(numSamples?: number): Dataset;
export function generateXORData(numSamples?: number): Dataset;
export function generateCircleData(numSamples?: number): Dataset;

/** datasetId からジェネレータ関数を引くレジストリ */
export function getDatasetGenerator(datasetId: string): (n?: number) => Dataset;
```

新しいデータセットを追加する場合は、生成関数を作成し `GENERATORS` マップに登録するだけで拡張できます。

### グラフ → モデル変換 — `graphToModel.ts`

```typescript
/** React Flow のノード・エッジから TensorFlow.js モデルを構築する */
export function buildModelFromGraph(nodes: Node[], edges: Edge[]): tf.LayersModel;
```

現在はスタブ実装（固定の Dense(8, relu) → Dense(1, sigmoid) を返す）。実装時はノード・エッジをトポロジカルソートし、各ノードの種類に応じた `tf.layers` を積み上げる必要があります。

### 学習ループ — `trainer.ts`

```typescript
export interface TrainOptions {
  epochs: number;
  learningRate: number;
  onEpochEnd?: (metrics: TrainingMetrics) => void;
}

/** モデルを学習させ、最終 loss を返す */
export async function trainModel(
  model: tf.LayersModel,
  dataset: Dataset,
  options: TrainOptions,
): Promise<number>;
```

---

## 6. 画面構成 (UI/UX)

ゲーム画面は **2つのメインタブ**（学習画面 / スキルツリー画面）で構成し、画面下部の大きなタブボタンで切り替えます。ステージ選択は上位階層のメニューオーバーレイで行います。

### レイアウト構成

```
┌──────────────── Header ─────────────────┐
│ NN Roguelike  [現在のステージ名]  100pt  [Menu] │
├─────────────────────────────────────────┤
│                                         │
│           メインコンテンツ                │
│       (PlayPage or SkillTreePage)       │
│                                         │
├─────────────────────────────────────────┤
│     [ Battle ]     [ Skill Tree ]       │  ← ボトムタブ（大きなボタン）
└─────────────────────────────────────────┘
```

### ステージ進行

* ステージはクリアすると **自動的に次のステージへ進行** します（`clearStage` 内で `currentStageIndex` をインクリメント）。
* ユーザーがステージを手動で選ぶ必要はありません。常に「現在のステージ」が1つあり、それに挑戦する形です。
* 過去にクリアしたステージへの再挑戦は、ヘッダーの **Menu ボタン** → メニューオーバーレイ内のステージ選択から行えます。

### メイン画面（構築・バトルフェーズ） — `PlayPage`

* **左ペイン:** `NetworkEditor`（@xyflow/react）を用いたネットワーク構築エリア。解放済みのスキル（ノード）をドラッグ＆ドロップで配置し、つなぎ合わせます。
* **右ペイン上部:** `DataVisualization` — 現在のデータセット（XORの散布図など）と、学習中の決定境界をリアルタイムで描画します（現在プレースホルダー）。
* **右ペイン下部:** `TrainingPanel` — 学習曲線（Loss/Accuracy）の折れ線グラフ（現在プレースホルダー）。「学習開始」ボタンとハイパーパラメータ（学習率やエポック数）の調整UIを配置します。

### スキルツリー画面（育成フェーズ） — `SkillTreePage`

* `SkillTree` コンポーネントを表示。RPGのスキルツリーのようなUI。未解放のスキルはグレーアウトさせ、所持ポイントと前提条件を満たしていればクリックで解放（Zustandの `unlockSkill` を発火）できるようにします。

### メニューオーバーレイ — `MenuOverlay` (`StageSelectPage.tsx`)

* ヘッダーの Menu ボタンから開くモーダル形式のオーバーレイです。
* 全ステージの一覧を表示し、クリア済み・現在挑戦中のステージを視覚的に区別します。
* 任意のステージを選択して再挑戦（`selectStage`）できます。選択するとプレイ状態がリセットされ、メニューが閉じます。

---

## 7. 開発ステップ

以下の順序でインクリメンタルに実装を進めます。現在の進捗も併記します。

1. **プロジェクト基盤の構築** — React環境のセットアップと、ZustandのGame Store（Persist付き）およびマスターデータ（Skill/Stage）の定義。**→ 完了**
2. **UIモックアップの作成** — @xyflow/react を導入し、ノードの配置と接続ができるメイン画面を作成。2タブ構成（Battle / Skill Tree）+ メニューオーバーレイの骨組み。**→ 骨組み完了（プレースホルダー状態）**
3. **グラフ→モデル変換の実装 (最重要)** — `buildModelFromGraph()`: React Flowのノードとエッジの情報を読み取り、`tf.sequential()` または Functional APIを用いて `tf.LayersModel` に変換するロジック。**→ スタブ実装のみ**
4. **学習ループの実装** — `trainModel()`: データセットを与え、ブラウザ上でモデルを `model.fit()` させ、Lossの推移を取得する処理。**→ 基本実装済み**
5. **UIとの結合** — 学習の進捗をチャートに描画し、データ可視化（散布図・決定境界）を実装し、クリア条件を満たしたらポイントを付与するフローを完成させる。**→ フロー自体は接続済み、チャート・可視化はプレースホルダー**
6. **スキルツリーとやり込み要素の実装** — スキルツリー画面のビジュアル改善、解放したスキルだけがReact Flow上で使えるように制限をかける、ステージやスキルを拡充する。**→ 基本UIのみ**
