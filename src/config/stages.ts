import type { StageDef } from "../types";

const DEFAULT_EPOCHS = 50;

/**
 * ステージマスターデータ。
 * 最終層の activation と lossFunction はステージが固定する。
 * プレイヤーが編集するのは「隠れ層」のみ。
 */
export const STAGE_DATA: StageDef[] = [
  {
    id: "stage_linear",
    name: "線形分離",
    description: "直線で2つのデータを分類しよう",
    briefing:
      "最初の演習です。1本の境界線で分けられる素直なデータなので、まずは基礎の操作に慣れましょう。",
    hint:
      "初期解放の Dense と Sigmoid、SGD だけでも十分です。まずは薄いネットワークで試すのが近道です。",
    clearMessage:
      "基本の分類は突破です。ここから先は、単純な直線だけでは切れない相手が待っています。",
    datasetId: "linear",
    inputShape: [2],
    taskType: "binary",
    outputUnits: 1,
    outputActivation: "sigmoid",
    lossFunction: "binaryCrossentropy",
    targetAccuracy: 0.9,
    rewardPoints: 100,
    trainingPreset: {
      learningRate: 0.1,
      batchSize: 32,
      epochs: DEFAULT_EPOCHS,
      recommendedOptimizer: "sgd",
    },
  },
  {
    id: "stage_xor",
    name: "XOR問題",
    description: "非線形なデータを分類しよう。隠れ層が必要になるかも？",
    briefing:
      "ここから一気にゲームらしくなります。1本の線では解けない配置なので、隠れ層の意味を体感するステージです。",
    hint:
      "Dense ノードを追加して中間表現を作ると突破しやすくなります。Sigmoid のままでも挑めますが、ReLU を開放すると突破筋が見えやすくなります。",
    clearMessage:
      "非線形の壁を越えました。ネットワークを重ねる価値が見え始める区間です。",
    datasetId: "xor",
    inputShape: [2],
    taskType: "binary",
    outputUnits: 1,
    outputActivation: "sigmoid",
    lossFunction: "binaryCrossentropy",
    targetAccuracy: 0.9,
    rewardPoints: 150,
    trainingPreset: {
      learningRate: 0.05,
      batchSize: 32,
      epochs: DEFAULT_EPOCHS,
      recommendedOptimizer: "sgd",
    },
  },
  {
    id: "stage_circle",
    name: "円形分離",
    description: "円形に分布するデータを分類しよう",
    briefing:
      "外側と内側を見分けるラウンドです。境界が曲がるぶん、活性化やユニット数の調整が効いてきます。",
    hint:
      "ここからは Adam がかなり有効です。学習率を少し落として、層を 2 枚にすると安定しやすくなります。",
    clearMessage:
      "曲線の境界を描けました。構成だけでなく、学習条件の相性も見えてきたはずです。",
    datasetId: "circle",
    inputShape: [2],
    taskType: "binary",
    outputUnits: 1,
    outputActivation: "sigmoid",
    lossFunction: "binaryCrossentropy",
    targetAccuracy: 0.9,
    rewardPoints: 200,
    trainingPreset: {
      learningRate: 0.01,
      batchSize: 32,
      epochs: DEFAULT_EPOCHS,
      recommendedOptimizer: "adam",
    },
  },
  {
    id: "stage_spiral",
    name: "スパイラル",
    description: "渦巻き状のデータを分類しよう。深いネットワークが必要。",
    briefing:
      "本格的な難所です。渦巻きは表現力も学習の安定性も両方要求してくるので、試行錯誤が前提になります。",
    hint:
      "Adam を使い、層を増やして表現力を確保してください。渦巻きは深さと学習条件の両方が噛み合うと一気に伸びます。",
    clearMessage:
      "難所突破です。ここまで来れば、かなり手応えのあるモデル設計ができています。",
    datasetId: "spiral",
    inputShape: [2],
    taskType: "binary",
    outputUnits: 1,
    outputActivation: "sigmoid",
    lossFunction: "binaryCrossentropy",
    targetAccuracy: 0.9,
    rewardPoints: 300,
    trainingPreset: {
      learningRate: 0.01,
      batchSize: 32,
      epochs: DEFAULT_EPOCHS,
      recommendedOptimizer: "adam",
    },
  },
  {
    id: "stage_sin",
    name: "関数近似",
    description: "sin(πx)を近似しよう。回帰タスクに挑戦！",
    briefing:
      "分類ではなく回帰のステージです。正解ラベルを当てるのではなく、滑らかな曲線そのものを近似します。",
    hint:
      "精度ではなく loss を下げるのが目的です。Adam と小さめの学習率で、滑らかな近似を狙ってください。",
    clearMessage:
      "分類以外の課題にも対応できました。モデルの表現力が、形そのものを追える段階に入っています。",
    datasetId: "sin",
    inputShape: [1],
    taskType: "regression",
    outputUnits: 1,
    outputActivation: "linear",
    lossFunction: "meanSquaredError",
    targetAccuracy: 0,
    targetLoss: 0.03,
    rewardPoints: 150,
    trainingPreset: {
      learningRate: 0.01,
      batchSize: 32,
      epochs: DEFAULT_EPOCHS,
      recommendedOptimizer: "adam",
    },
  },
  {
    id: "stage_digits",
    name: "手書き数字認識",
    description: "8×8の手書き数字を分類しよう。Conv2D と Flatten があると安定しやすい。",
    briefing:
      "最終試験です。画像入力を扱うので、畳み込みと Flatten を組み合わせると精度を伸ばしやすくなります。",
    hint:
      "Conv2D を置いたあとに Flatten を挟み、最後に Dense へつなぐ流れを意識してください。無くても挑戦できますが、この構成のほうが短い学習で届きやすくなります。",
    clearMessage:
      "画像分類の初歩を突破しました。NN Roguelike のメインループは、ここでひと通り制覇です。",
    datasetId: "digits",
    inputShape: [8, 8, 1],
    taskType: "multiclass",
    outputUnits: 10,
    outputActivation: "softmax",
    lossFunction: "categoricalCrossentropy",
    targetAccuracy: 0.9,
    rewardPoints: 250,
    recommendedLayerTypes: ["conv2d", "flatten"],
    trainingPreset: {
      learningRate: 0.001,
      batchSize: 32,
      epochs: DEFAULT_EPOCHS,
      recommendedOptimizer: "adam",
    },
  },
];
