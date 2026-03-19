// ============================================================
// ステージ選択画面
// ============================================================

import { STAGE_DATA } from "../config/stages";
import { useGameStore } from "../stores/gameStore";
import { usePlayStore } from "../stores/playStore";

export function StageSelectPage() {
  const { clearedStages, setPage } = useGameStore();
  const { setCurrentStageId, resetPlay } = usePlayStore();

  const handleSelect = (stageId: string) => {
    resetPlay();
    setCurrentStageId(stageId);
    setPage("play");
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Stage Select</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
          marginTop: 16,
        }}
      >
        {STAGE_DATA.map((stage) => {
          const cleared = clearedStages.includes(stage.id);
          return (
            <div
              key={stage.id}
              style={{
                border: "1px solid",
                borderColor: cleared ? "#4caf50" : "#ccc",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <h3>
                {stage.name} {cleared && "(Cleared)"}
              </h3>
              <p style={{ fontSize: 14, color: "#666" }}>
                {stage.description}
              </p>
              <p style={{ fontSize: 12 }}>
                Target Loss: {stage.targetLoss} | Reward: {stage.rewardPoints}pt
              </p>
              <button onClick={() => handleSelect(stage.id)}>Play</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
