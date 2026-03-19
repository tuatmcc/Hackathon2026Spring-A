import { useGameStore } from "./stores/gameStore";
import { MenuOverlay } from "./pages/StageSelectPage";
import { PlayPage } from "./pages/PlayPage";
import { SkillTreePage } from "./pages/SkillTreePage";
import { STAGE_DATA } from "./config/stages";
import "./App.css";

function App() {
  const { currentPage, setPage, points, showMenu, setShowMenu, currentStageIndex } =
    useGameStore();

  const stage = STAGE_DATA[currentStageIndex];

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
      {showMenu && <MenuOverlay onClose={() => setShowMenu(false)} />}
    </div>
  );
}

export default App;
