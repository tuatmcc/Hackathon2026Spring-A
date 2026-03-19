# ML モジュール仕様書

## 概要

`src/ml/` ディレクトリは、TensorFlow.js を使用した機械学習エンジンを提供する。React に依存しない純粋な TypeScript 関数群で構成される。

## ファイル構成

```
src/ml/
├── buildModel.ts    # モデル構築
├── datasets.ts      # データセット生成・読み込み
├── trainer.ts       # 学習実行
└── *.test.ts        # テストファイル
```

---

## buildModel.ts

### 機能

`LayerNodeData[]` と `StageDef` から、コンパイル済みの `tf.LayersModel` を構築する。

### 入力

| パラメータ | 型 | 説明 |
|-----------|---|------|
| `layers` | `LayerNodeData[]` | プレイヤーが配置した隠れ層の設定（トポロジカルソート済み） |
| `stage` | `StageDef` | ステージ定義（最終層、loss関数などを固定） |
| `optimizer` | `string` | オプティマイザ名（`"sgd"` | `"adam"`） |
| `learningRate` | `number` | 学習率 |

### 出力

`tf.LayersModel` - コンパイル済みのモデル

### 対応レイヤー

| layerType | 説明 | 必要なパラメータ |
|-----------|------|-----------------|
| `"dense"` | 全結合層 | `units`, `activation` |
| `"conv2d"` | 畳み込み層 | `filters`, `kernelSize`, `activation` |
| `"flatten"` | 平坦化層 | なし |

### 対応正則化

| regularization | 説明 | パラメータ |
|---------------|------|-----------|
| `"dropout"` | ドロップアウト | `regularizationRate` (rate) |
| `"l1"` | L1正則化 | `regularizationRate` |
| `"l2"` | L2正則化 | `regularizationRate` |

### 使用例

```typescript
import { buildModel } from "./ml/buildModel";
import type { LayerNodeData, StageDef } from "./types";

const layers: LayerNodeData[] = [
  { layerType: "dense", units: 8, activation: "relu", regularization: null, regularizationRate: 0 },
  { layerType: "dense", units: 4, activation: "relu", regularization: null, regularizationRate: 0 },
];

const stage: StageDef = {
  id: "stage_xor",
  name: "XOR",
  description: "XOR分類",
  datasetId: "xor",
  inputShape: [2],
  taskType: "binary",
  outputUnits: 1,
  outputActivation: "sigmoid",
  lossFunction: "binaryCrossentropy",
  targetAccuracy: 0.8,
  rewardPoints: 100,
};

const model = buildModel(layers, stage, "adam", 0.01);
```

---

## datasets.ts

### 機能

データセットの生成・読み込みを行う。

### 対応データセット

| datasetId | タスク種別 | 入力形状 | 説明 |
|-----------|-----------|----------|------|
| `"linear"` | binary | `[2]` | 線形分離可能 |
| `"xor"` | binary | `[2]` | XOR問題 |
| `"circle"` | binary | `[2]` | 円形分布 |
| `"spiral"` | binary | `[2]` | スパイラル分布 |
| `"sin"` | regression | `[1]` | y = sin(πx) 関数近似 |
| `"digits"` | multiclass | `[8, 8, 1]` | 手書き数字（8×8） |

### 同期データセット（関数生成）

```typescript
import { getDatasetGenerator } from "./ml/datasets";

const generator = getDatasetGenerator("xor");
const dataset = generator(200);  // 200サンプル生成

console.log(dataset.xs.shape);  // [200, 2]
console.log(dataset.ys.shape);  // [200, 1]
```

### 非同期データセット（fetch必要）

```typescript
import { loadDigitsData, isAsyncDataset, getAsyncDatasetLoader } from "./ml/datasets";

// 判定
if (isAsyncDataset("digits")) {
  const loader = getAsyncDatasetLoader("digits");
  const dataset = await loader();
  
  console.log(dataset.xs.shape);  // [1797, 8, 8, 1]
  console.log(dataset.ys.shape);  // [1797, 10]
}
```

### Dataset 型

```typescript
export interface Dataset {
  xs: tf.Tensor;  // 入力データ
  ys: tf.Tensor;  // 正解ラベル
}
```

### データ形式詳細

#### 2D分類データ（linear, xor, circle, spiral）

- `xs`: `[numSamples, 2]` - 2次元座標
- `ys`: `[numSamples, 1]` - 0/1のラベル

#### 関数近似データ（sin）

- `xs`: `[numSamples, 1]` - 入力値 x ∈ [-1, 1]
- `ys`: `[numSamples, 1]` - 出力値 y = sin(πx)

#### 画像データ（digits）

- `xs`: `[1797, 8, 8, 1]` - 8×8グレースケール画像（正規化済み 0-1）
- `ys`: `[1797, 10]` - one-hot エンコードされたラベル（0-9）

---

## trainer.ts

### 機能

モデルの学習を実行し、結果を返す。

### 入力

| パラメータ | 型 | 説明 |
|-----------|---|------|
| `model` | `tf.LayersModel` | 学習対象のモデル |
| `dataset` | `Dataset` | 学習データ |
| `options` | `TrainOptions` | 学習設定 |

### TrainOptions

```typescript
export interface TrainOptions {
  epochs: number;
  batchSize: number;
  validationSplit?: number;  // デフォルト: 0.2
  signal?: AbortSignal;      // 学習中断用
  onEpochEnd?: (metrics: TrainingMetrics) => void;
}
```

