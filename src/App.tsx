import { useGameStore } from "./stores/gameStore";
import { StageSelectPage } from "./pages/StageSelectPage";
import { PlayPage } from "./pages/PlayPage";
import { SkillTreePage } from "./pages/SkillTreePage";
import "./App.css";

function App() {
  const { currentPage, setPage, points } = useGameStore();

  return (
    <div className="app">
      {/* ヘッダー */}
      <header className="app-header">
        <h1 className="app-title">NN Roguelike</h1>
        <nav className="app-nav">
          <button
            className={currentPage === "stageSelect" ? "active" : ""}
            onClick={() => setPage("stageSelect")}
          >
            Stages
          </button>
          <button
            className={currentPage === "skillTree" ? "active" : ""}
            onClick={() => setPage("skillTree")}
          >
            Skill Tree
          </button>
        </nav>
        <span className="app-points">{points} pt</span>
      </header>

      {/* ページ本体 */}
      <main className="app-main">
        {currentPage === "stageSelect" && <StageSelectPage />}
        {currentPage === "play" && <PlayPage />}
        {currentPage === "skillTree" && <SkillTreePage />}
      </main>
    </div>
  );
}

export default App;
