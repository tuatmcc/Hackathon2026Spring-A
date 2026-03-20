# アーキテクチャ & 実装ガイド

## 1. 設計思想

**「各モジュールは自分の隣だけ知っていればいい」**

```
config/  (静的マスターデータ)  ← 誰でも import できる
stores/  (Zustand)            ← セーブデータ / プレイ中のグラフ
ml/      (TF.js)              ← React を知らない。純粋関数
components/ (React)           ← ML を知らない。表示と操作だけ
pages/   (React)              ← 薄いページ。配置と接続だけ
PlayPage                      ← 唯一の「コントローラ」。UI と ML をつなぐ
```

---

## 2. ファイル構成

```
src/
├── types.ts                     # 全モジュールの共通型
├── config/
│   ├── skills.ts                # スキルマスターデータ (4ツリー × 複数スキル)
│   └── stages.ts                # ステージマスターデータ
├── stores/
│   ├── gameStore.ts             # 永続: points, unlockedSkills, clearedStages
│   └── playStore.ts             # 一時: nodes, edges, 学習条件, 学習状態
├── ml/                          # React を import しない
│   ├── buildModel.ts            # LayerNodeData[] + StageDef → tf.LayersModel
│   ├── datasets.ts              # datasetId → { xs, ys } 生成
│   └── trainer.ts               # model + dataset → TrainResult
├── components/
│   ├── NetworkEditor.tsx        # React Flow キャンバス
│   ├── NodePalette.tsx          # D&D 用パレット (unlockedSkills で制限)
│   ├── LayerConfigPanel.tsx     # 選択中ノードの設定 (units, activation, reg)
│   ├── TrainingPanel.tsx        # optimizer, lr, batchSize, epochs, 学習開始
│   ├── DataVisualization.tsx    # 散布図 + 決定境界
│   ├── SkillTree.tsx            # 1本のスキルツリーUI
│   └── StageCard.tsx            # ステージ選択の1枚カード
├── pages/
│   ├── PlayPage.tsx             # コントローラ: UI → ML → store 更新
│   ├── SkillTreePage.tsx        # 4本の SkillTree を並べる
│   └── StageSelectPage.tsx      # メニューオーバーレイ
├── App.tsx                      # ルート (ヘッダー + 2タブ + メニュー)
├── App.css
├── index.css
└── main.tsx
```

---

## 3. データフロー

```
config/skills.ts ─────────────────────┐
config/stages.ts ──────────────────┐  │
                                   │  │
                                   ▼  ▼
          ┌─── SkillTreePage ← gameStore.unlockedSkills, points
          │       └── SkillTree (×4) → onUnlock → gameStore.unlockSkill()
          │
App ──────┤
          │
          └─── PlayPage (コントローラ)
                 │
                 ├── NodePalette
                 │     └── unlockedSkills を見て、使える層だけ表示
                 │         クリックで Node<LayerNodeData> を追加
                 │
                 ├── NetworkEditor
                 │     └── nodes / edges を表示・編集
                 │
                 ├── LayerConfigPanel
                 │     └── 選択中ノードの units / activation / reg を編集
                 │         activation/reg の選択肢は unlockedSkills でフィルタ
                 │
                 ├── TrainingPanel
                 │     └── optimizer / lr / batchSize / epochs を編集
                 │         optimizer の選択肢は unlockedSkills でフィルタ
                 │         総パラメータ数 / 上限も表示
                 │         「Start Training」ボタン → onStartTraining
                 │
                 ├── DataVisualization
                 │     └── stage の情報で可視化方法を決定
                 │
                 └── handleStartTraining():
                       nodes.map(n => n.data) → LayerNodeData[]
                         ↓
                       buildModel(layers, stage, optimizer, lr)
                         ↓
                       trainModel(model, dataset, { epochs, batchSize })
                         ↓
                       result.finalAccuracy >= stage.targetAccuracy ?
                         YES → gameStore.clearStage() + addPoints()
                         NO  → status = "failed"
```

---

## 4. 型定義の概要 (`types.ts`)

### マスターデータ

| 型 | 用途 |
|---|---|
| `SkillTreeId` | `"layer" \| "activation" \| "optimizer" \| "regularization"` |
| `SkillDef` | スキル定義: `id`, `treeId`, `name`, `description`, `cost`, `dependencies` |
| `StageDef` | ステージ定義: データセット、入力形状、タスク種別、最終層、loss関数、クリア条件 |

### プレイ中のデータ

| 型 | 用途 |
|---|---|
| `LayerNodeData` | React Flow Node の `data` に入れるもの: `layerType`, `units`, `activation`, `regularization`, `regularizationRate` |
| `TrainingMetrics` | epoch ごとの `loss`, `valLoss`, `accuracy`, `valAccuracy` |
| `TrainingStatus` | `"idle" \| "training" \| "completed" \| "failed"` |

### 設計上のポイント

- **`SkillDef` に `effect` や `build` メソッドはない。** スキルID の存在自体が効果。パレットUIが `unlockedSkills.includes(skillId)` で判定するだけ。
- **`LayerNodeData` は ML の知識を持たない。** 文字列と数値だけ。`buildModel()` がこれを TF.js に変換する。
- **`StageDef` がステージ固有の最終層と loss 関数を宣言する。** プレイヤーは隠れ層のみ編集可能。

