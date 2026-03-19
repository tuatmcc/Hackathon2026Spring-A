// ============================================================
// メニューオーバーレイ (ステージ選択・設定)
// ハンバーガーメニューやヘッダーから開く上位階層の画面
// ============================================================

import { STAGE_DATA } from "../config/stages";
import { useGameStore } from "../stores/gameStore";
import { usePlayStore } from "../stores/playStore";

interface Props {
  onClose: () => void;
}

export function MenuOverlay({ onClose }: Props) {
  const { clearedStages, currentStageIndex, selectStage } = useGameStore();
  const { resetPlay } = usePlayStore();

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
          <button className="menu-close" onClick={onClose}>
            Close
          </button>
        </div>

        <h3 style={{ marginTop: 16 }}>Stage Select</h3>
        <div className="menu-stage-list">
          {STAGE_DATA.map((stage, i) => {
            const cleared = clearedStages.includes(stage.id);
            const isCurrent = i === currentStageIndex;
            return (
              <div
                key={stage.id}
                className={`menu-stage-card${isCurrent ? " current" : ""}${cleared ? " cleared" : ""}`}
              >
                <div>
                  <strong>
                    {stage.name} {cleared && "(Cleared)"} {isCurrent && " <-"}
                  </strong>
                  <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
                    {stage.description}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Target Loss: {stage.targetLoss} | Reward:{" "}
                    {stage.rewardPoints}pt
                  </div>
                </div>
                <button onClick={() => handleSelect(i)}>
                  {isCurrent ? "Restart" : "Play"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
