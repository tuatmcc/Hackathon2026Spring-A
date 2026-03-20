# Overview

## 目的

ニューラルネットワークの層、活性化関数、学習手法などをスキルツリーで解放し、
解放したスキルだけを使って Toy problem を解くゲームを作る。

## 技術スタック

- TypeScript
- React 19 (Vite 8)
- React Flow v12 (@xyflow/react) — ネットワーク構築UI
- TensorFlow.js — ブラウザ上でのモデル学習
- Zustand — 状態管理 (persist → localStorage)

## コアループ

1. ステージを選ぶ
2. 解放済みスキルだけでモデルを組む（隠れ層、活性化関数、正則化、総パラメータ上限を選択）
3. 学習条件を設定する（optimizer、学習率、バッチサイズ）
4. 学習を実行する
5. validation accuracy が閾値を超えたらクリア
6. スキルポイントを獲得して新スキルを解放する

## 画面構成

画面下部にナビゲーションバー（2タブ）を配置して画面を移動する。

- **ゲーム画面 (Battle)** — モデルを組んで学習を実行する
- **スキルツリー画面 (Skill Tree)** — 4本のスキルツリーを操作してスキルを解放する
- **ステージ選択** — ヘッダーのMenuボタンからオーバーレイで表示

## 保存データ

LocalStorage には「進捗」のみ保存する。モデルの重みは保存しない。
ステージ開始ごとに「一からの学習」を強いることで、構成の妙を楽しむ。

```json
{
  "points": 1250,
  "unlockedSkills": ["dense", "sigmoid", "sgd", "adam"],
  "clearedStages": ["stage_linear", "stage_xor"],
  "currentStageIndex": 2
}
```
