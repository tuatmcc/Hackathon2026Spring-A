// ============================================================
// データ可視化 (散布図・決定境界)
// 実装担当者: Canvas or SVG で散布図と決定境界の描画を実装
// ============================================================

interface Props {
  stageId: string | null;
}

export function DataVisualization({ stageId }: Props) {
  return (
    <div
      style={{
        width: "100%",
        height: 200,
        border: "1px dashed #888",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#888",
      }}
    >
      {stageId
        ? `[Data Visualization: ${stageId}]`
        : "[No stage selected]"}
    </div>
  );
}
