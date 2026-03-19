import type { TrainResult } from "../ml/trainer";
import type { StageDef } from "../types";
import { SteamParticles } from "./SteamParticles";

interface TitleScreenProps {
  hasProgress: boolean;
  points: number;
  clearedCount: number;
  totalStages: number;
  onStart: () => void;
  onOpenTutorial: () => void;
}

interface TutorialScreenProps {
  totalStages: number;
  onClose: () => void;
}

interface StageIntroPopupProps {
  stage: StageDef;
  stageNumber: number;
  totalStages: number;
  onClose: () => void;
}

interface StageClearPopupProps {
  stage: StageDef;
  hasNextStage: boolean;
  totalStages: number;
  result: TrainResult | null;
  onClose: () => void;
  onOpenSkillTree: () => void;
}

export function TitleScreen({
  hasProgress,
  points,
  clearedCount,
  totalStages,
  onStart,
  onOpenTutorial,
}: TitleScreenProps) {
  return (
    <div className="screen-overlay screen-overlay--title">
      <div className="screen-panel screen-panel--title">
        <div className="screen-kicker">Neural Network Strategy Game</div>
        <h2 className="screen-title">NN Roguelike</h2>
        <p className="screen-lead">
          スキルを解放し、ネットワークを組み、学習を回してステージを突破する。
          TensorFlow Playground 風の構築体験を、進行付きゲームとして遊べます。
        </p>

        <div className="screen-stat-row">
          <div className="screen-stat-card">
            <span className="screen-stat-label">Progress</span>
            <strong>
              {clearedCount}/{totalStages} cleared
            </strong>
          </div>
          <div className="screen-stat-card">
            <span className="screen-stat-label">Points</span>
            <strong>{points} pt</strong>
          </div>
          <div className="screen-stat-card">
            <span className="screen-stat-label">Save</span>
            <strong>{hasProgress ? "Continue ready" : "Fresh run"}</strong>
          </div>
        </div>

        <div className="screen-feature-grid">
          <div className="screen-feature-card">
            <strong>Build</strong>
            <p>左側で層を組み、ノード設定で構成を詰めます。</p>
          </div>
          <div className="screen-feature-card">
            <strong>Train</strong>
            <p>右側で optimizer や学習率を調整して学習を回します。</p>
          </div>
          <div className="screen-feature-card">
            <strong>Unlock</strong>
            <p>報酬ポイントでスキルツリーを伸ばし、戦略を増やします。</p>
          </div>
        </div>

        <div className="screen-actions">
          <button className="screen-button" onClick={onStart}>
            {hasProgress ? "Continue" : "Begin Training"}
          </button>
          <button
            className="screen-button screen-button--secondary"
            onClick={onOpenTutorial}
          >
            Tutorial
          </button>
        </div>
      </div>
    </div>
  );
}

export function TutorialScreen({
  totalStages,
  onClose,
}: TutorialScreenProps) {
  return (
    <div className="screen-overlay">
      <div className="screen-panel screen-panel--modal">
        <div className="screen-kicker">Tutorial</div>
        <h2 className="screen-subtitle">3 steps to clear a stage</h2>

        <div className="screen-tutorial-list">
          <section className="screen-tutorial-step">
            <span className="screen-step-number">01</span>
            <div>
              <strong>ステージを確認する</strong>
              <p>
                画面右上の Menu から挑戦先を選べます。各ステージには目標精度
                か目標 loss と、報酬ポイントが設定されています。
              </p>
            </div>
          </section>

          <section className="screen-tutorial-step">
            <span className="screen-step-number">02</span>
            <div>
              <strong>ネットワークを組む</strong>
              <p>
                左ペインでノードを追加し、必要なら接続します。選択中ノードの
                units、activation、regularization を調整してください。
              </p>
            </div>
          </section>

          <section className="screen-tutorial-step">
            <span className="screen-step-number">03</span>
            <div>
              <strong>学習して、スキルを解放する</strong>
              <p>
                Optimizer や学習率を整えて学習を開始します。突破後は Skill Tree
                で新しい層や手法を開放し、全 {totalStages} ステージの制覇を目指します。
              </p>
            </div>
          </section>
        </div>

        <div className="screen-actions">
          <button className="screen-button" onClick={onClose}>
            Enter Game
          </button>
        </div>
      </div>
    </div>
  );
}

