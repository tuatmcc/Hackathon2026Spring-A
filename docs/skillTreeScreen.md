# スキルツリー画面 実装ガイド

## 画面構成

4本のスキルツリーを横に並べて表示する。

```
┌─────────────────────────────────────────────────┐
│ Skill Trees                       Points: 350pt │
├────────────┬───────────┬───────────┬────────────┤
│ Hidden     │Activation │ Optimizer │Regulariz.  │
│ Layers     │           │           │            │
│            │           │           │            │
│ [Dense]    │ [ReLU]    │ [SGD]     │ [Dropout]  │
│   ↓        │   ↓    ↘  │   ↓       │            │
│ [Conv2D]   │[Sigmoid] │ [Adam]    │ [L2]       │
│   ↓        │ [GELU]   │           │            │
│ [Flatten]  │           │           │ [L1]       │
├────────────┴───────────┴───────────┴────────────┤
│     [ Battle ]     [ Skill Tree ]               │
└─────────────────────────────────────────────────┘
```

## コンポーネント構成

### SkillTreePage (`pages/SkillTreePage.tsx`)

- 4本の `SkillTree` コンポーネントを横に並べる
- `SKILL_DATA` を `treeId` でフィルタして各ツリーに渡す
- **現状:** モック実装済み

### SkillTree (`components/SkillTree.tsx`)

- 1本のツリーを表示するコンポーネント
- Props: `title`, `skills: SkillDef[]`, `points`, `unlockedSkills`, `onUnlock`
- **現状:** 縦リスト表示のモック
- **TODO:**
  - [ ] ツリー状レイアウト（依存関係を矢印 or 線で表示）
  - [ ] 解放可能なスキルのハイライト
  - [ ] 解放済みスキルの色分け
  - [ ] アンロック演出（アニメーション）

## スキルツリーの種類

### 隠れ層ツリー (`treeId: "layer"`)

| スキルID | 名前 | コスト | 前提 |
|---|---|---|---|
| `dense` | 全結合層 (Dense) | 0 (初期解放) | なし |
| `conv2d` | 畳み込み層 (Conv2D) | 300 | dense |
| `flatten` | Flatten | 100 | conv2d |

### 活性化関数ツリー (`treeId: "activation"`)

| スキルID | 名前 | コスト | 前提 |
|---|---|---|---|
| `sigmoid` | Sigmoid | 0 (初期解放) | なし |
| `relu` | ReLU | 50 | sigmoid |
| `gelu` | GELU | 120 | relu |

### 学習手法ツリー (`treeId: "optimizer"`)

| スキルID | 名前 | コスト | 前提 |
|---|---|---|---|
| `sgd` | SGD | 0 (初期解放) | なし |
| `adam` | Adam | 200 | sgd |

### 正則化ツリー (`treeId: "regularization"`)

| スキルID | 名前 | コスト | 前提 |
|---|---|---|---|
| `dropout` | Dropout | 150 | なし |
| `l2` | L2正則化 | 100 | なし |
| `l1` | L1正則化 | 100 | なし |

## スキルの仕組み

- `SkillDef.id` がそのまま ML 構成要素の識別子
- 解放済みかどうかは `gameStore.unlockedSkills.includes(id)` で判定
- UI コンポーネント（NodePalette, LayerConfigPanel, TrainingPanel）が各自でフィルタ
- `SkillDef` に build 関数や effect 型は持たない。ID の存在自体が効果

## スキル追加の手順

1. `config/skills.ts` の `SKILL_DATA` に `SkillDef` を追加
2. 対応する ML 実装がある場合:
   - layer → `ml/buildModel.ts` の switch に分岐追加
   - activation → TF.js が文字列で受け取るので追加不要なことが多い
   - optimizer → `ml/buildModel.ts` の optimizer 生成に分岐追加
   - regularization → `ml/buildModel.ts` に処理追加
3. 追加以外に変更は不要（UIは自動的に表示する）
