## 1. システムアーキテクチャ概要

ゲームの進行状況（永続化）と、各ステージプレイ中の機械学習の推論・学習状態（非永続化）を明確に分離することが設計の要になります。

* **フロントエンド:** React (Vite環境を推奨)
* **ノードエディタ:** React Flow


* **機械学習エンジン:** TensorFlow.js (@tensorflow/tfjs)
* **状態管理:** Zustand (persistミドルウェアを活用)
* **グラフ描画:** Recharts または Chart.js (学習曲線やデータポイントのプロット用)

---

## 2. 状態管理設計 (Zustand)

Zustandのストアを「ゲーム進行用」と「プレイ（ML）用」の2つに分けることで、要件にある「ゲーム側のセーブデータのみローカルストレージに保存する」をシンプルに実現できます。

### ゲーム進行ストア (Game Store)
Zustandの `persist` ミドルウェアを使用してローカルストレージに自動保存します。

| 状態名 | 型 | 説明 |
| :--- | :--- | :--- |
| `points` | number | 現在の所持ポイント |
| `unlockedSkills` | string[] | 解放済みのスキルID一覧（初期値: `['dense', 'relu']`等） |
| `clearedStages` | string[] | クリア済みのステージID一覧 |
| `unlockSkill` | function | ポイントを消費してスキルを解放するアクション |
| `addPoints` | function | ステージクリア時にポイントを追加するアクション |

### プレイ用ストア (Play Store)
ローカルストレージには保存せず、メモリ上でのみ管理します。ステージを離れるたびにリセットします。

| 状態名 | 型 | 説明 |
| :--- | :--- | :--- |
| `nodes` | array | React Flowのノード情報（配置された層） |
| `edges` | array | React Flowのエッジ情報（層の接続） |
| `trainingStatus` | string | `idle`, `training`, `completed`, `failed` |
| `metrics` | object | 現在のEpochごとのLossやAccuracyの履歴 |
| `currentModel` | tf.LayersModel \| null | コンパイル済みのTensorFlow.jsモデル |

---

## 3. データ定義設計 (拡張性の確保)

ステージやスキルを後から簡単に追加・調整できるように、マスターデータとして独立した設定ファイル（例: `config/skills.ts`, `config/stages.ts`）に定義します。

**スキルの定義例:**
```typescript
export const SKILL_DATA = [
  {
    id: 'dense_layer',
    name: '全結合層 (Dense)',
    type: 'layer',
    cost: 0, // 初期解放
    maxNodes: 128, // 設定可能な最大ユニット数
    description: '基本的なニューラルネットワークの層です。'
  },
  {
    id: 'dropout',
    name: 'Dropout',
    type: 'regularization',
    cost: 150,
    dependencies: ['dense_layer'], // 前提スキル
    description: '過学習を防ぐために、ランダムにノードを無効化します。'
  }
];
```

**ステージの定義例:**
```typescript
export const STAGE_DATA = [
  {
    id: 'stage_1_linear',
    name: '線形分離',
    description: '直線で2つのデータを分類しよう',
    datasetGenerator: generateLinearData, // tf.tensorを返す関数への参照
    targetLoss: 0.05, // クリア条件
    rewardPoints: 100
  },
  {
    id: 'stage_2_xor',
    name: 'XOR問題',
    description: '非線形なデータを分類しよう。隠れ層が必要になるかも？',
    datasetGenerator: generateXORData,
    targetLoss: 0.01,
    rewardPoints: 250
  }
];
```

---

## 4. 画面構成 (UI/UX)

画面は大きく分けて2つのビューで構成し、React Router等で切り替えます。

* **メイン画面（構築・バトルフェーズ）:**
  * **左ペイン:** React Flowを用いたネットワーク構築エリア。解放済みのスキル（ノード）をドラッグ＆ドロップで配置し、つなぎ合わせます。
  * **右ペイン上部:** タスクの可視化。現在のデータセット（XORの散布図など）と、学習中の決定境界（モデルの推論結果）をリアルタイムで描画します。
  * **右ペイン下部:** 学習曲線（Loss/Accuracy）の折れ線グラフ。「学習開始」ボタンとハイパーパラメータ（学習率やエポック数）の調整UIを配置します。
* **スキルツリー画面（育成フェーズ）:**
  * RPGのスキルツリーのようなUI。未解放のスキルはグレーアウトさせ、所持ポイントと前提条件を満たしていればクリックで解放（Zustandの `unlockSkill` を発火）できるようにします。

---

## 5. 開発ステップ

以下の順序でインクリメンタルに実装を進めることをお勧めします。

1. **プロジェクト基盤の構築:** React環境のセットアップと、ZustandのGame Store（Persist付き）およびマスターデータ（Skill/Stage）の仮定義を行います。
2. **UIモックアップの作成:** React Flowを導入し、ノードの配置と接続ができるだけのメイン画面を作成します。
3. **TF.jsコンバータの実装 (最重要):** React Flowのノードとエッジの情報を読み取り、`tf.sequential()` または Functional APIを用いて `tf.LayersModel` に変換するロジックを記述します。
4. **学習ループの実装:** 仮のデータセット（XORなど）を与え、ブラウザ上でモデルを `model.fit()` させ、Lossの推移を取得する処理を作ります。
5. **UIとの結合:** 学習の進捗をチャートに描画し、クリア条件を満たしたらポイントを付与するフローを完成させます。
6. **スキルツリーとやり込み要素の実装:** スキルツリー画面を作成し、解放したスキルだけがReact Flow上で使えるように制限をかけます。最後にステージやスキルを拡充します。