---

## 5. ストア設計

### gameStore (永続化 → localStorage `"nn-game-save"`)

| フィールド | 型 | 説明 |
|---|---|---|
| `points` | `number` | 所持ポイント |
| `unlockedSkills` | `string[]` | 解放済みスキルID。cost=0 のスキルは初期解放 |
| `clearedStages` | `string[]` | クリア済みステージID |
| `currentStageIndex` | `number` | 現在挑戦中ステージの添字 |

### playStore (一時、非永続)

| フィールド | 型 | 説明 |
|---|---|---|
| `nodes` | `Node<LayerNodeData>[]` | React Flow ノード（プレイヤーが配置した隠れ層） |
| `edges` | `Edge[]` | React Flow エッジ |
| `selectedOptimizer` | `string` | `"sgd"` / `"adam"` |
| `learningRate` | `number` | 学習率 |
| `batchSize` | `number` | バッチサイズ |
| `epochs` | `number` | エポック数 |
| `trainingStatus` | `TrainingStatus` | 学習状態 |
| `metrics` | `TrainingMetrics[]` | 学習ログ |

---

## 6. 担当者別の作業領域

### A. ネットワークエディタ担当

**ファイル:** `components/NetworkEditor.tsx`, `components/NodePalette.tsx`, `components/LayerConfigPanel.tsx`

**やること:**
- [ ] NodePalette: D&D 実装（現在はクリックでノード追加）
- [ ] カスタムノードの見た目（layerType, units, activation を表示）
- [ ] エッジ接続のバリデーション（入力→出力の方向制約）
- [ ] トポロジカルソートのユーティリティ

**依存:** `types.ts` の `LayerNodeData`, `stores/playStore.ts`

### B. ML エンジン担当

**ファイル:** `ml/buildModel.ts`, `ml/datasets.ts`, `ml/trainer.ts`

**やること:**
- [x] buildModel: layerType ごとの分岐 (conv2d, flatten)
- [x] buildModel: 正則化 (L1/L2 kernelRegularizer)
- [x] datasets: spiral データの実装
- [x] datasets: digits (手書き数字 8×8) データセット
- [x] datasets: sin 関数近似データ（回帰タスク）
- [x] trainer: 学習の中断機能
- [x] テストコード: ユニットテスト・統合テスト

**ドキュメント:** `docs/ml.md` を参照

**依存:** `types.ts` の `LayerNodeData`, `StageDef`, `TrainingMetrics`。React に依存しない。

### C. 可視化担当

**ファイル:** `components/DataVisualization.tsx`, `components/TrainingPanel.tsx` (グラフ部分)

**やること:**
- [ ] 2D 散布図の描画 (Canvas or SVG)
- [ ] 決定境界の描画（学習後のモデルから）
- [ ] 学習曲線グラフ (Recharts / Chart.js)
- [ ] inputShape に応じた可視化分岐

**依存:** `types.ts` の `StageDef`, `TrainingMetrics`

### D. スキルツリー担当

**ファイル:** `components/SkillTree.tsx`, `pages/SkillTreePage.tsx`

**やること:**
- [ ] ツリー状のビジュアル配置（依存関係の矢印表示）
- [ ] スキルカテゴリごとの色分け
- [ ] アニメーション（アンロック演出）

**依存:** `types.ts` の `SkillDef`, `stores/gameStore.ts`

### E. ゲームバランス / コンテンツ担当

**ファイル:** `config/skills.ts`, `config/stages.ts`

**やること:**
- [ ] スキルの追加・コスト調整
- [ ] ステージの追加（新データセット → `datasets.ts` にも登録）
- [ ] 難易度曲線の調整

**依存:** `types.ts` の `SkillDef`, `StageDef`

---

## 7. スキルとモデル構成要素の対応

スキルの「効果」を型で定義する必要はない。スキルIDがそのまま ML 構成要素の識別子と対応する。

| スキルID (= `SkillDef.id`) | 何に対応するか | 誰がチェックするか |
|---|---|---|
| `"dense"`, `"conv2d"`, `"flatten"` | `LayerNodeData.layerType` | NodePalette（表示制限） |
| `"model_params_cap_32"` など | モデル全体の総パラメータ数の上限 | `TrainingPanel` / `playStore.startTraining()` |
| `"relu"`, `"sigmoid"`, `"gelu"` | `LayerNodeData.activation` | LayerConfigPanel（選択肢フィルタ） |
| `"sgd"`, `"adam"` | `playStore.selectedOptimizer` | TrainingPanel（選択肢フィルタ） |
| `"dropout"`, `"l1"`, `"l2"` | `LayerNodeData.regularization` | LayerConfigPanel（選択肢フィルタ） |

フィルタは全て `unlockedSkills.includes(skillId)` だけで行う。

---

## 8. ステージが固定するもの

`gameScreen.md` の仕様に基づき、以下はステージ定義 (`StageDef`) で固定され、プレイヤーは変更できない:

| 項目 | StageDef のフィールド |
|---|---|
| 最終層のユニット数 | `outputUnits` |
| 最終層の活性化関数 | `outputActivation` |
| Loss 関数 | `lossFunction` |
| 入力の形状 | `inputShape` |

`buildModel()` がこれらを使って最終層を追加し、`model.compile()` を行う。
