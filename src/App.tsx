import { useState } from "react";
import { useGameStore } from "./stores/gameStore";
import { usePlayStore } from "./stores/playStore";
import { MenuOverlay } from "./pages/StageSelectPage";
import { PlayPage } from "./pages/PlayPage";
import { SkillTreePage } from "./pages/SkillTreePage";
import { STAGE_DATA } from "./config/stages";
import "./App.css";

function App() {
  const [showTitleScreen, setShowTitleScreen] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const {
    currentPage,
    setPage,
    points,
    showMenu,
    setShowMenu,
    currentStageIndex,
    clearedStages,
    resetProgress,
    hasSavedProgress,
  } = useGameStore();
  const resetPlay = usePlayStore((state) => state.resetPlay);

  const stage = STAGE_DATA[currentStageIndex];
  const progressSummary = `${clearedStages.length} stage${clearedStages.length === 1 ? "" : "s"} cleared`;
  const showContinue = hasSavedProgress();

  const handleContinue = () => {
    setShowTitleScreen(false);
  };

  const handleStartOver = () => {
    resetProgress();
    resetPlay();
    setShowResetDialog(false);
    setShowTitleScreen(true);
  };

  const handleReturnToTitle = () => {
    setShowMenu(false);
    setShowResetDialog(false);
    setShowTitleScreen(true);
  };

  if (showTitleScreen) {
    return (
      <div className="title-screen">
        <div className="title-screen__panel">
          <div className="title-screen__eyebrow">Neural Network Roguelike</div>
          <h1 className="title-screen__title">NN Roguelike</h1>
          <p className="title-screen__description">
            解放したスキルだけでモデルを組み、ステージを突破していく ML パズルゲーム。
          </p>

          <div className="title-screen__stats">
            <div className="title-screen__stat">
              <span className="title-screen__stat-label">Points</span>
              <strong>{points}</strong>
            </div>
            <div className="title-screen__stat">
              <span className="title-screen__stat-label">Progress</span>
              <strong>{progressSummary}</strong>
            </div>
            <div className="title-screen__stat">
              <span className="title-screen__stat-label">Stage</span>
              <strong>{stage?.name ?? "---"}</strong>
            </div>
          </div>

          <div className="title-screen__actions">
            <button className="title-screen__primary-button" onClick={handleContinue}>
              {showContinue ? "Continue" : "Start"}
            </button>
            {showContinue && (
              <button
                className="title-screen__secondary-button"
                onClick={() => setShowResetDialog(true)}
              >
                最初から
              </button>
            )}
          </div>
        </div>

        {showResetDialog && (
          <div className="title-screen__dialog-backdrop">
            <div className="title-screen__dialog">
              <h2>最初からやり直しますか？</h2>
              <p>
                保存されているポイント、解放済みスキル、クリア済みステージをすべて削除します。
              </p>
              <div className="title-screen__dialog-actions">
                <button
                  className="title-screen__dialog-cancel"
                  onClick={() => setShowResetDialog(false)}
                >
                  キャンセル
                </button>
                <button
                  className="title-screen__dialog-confirm"
                  onClick={handleStartOver}
                >
                  最初から始める
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      {/* ヘッダー */}
      <header className="app-header">
        <h1 className="app-title">NN Roguelike</h1>
        <span className="app-stage-label">
          {stage ? stage.name : "---"}
        </span>
        <span className="app-points">{points} pt</span>
        <button className="app-menu-btn" onClick={() => setShowMenu(true)}>
          Menu
        </button>
      </header>

      {/* ページ本体 */}
      <main className="app-main">
        {currentPage === "play" && <PlayPage />}
        {currentPage === "skillTree" && <SkillTreePage />}
      </main>

      {/* ボトムタブ */}
      <nav className="app-bottom-tabs">
        <button
          className={`tab${currentPage === "play" ? " active" : ""}`}
          onClick={() => setPage("play")}
        >
          Battle
        </button>
        <button
          className={`tab${currentPage === "skillTree" ? " active" : ""}`}
          onClick={() => setPage("skillTree")}
        >
          Skill Tree
        </button>
      </nav>

      {/* メニューオーバーレイ */}
      {showMenu && (
        <MenuOverlay
          onClose={() => setShowMenu(false)}
          onBackToTitle={handleReturnToTitle}
        />
      )}
    </div>
  );
}

export default App;
