import { useState } from "react";
import { useGameStore } from "./stores/gameStore";
import { MenuOverlay } from "./pages/StageSelectPage";
import { PlayPage } from "./pages/PlayPage";
import { SkillTreePage } from "./pages/SkillTreePage";
import { STAGE_DATA } from "./config/stages";
import { SKILL_DATA } from "./config/skills";
import { TitleScreen, TutorialScreen } from "./components/GameOverlays";
import "./App.css";

function App() {
  const {
    currentPage,
    setPage,
    points,
    showMenu,
    setShowMenu,
    currentStageIndex,
    clearedStages,
    unlockedSkills,
    hasSeenTutorial,
    markTutorialSeen,
    resetProgress,
    hasHydrated,
  } = useGameStore();
  const [showTitleScreen, setShowTitleScreen] = useState(true);
  const [showTutorialScreen, setShowTutorialScreen] = useState(false);

  const stage = STAGE_DATA[currentStageIndex];
  const initialSkillCount = SKILL_DATA.filter((skill) => skill.cost === 0).length;
  const hasProgress =
    points > 0 ||
    clearedStages.length > 0 ||
    currentStageIndex > 0 ||
    unlockedSkills.length > initialSkillCount;

  const handleEnterGame = () => {
    setShowTitleScreen(false);
    if (!hasSeenTutorial && !hasProgress) {
      setShowTutorialScreen(true);
    }
  };

  const handleOpenTutorial = () => {
    setShowTitleScreen(false);
    setShowMenu(false);
    setShowTutorialScreen(true);
  };

  const handleCloseTutorial = () => {
    markTutorialSeen();
    setShowTutorialScreen(false);
  };

  const handleReturnToTitle = () => {
    setShowMenu(false);
    setShowTitleScreen(true);
  };

  if (!hasHydrated) {
    return <div className="app" />;
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
          onOpenTutorial={handleOpenTutorial}
        />
      )}

      {showTitleScreen && (
        <TitleScreen
          hasProgress={hasProgress}
          points={points}
          clearedCount={clearedStages.length}
          totalStages={STAGE_DATA.length}
          onStart={handleEnterGame}
          onOpenTutorial={handleOpenTutorial}
          onReset={resetProgress}
        />
      )}

      {showTutorialScreen && (
        <TutorialScreen
          totalStages={STAGE_DATA.length}
          onClose={handleCloseTutorial}
        />
      )}
    </div>
  );
}

export default App;