### TrainResult

```typescript
export interface TrainResult {
  finalLoss: number;
  finalAccuracy?: number;  // 回帰タスクでは undefined
}
```

### 使用例

#### 基本的な学習

```typescript
import { trainModel } from "./ml/trainer";

const result = await trainModel(model, dataset, {
  epochs: 100,
  batchSize: 32,
});

console.log(`Final loss: ${result.finalLoss}`);
console.log(`Final accuracy: ${result.finalAccuracy}`);
```

#### エポックごとのコールバック

```typescript
await trainModel(model, dataset, {
  epochs: 100,
  batchSize: 32,
  onEpochEnd: (metrics) => {
    console.log(`Epoch ${metrics.epoch}: loss=${metrics.loss}, acc=${metrics.accuracy}`);
  },
});
```

#### 学習中断

```typescript
const controller = new AbortController();

// 中断ボタン押下時
stopButton.onclick = () => controller.abort();

try {
  await trainModel(model, dataset, {
    epochs: 100,
    batchSize: 32,
    signal: controller.signal,
  });
} catch (e) {
  if (e.message === "Training aborted") {
    console.log("学習が中断されました");
  }
}
```

---

## タスク種別とクリア条件

### 分類タスク（binary, multiclass）

- **loss**: `binaryCrossentropy` | `categoricalCrossentropy`
- **最終層活性化**: `sigmoid` | `softmax`
- **クリア条件**: `accuracy >= targetAccuracy`

### 回帰タスク（regression）

- **loss**: `meanSquaredError`
- **最終層活性化**: `linear`
- **クリア条件**: `loss <= targetLoss`

### StageDef 設定例

#### 2クラス分類

```typescript
const binaryStage: StageDef = {
  id: "stage_xor",
  datasetId: "xor",
  inputShape: [2],
  taskType: "binary",
  outputUnits: 1,
  outputActivation: "sigmoid",
  lossFunction: "binaryCrossentropy",
  targetAccuracy: 0.85,
  rewardPoints: 100,
};
```

#### 多クラス分類

```typescript
const multiclassStage: StageDef = {
  id: "stage_digits",
  datasetId: "digits",
  inputShape: [8, 8, 1],
  taskType: "multiclass",
  outputUnits: 10,
  outputActivation: "softmax",
  lossFunction: "categoricalCrossentropy",
  targetAccuracy: 0.85,
  rewardPoints: 200,
};
```

#### 回帰

```typescript
const regressionStage: StageDef = {
  id: "stage_sin",
  datasetId: "sin",
  inputShape: [1],
  taskType: "regression",
  outputUnits: 1,
  outputActivation: "linear",
  lossFunction: "meanSquaredError",
  targetAccuracy: 0,  // 使用しない
  targetLoss: 0.05,   // MSE < 0.05 でクリア
  rewardPoints: 150,
};
```

---

## PlayPage での使用フロー

```typescript
// 1. レイヤー設定を取得
const layers = nodes.map(n => n.data) as LayerNodeData[];

// 2. データセットを取得
let dataset: Dataset;
if (isAsyncDataset(stage.datasetId)) {
  const loader = getAsyncDatasetLoader(stage.datasetId);
  dataset = await loader();
} else {
  const generator = getDatasetGenerator(stage.datasetId);
  dataset = generator();
}

// 3. モデルを構築
const model = buildModel(layers, stage, optimizer, learningRate);

// 4. 学習を実行
const result = await trainModel(model, dataset, {
  epochs,
  batchSize,
  onEpochEnd: (m) => setMetrics(m),
});

// 5. クリア判定
const isClear = stage.taskType === "regression"
  ? result.finalLoss <= (stage.targetLoss ?? Infinity)
  : result.finalAccuracy >= stage.targetAccuracy;

if (isClear) {
  gameStore.clearStage(stage.id);
  gameStore.addPoints(stage.rewardPoints);
}

// 6. 後始末
model.dispose();
dataset.xs.dispose();
dataset.ys.dispose();
```

---

## テスト

```bash
# 全テスト実行
npm test

# 特定ファイルのみ
npm test -- src/ml/datasets.test.ts
```

### テストファイル

| ファイル | 内容 |
|----------|------|
| `buildModel.test.ts` | モデル構築のユニットテスト |
| `datasets.test.ts` | データセット生成のテスト |
| `digits.test.ts` | digits データ読み込みテスト |
| `trainer.test.ts` | 学習・中断機能のテスト |
| `integration.test.ts` | XOR/Circle/Spiral/Sin の統合テスト |
| `digits-integration.test.ts` | digits 学習の統合テスト |

---

## データファイル

### public/data/digits.json

sklearn digits データセット（8×8手書き数字）

```json
{
  "numSamples": 1797,
  "imageShape": [8, 8],
  "numClasses": 10,
  "images": [[...64 values...], ...],
  "labels": [0, 1, 2, ...]
}
```

画素値は 0.0-1.0 に正規化済み。

---

## 注意事項

1. **メモリ管理**: `tf.Tensor` と `tf.LayersModel` は使い終わったら `dispose()` すること
2. **非同期データ**: `digits` などの非同期データセットは `await` が必要
3. **回帰のaccuracy**: 回帰タスクでは accuracy は計算されない（`undefined`）
4. **AbortSignal**: 学習中断時、モデルは再利用可能