export function StageIntroPopup({
  stage,
  stageNumber,
  totalStages,
  onClose,
}: StageIntroPopupProps) {
  return (
    <div className="screen-overlay">
      <div className="screen-panel screen-panel--popup">
        <div className="screen-kicker">
          Stage {stageNumber} / {totalStages}
        </div>
        <h2 className="screen-subtitle">{stage.name}</h2>
        <p className="screen-body">{stage.briefing ?? stage.description}</p>

        <div className="stage-popup__meta">
          <div>
            <span className="stage-popup__label">Objective</span>
            <strong>{formatStageTarget(stage)}</strong>
          </div>
          <div>
            <span className="stage-popup__label">Reward</span>
            <strong>{stage.rewardPoints} pt</strong>
          </div>
        </div>

        <div className="stage-popup__hint">
          <span className="stage-popup__label">Hint</span>
          <p>{stage.hint ?? stage.description}</p>
        </div>

        <div className="screen-actions">
          <button className="screen-button" onClick={onClose}>
            Build Model
          </button>
        </div>
      </div>
    </div>
  );
}

export function StageClearPopup({
  stage,
  hasNextStage,
  totalStages,
  result,
  onClose,
  onOpenSkillTree,
}: StageClearPopupProps) {
  return (
    <div className="screen-overlay" style={{ position: "fixed" }}>
      <SteamParticles active kind="celebration" count={60} duration={4000} />
      <div className="screen-panel screen-panel--popup">
        <div className="screen-kicker" style={{ animation: "fade-in 0.3s ease" }}>Stage Clear</div>
        <h2 className="screen-subtitle" style={{ animation: "stamp-in 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}>{stage.name} cleared</h2>
        <p className="screen-body">{stage.clearMessage ?? stage.description}</p>

        <div className="stage-popup__meta">
          <div style={{ animation: "slide-in-left 0.4s ease 0.2s backwards" }}>
            <span className="stage-popup__label">Result</span>
            <strong>{formatStageResult(stage, result)}</strong>
          </div>
          <div style={{ animation: "slide-in-right 0.4s ease 0.3s backwards" }}>
            <span className="stage-popup__label">Reward</span>
            <strong style={{ animation: "count-up-glow 1s ease 0.5s backwards" }}>+{stage.rewardPoints} pt</strong>
          </div>
        </div>

        <div className="stage-popup__hint">
          <span className="stage-popup__label">Next</span>
          <p>
            {hasNextStage
              ? "次のステージが開きました。ポイントを使ってから進むか、そのまま次の実験に入れます。"
              : `全 ${totalStages} ステージの攻略完了です。未解放のスキルがあれば、最後の調整に使えます。`}
          </p>
        </div>

        <div className="screen-actions">
          <button className="screen-button" onClick={onClose}>
            {hasNextStage ? "Next Stage" : "Keep Playing"}
          </button>
          <button
            className="screen-button screen-button--secondary"
            onClick={onOpenSkillTree}
          >
            Open Skill Tree
          </button>
        </div>
      </div>
    </div>
  );
}

function formatStageTarget(stage: StageDef) {
  if (stage.taskType === "regression") {
    return `Loss ${stage.targetLoss?.toFixed(2) ?? "--"} 以下`;
  }

  return `Accuracy ${(stage.targetAccuracy * 100).toFixed(0)}% 以上`;
}

function formatStageResult(stage: StageDef, result: TrainResult | null) {
  if (!result) {
    return "Training completed";
  }

  if (stage.taskType === "regression") {
    return `Final loss ${result.finalLoss.toFixed(4)}`;
  }

  return `Validation ${((result.finalAccuracy ?? 0) * 100).toFixed(1)}%`;
}
