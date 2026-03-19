// ============================================================
// NetworkEditor — React Flow キャンバス + パレット + 設定パネル
//
// 【担当者へ】
// React Flow のカスタムノード、D&D、バリデーション等を実装。
// ============================================================

import { useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NodePalette } from "./NodePalette";
import { LayerConfigPanel } from "./LayerConfigPanel";
import type { LayerNodeData } from "../types";

interface Props {
  nodes: Node<LayerNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
}

export function NetworkEditor({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
}: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleNodeClick = useCallback((_: unknown, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <NodePalette />
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <LayerConfigPanel selectedNodeId={selectedNodeId} />
    </div>
  );
}
