// ============================================================
// StageSelectPage — メニューオーバーレイ (ステージ選択)
// ============================================================

import { STAGE_DATA } from "../config/stages";
import { getUnlockedStageCount } from "../stageProgress";
import { useGameStore } from "../stores/gameStore";
import { usePlayStore } from "../stores/playStore";
import { StageCard } from "../components/StageCard";

interface Props {
  onClose: () => void;
  onBackToTitle: () => void;
  onOpenTutorial: () => void;
}

export function MenuOverlay({ onClose, onBackToTitle, onOpenTutorial }: Props) {
  const { clearedStages, currentStageIndex, selectStage } = useGameStore();
  const { resetPlay } = usePlayStore();
  const unlockedStageCount = getUnlockedStageCount(STAGE_DATA, clearedStages);
  const visibleStages = STAGE_DATA.slice(0, unlockedStageCount);

  const handleSelect = (index: number) => {
    resetPlay();
    selectStage(index);
    onClose();
  };

  return (
    <div className="menu-overlay">
      <div className="menu-content">
        <div className="menu-header">
          <h2>Menu</h2>
          <div className="menu-header-actions">
            <button className="menu-title-button" onClick={onBackToTitle}>
              Title
            </button>
            <button className="menu-close" onClick={onOpenTutorial}>
              Tutorial
            </button>
            <button className="menu-close" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <h3 style={{ marginTop: 16 }}>Stage Select</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visibleStages.map((stage, i) => (
            <StageCard
              key={stage.id}
              stage={stage}
              index={i}
              isCurrent={i === currentStageIndex}
              isCleared={clearedStages.includes(stage.id)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
