// ============================================================
// DataVisualization — 散布図 + 決定境界
//
// 【担当者へ】
// stage.inputShape, stage.taskType に応じて可視化方法を分岐する。
// Canvas or SVG で描画。現在はプレースホルダー。
// ============================================================

import type { StageDef } from "../types";

interface Props {
  stage: StageDef | null;
}

export function DataVisualization({ stage }: Props) {
  if (!stage) {
    return (
      <div style={placeholderStyle}>[No stage selected]</div>
    );
  }

  // TODO: stage.inputShape / taskType に応じた可視化を実装
  //   inputShape=[2] → 2D散布図 + 決定境界
  //   inputShape=[28,28,1] → サンプル画像表示
  return (
    <div style={placeholderStyle}>
      [Data Visualization: {stage.name}]
      <br />
      <span style={{ fontSize: 11 }}>
        input: [{stage.inputShape.join(",")}] / task: {stage.taskType}
      </span>
    </div>
  );
}

const placeholderStyle: React.CSSProperties = {
  width: "100%",
  height: 200,
  border: "1px dashed #888",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  color: "#888",
  fontSize: 13,
};
