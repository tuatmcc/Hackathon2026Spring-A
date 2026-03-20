# NN Roguelike — ニューラルネットワーク育成ゲーム

スキルツリーで ML の構成要素（層、活性化関数、オプティマイザ、正則化）を解放し、
解放したスキルだけを使って Toy Problem を解くブラウザゲーム。

## セットアップ

```bash
npm install
npm run dev
```

## GitHub Pages

`main` への push で GitHub Pages に自動デプロイされるよう、`.github/workflows/deploy-pages.yml` を追加しています。

リポジトリの GitHub 側設定では、`Settings -> Pages -> Build and deployment -> Source` を `GitHub Actions` にしてください。

公開 URL は `https://tuatmcc.github.io/Hackathon2026Spring-A/` です。リポジトリ名を変更した場合は、`vite.config.ts` のフォールバック値も合わせて更新してください。

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| 言語 | TypeScript |
| UI | React 19 (Vite 8) |
| ネットワークエディタ | @xyflow/react (React Flow v12) |
| ML エンジン | TensorFlow.js |
| 状態管理 | Zustand (persist → localStorage) |

## アーキテクチャ

```
config/  ← 静的マスターデータ（スキル、ステージ）
stores/  ← Zustand（セーブデータ / プレイ中のグラフ）
ml/      ← 純粋関数（React を知らない）
components/ ← React UI（ML を知らない）
pages/   ← ページ（配置と接続）
PlayPage ← 唯一のコントローラ（UI と ML をつなぐ）
```

詳細は `docs/main.md` を参照。

## 保存データ

localStorage に進捗のみ保存。モデルの重みは保存しない。

```json
{
  "points": 1250,
  "unlockedSkills": ["dense", "sigmoid", "sgd", "adam"],
  "clearedStages": ["stage_linear", "stage_xor"],
  "currentStageIndex": 2
}
```

## 開発の進め方

担当領域ごとに独立して開発可能。詳細は `docs/main.md` の「担当者別の作業領域」を参照。

| 担当 | 主なファイル | 依存する型 |
|---|---|---|
| エディタ | `components/NetworkEditor.tsx`, `NodePalette.tsx`, `LayerConfigPanel.tsx` | `LayerNodeData` |
| ML エンジン | `ml/buildModel.ts`, `datasets.ts`, `trainer.ts` | `LayerNodeData`, `StageDef` |
| 可視化 | `components/DataVisualization.tsx`, `TrainingPanel.tsx` (グラフ) | `StageDef`, `TrainingMetrics` |
| スキルツリー | `components/SkillTree.tsx`, `pages/SkillTreePage.tsx` | `SkillDef` |
| コンテンツ | `config/skills.ts`, `config/stages.ts` | `SkillDef`, `StageDef` |


## Data Attribution

This project includes a processed version of the "Optical Recognition of Handwritten Digits" dataset by E.
Alpaydin and C. Kaynak, provided via the UCI Machine Learning Repository.

Source:
- UCI Machine Learning Repository:
https://archive.ics.uci.edu/dataset/80/optical+recognition+of+handwritten+digits
- DOI: https://doi.org/10.24432/C50P49

License:
- CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
