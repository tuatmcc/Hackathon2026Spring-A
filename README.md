# ニューラルネットワーク 育成？ローグライク？スキルツリー？ゲーム

## 1. 技術スタック
* **Frontend**: React (Vite)
* **UI / Diagram**: React Flow (ネットワーク構造の可視化・構築)
* **ML Engine**: TensorFlow.js
* **State Management**: Zustand (ゲーム進捗・スキルツリー・永続化)
* **Storage**: LocalStorage (via Zustand persist middleware)

---

## 2. システムアーキテクチャ

ゲームは大きく分けて「メタ進捗（スキル・ステージ）」と「実行コンテキスト（学習・推論）」の2層に分かれます。

### A. 状態管理 (Zustand)
`useGameStore` で以下のデータを一括管理します。
* **Player Data**: 現在のポイント、所持スキルIDリスト、クリア済みステージID。
* **Master Data**: スキル定義、ステージ定義（後から注入可能）。
* **Active Session**: 現在選択中のステージ、現在のモデル構成。

### B. 画面構成
1.  **Skill Tree View**:
    * React Flow等を利用し、スキルの依存関係を可視化。
    * ポイントを消費して `DenseLayer` や `Dropout` をアンロック。
2.  **Lab (Main) View**:
    * **Editor**: React Flowで層をドラッグ＆ドロップして接続。
    * **Monitor**: 学習カーブ（Loss/Accuracy）とデータプロット（予測境界）のリアルタイム表示。

---

## 3. データ構造の定義 (拡張性の確保)

### スキル定義 (Skills)
各レイヤーや関数をユニットとして定義します。
```typescript
{
  id: "conv2d",
  name: "畳み込み層",
  description: "空間的な特徴を抽出します。",
  cost: 500,
  dependsOn: ["dense"], // 前提スキル
  tfConfig: { /* TF.jsのレイヤー生成用パラメータ */ }
}
```

### ステージ定義 (Stages)
タスクの難易度と報酬を設定します。
```typescript
{
  id: "xor-problem",
  title: "XORの壁",
  type: "classification",
  dataset: "xor", // 生成関数を指定
  difficulty: 2,
  reward: 200,
  threshold: 0.01, // クリア条件 (Lossがこれ以下)
  constraints: { maxLayers: 3 } // 制限事項
}
```

---

## 4. 開発ロードマップ

### Phase 1: コアエンジンの構築
* [ ] Zustandによる基本ストアの作成とLocalStorage連携。
* [ ] TensorFlow.jsを用いた「データ生成 → モデル構築 → 学習ループ」の最小実装。
* [ ] 線形分離タスクでのテスト。

### Phase 2: React Flowによるエディタ
* [ ] ノード（層）を追加・接続するUIの実装。
* [ ] React Flowのグラフ構造をTensorFlow.jsの `tf.sequential` または `tf.model` に変換するロジックの実装。

### Phase 3: ゲーム性の実装
* [ ] スキルツリー画面の作成。
* [ ] ステージクリア判定と報酬付与サイクル。
* [ ] スイスロールやMNISTなどのデータセットジェネレータの追加。

### Phase 4: ブラッシュアップ
* [ ] 学習中の予測境界（Decision Boundary）の Canvas 描画。
* [ ] スキル・ステージデータの外部JSON化。

---

## 5. 保存データについて
LocalStorageには以下の「進捗」のみを保存します。重みなどのバイナリデータは保存せず、ステージ開始ごとに「一からの学習」を強いることで、ローグライクなゲーム体験（構成の妙を楽しむ）を強調します。

```json
{
  "version": "1.0",
  "points": 1250,
  "unlockedSkillIds": ["dense", "relu", "adam"],
  "completedStageIds": ["linear-01", "xor-01"]
}
```

---

## 6. 実装のヒント

### React Flow から TF.js への変換
React Flowの `edges` を辿り、トポロジカルソートを行うことで、層の重なりを決定します。



