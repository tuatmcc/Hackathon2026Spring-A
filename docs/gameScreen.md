# ゲーム画面 (PlayPage) 実装ガイド

[TensorFlow Playground](https://playground.tensorflow.org/) を参考にする。

## 画面構成

```
┌─────────────────────────────────────────┐
│ Header: ステージ名 / ポイント / Menu    │
├──────────────────┬──────────────────────┤
│                  │ ステージ情報          │
│  NodePalette     │ (name, description,  │
│  ──────────────  │  targetAccuracy)     │
│                  ├──────────────────────┤
│  NetworkEditor   │ DataVisualization    │
│  (React Flow)    │ (散布図+決定境界)     │
│                  ├──────────────────────┤
│  ──────────────  │ TrainingPanel        │
│  LayerConfig     │ (optimizer, lr,      │
│  Panel           │  batch, epochs,      │
│                  │  Start, メトリクス)   │
├──────────────────┴──────────────────────┤
│     [ Battle ]     [ Skill Tree ]       │
└─────────────────────────────────────────┘
```

## 各コンポーネントの責務

### NodePalette (`components/NodePalette.tsx`)

- `gameStore.unlockedSkills` を読んで、使える層の種類だけ表示
- クリック（将来D&D）で `Node<LayerNodeData>` を playStore に追加
- **現状:** クリックでノード追加するモック実装済み
- **TODO:** D&D 実装、アイコン表示

### NetworkEditor (`components/NetworkEditor.tsx`)

- React Flow のキャンバス。nodes / edges を表示
- ノードクリックで LayerConfigPanel に選択を渡す
- **現状:** 基本的なノード表示・接続が動作
- **TODO:** カスタムノード（layerType, units, activation を表示）、エッジバリデーション

### LayerConfigPanel (`components/LayerConfigPanel.tsx`)

- 選択中ノードの `units`, `activation`, `regularization` を編集
- activation / regularization の選択肢は `unlockedSkills` でフィルタ
- **現状:** モック実装済み。number input + select で編集可能
- **TODO:** スライダーUI、ビジュアル改善

### TrainingPanel (`components/TrainingPanel.tsx`)

- `selectedOptimizer`, `learningRate`, `batchSize`, `epochs` を編集
- optimizer の選択肢は `unlockedSkills` でフィルタ
- 「Start Training」ボタンで `onStartTraining` を発火
- epoch ごとのメトリクス表示
- **現状:** モック実装済み
- **TODO:** 学習曲線グラフ (Recharts / Chart.js)

### DataVisualization (`components/DataVisualization.tsx`)

- `stage.inputShape` / `stage.taskType` に応じて可視化方法を分岐
- **現状:** プレースホルダー
- **TODO:**
  - `inputShape=[2]` → 2D散布図 + 決定境界
  - `inputShape=[28,28,1]` → サンプル画像表示
  - 学習中のリアルタイム決定境界更新

### PlayPage (`pages/PlayPage.tsx`) — コントローラ

- UI と ML をつなぐ唯一の場所
- `handleStartTraining()`:
  1. `nodes.map(n => n.data)` → `LayerNodeData[]`
  2. `buildModel(layers, stage, optimizer, lr)` → `tf.LayersModel`
  3. `getDatasetGenerator(stage.datasetId)()` → `Dataset`
  4. `trainModel(model, dataset, { epochs, batchSize })` → `TrainResult`
  5. `result.finalAccuracy >= stage.targetAccuracy` ?
     - YES → `gameStore.clearStage()` + `addPoints()`
     - NO → status = "failed"

## ステージが固定するもの

プレイヤーは隠れ層のみ編集可能。以下はステージ定義で固定される:

- 最終層の activation (`StageDef.outputActivation`)
- Loss 関数 (`StageDef.lossFunction`)
- 出力ユニット数 (`StageDef.outputUnits`)
- 入力形状 (`StageDef.inputShape`)

## 学習条件（プレイヤーが設定）

- 学習手法 (スキルで解放): `selectedOptimizer`
- 学習率 (自由値): `learningRate`
- バッチサイズ (自由値): `batchSize`
- エポック数 (固定値だが変更可): `epochs`

## クリア条件

各ステージで validation accuracy が `StageDef.targetAccuracy` 以上になればクリア。

## ステージ候補例

| ID | データセット | taskType | 特徴 |
|---|---|---|---|
| `stage_linear` | linear | binary | 線形分離。最も簡単 |
| `stage_xor` | xor | binary | 隠れ層が必要 |
| `stage_circle` | circle | binary | 円形分布 |
| `stage_spiral` | spiral | binary | 深いネットワークが必要 |
| (将来) | mnist | multiclass | 画像分類。Conv2D + Flatten が必要 |
