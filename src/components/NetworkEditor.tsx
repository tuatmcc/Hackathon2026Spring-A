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
  type Connection,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NodePalette } from "./NodePalette";
import { LayerConfigPanel } from "./LayerConfigPanel";
import { LayerNode } from "./LayerNode";
import { isValidLayerConnection } from "./networkEditorUtils";
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

  const nodeTypes: NodeTypes = {
    layerNode: LayerNode,
  };

  const handleNodeClick = useCallback((_: unknown, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const validateConnection = useCallback(
    (connection: Connection | Edge) =>
      isValidLayerConnection(connection, nodes, edges),
    [edges, nodes],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!validateConnection(connection)) {
        return;
      }
      onConnect(connection);
    },
    [onConnect, validateConnection],
  );

  return (
    <div className="network-editor">
      <NodePalette />
      <div className="network-editor__canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          isValidConnection={validateConnection}
          defaultEdgeOptions={{
            animated: true,
            style: { strokeWidth: 2, stroke: "#555" },
          }}
          connectionLineStyle={{
            strokeWidth: 3,
            stroke: "#1f1f1f",
          }}
          fitViewOptions={{ padding: 0.2 }}
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
