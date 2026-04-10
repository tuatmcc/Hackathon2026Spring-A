// ============================================================
// NetworkEditor — React Flow キャンバス + パレット + 設定パネル
//
// 【担当者へ】
// React Flow のカスタムノード、D&D、バリデーション等を実装。
// ============================================================

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type OnReconnect,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NodePalette } from "./NodePalette";
import { LayerConfigPanel } from "./LayerConfigPanel";
import { LayerNode } from "./LayerNode";
import { FixedNode } from "./FixedNode";
import { createLayerNode } from "./layerNodeFactory";
import { isValidLayerConnection, isFixedNodeId } from "./networkEditorUtils";
import { NETWORK_EDITOR_INTERACTION } from "./networkEditorInteractionConfig";
import { usePlayStore } from "../stores/playStore";
import type { LayerNodeData, StageDef } from "../types";

interface Props {
  nodes: Node<LayerNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onReconnect: OnReconnect;
  stage: StageDef | null;
}

type BodyDropMode =
  | {
      type: "connect";
      source: string;
      sourceHandle: string | null;
    }
  | {
      type: "reconnect-target";
      edge: Edge;
    }
  | null;

export function NetworkEditor({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onReconnect,
  stage,
}: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [reconnectingEdgeId, setReconnectingEdgeId] = useState<string | null>(null);
  const [bodyDropMode, setBodyDropMode] = useState<BodyDropMode>(null);
  const [bodyDropTargetId, setBodyDropTargetId] = useState<string | null>(null);
  const [bodyDropTargetValid, setBodyDropTargetValid] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{
    startClientX: number;
    startClientY: number;
    currentClientX: number;
    currentClientY: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<
    ReactFlowInstance<Node, Edge> | null
  >(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const storedFixedNodes = usePlayStore((state) => state.fixedNodes);
  const initializeFixedNodes = usePlayStore((state) => state.initializeFixedNodes);
  const onFixedNodesChange = usePlayStore((state) => state.onFixedNodesChange);
  const removeNode = usePlayStore((state) => state.removeNode);

  useEffect(() => {
    if (!stage) {
      return;
    }
    initializeFixedNodes();
  }, [initializeFixedNodes, stage]);

  const fixedNodes = useMemo(() => {
    if (!stage) {
      return [];
    }

    return storedFixedNodes.map((node) => ({
      ...node,
      data:
        node.id === "__input__"
          ? {
              nodeType: "input",
              shape: stage.inputShape,
            }
          : {
              nodeType: "output",
              shape: [stage.outputUnits],
              activation: stage.outputActivation,
              units: stage.outputUnits,
            },
    }));
  }, [stage, storedFixedNodes]);
  
  const allNodes = useMemo(() => {
    const baseNodes = stage ? [...fixedNodes, ...nodes] : nodes;

    return baseNodes.map((node) => {
      const classNames = [node.className];

      if (
        bodyDropMode &&
        ((bodyDropMode.type === "connect" && bodyDropMode.source === node.id) ||
          (bodyDropMode.type === "reconnect-target" && bodyDropMode.edge.source === node.id))
      ) {
        classNames.push("network-editor__node--connection-source");
      }

      if (bodyDropTargetId === node.id) {
        classNames.push(
          bodyDropTargetValid
            ? "network-editor__node--drop-target"
            : "network-editor__node--drop-target-invalid",
        );
      }

      return {
        ...node,
        className: classNames.filter(Boolean).join(" "),
      };
    });
  }, [bodyDropMode, bodyDropTargetId, bodyDropTargetValid, fixedNodes, nodes, stage]);

  const allEdges = useMemo(() => {
    if (!stage) return edges;
    return edges;
  }, [edges, stage]);

  const nodeTypes: NodeTypes = useMemo(() => ({
    layerNode: LayerNode,
    fixedNode: FixedNode,
  }), []);

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const fixedChanges = changes.filter(
        (change) => "id" in change && isFixedNodeId(change.id)
      );
      
      if (fixedChanges.length > 0) {
        onFixedNodesChange(fixedChanges);
      }

      const otherChanges = changes.filter(
        (change) => !("id" in change) || !isFixedNodeId(change.id)
      );
      
      if (otherChanges.length > 0) {
        onNodesChange(otherChanges);
      }
    },
    [onFixedNodesChange, onNodesChange],
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
    },
    [onEdgesChange],
  );

  const handleNodeClick = useCallback((_: unknown, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const validateConnection = useCallback(
    (connection: Connection | Edge) =>
      isValidLayerConnection(connection, allNodes, allEdges, stage, {
        ignoreEdgeIds: reconnectingEdgeId ? [reconnectingEdgeId] : [],
      }),
    [allEdges, allNodes, reconnectingEdgeId, stage],
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

  const handleReconnect = useCallback(
    (oldEdge: Edge, connection: Connection) => {
      if (
        !isValidLayerConnection(connection, allNodes, allEdges, stage, {
          ignoreEdgeIds: [oldEdge.id],
        })
      ) {
        return;
      }

      onReconnect(oldEdge, connection);
      setReconnectingEdgeId(null);
    },
    [allEdges, allNodes, onReconnect, stage],
  );

  const clearBodyDropPreview = useCallback(() => {
    setBodyDropMode(null);
    setBodyDropTargetId(null);
    setBodyDropTargetValid(false);
  }, []);

  const buildBodyDropConnection = useCallback(
    (targetNodeId: string): Connection | null => {
      if (bodyDropMode?.type === "connect") {
        return {
          source: bodyDropMode.source,
          sourceHandle: bodyDropMode.sourceHandle,
          target: targetNodeId,
          targetHandle: null,
        };
      }

      if (bodyDropMode?.type === "reconnect-target") {
        return {
          source: bodyDropMode.edge.source,
          sourceHandle: bodyDropMode.edge.sourceHandle ?? null,
          target: targetNodeId,
          targetHandle: null,
        };
      }

      return null;
    },
    [bodyDropMode],
  );

  const getClientPoint = useCallback((event: MouseEvent | TouchEvent) => {
    if ("changedTouches" in event && event.changedTouches.length > 0) {
      const touch = event.changedTouches[0];
      return { x: touch.clientX, y: touch.clientY };
    }

    if ("clientX" in event) {
      return { x: event.clientX, y: event.clientY };
    }

    return null;
  }, []);

  const getNodeIdAtClientPoint = useCallback((clientX: number, clientY: number) => {
    if (typeof document === "undefined") {
      return null;
    }

    const nodeElement = document
      .elementsFromPoint(clientX, clientY)
      .map((element) => element.closest(".react-flow__node"))
      .find((element): element is HTMLElement => element instanceof HTMLElement);

    return nodeElement?.dataset.id ?? null;
  }, []);

  const updateBodyDropPreview = useCallback(
    (clientX: number, clientY: number) => {
      if (!bodyDropMode) {
        return;
      }

      const targetNodeId = getNodeIdAtClientPoint(clientX, clientY);
      if (!targetNodeId) {
        setBodyDropTargetId(null);
        setBodyDropTargetValid(false);
        return;
      }

      const connection = buildBodyDropConnection(targetNodeId);
      setBodyDropTargetId(targetNodeId);
      setBodyDropTargetValid(connection ? validateConnection(connection) : false);
    },
    [bodyDropMode, buildBodyDropConnection, getNodeIdAtClientPoint, validateConnection],
  );

  const handleConnectStart = useCallback(
    (_: MouseEvent | TouchEvent, params: { nodeId: string | null; handleId: string | null; handleType: string | null }) => {
      if (!params.nodeId || params.handleType !== "source") {
        clearBodyDropPreview();
        return;
      }

      setBodyDropMode({
        type: "connect",
        source: params.nodeId,
        sourceHandle: params.handleId,
      });
    },
    [clearBodyDropPreview],
  );

  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: { toHandle: unknown }) => {
      if (connectionState.toHandle) {
        clearBodyDropPreview();
        return;
      }

      const point = getClientPoint(event);
      const targetNodeId = point ? getNodeIdAtClientPoint(point.x, point.y) : null;
      const connection = targetNodeId ? buildBodyDropConnection(targetNodeId) : null;

      if (connection && validateConnection(connection)) {
        onConnect(connection);
      }

      clearBodyDropPreview();
    },
    [
      buildBodyDropConnection,
      clearBodyDropPreview,
      getClientPoint,
      getNodeIdAtClientPoint,
      onConnect,
      validateConnection,
    ],
  );

  const handleReconnectStart = useCallback((_: unknown, edge: Edge, handleType: "source" | "target") => {
    setReconnectingEdgeId(edge.id);
    if (handleType === "target") {
      setBodyDropMode({
        type: "reconnect-target",
        edge,
      });
      return;
    }

    clearBodyDropPreview();
  }, [clearBodyDropPreview]);

  const handleReconnectEnd = useCallback(
    (
      event: MouseEvent | TouchEvent,
      edge: Edge,
      handleType: "source" | "target",
      connectionState: { toHandle: unknown },
    ) => {
      if (handleType === "target" && !connectionState.toHandle) {
        const point = getClientPoint(event);
        const targetNodeId = point ? getNodeIdAtClientPoint(point.x, point.y) : null;
        const connection = targetNodeId ? buildBodyDropConnection(targetNodeId) : null;

        if (connection && validateConnection(connection)) {
          onReconnect(edge, connection);
          setReconnectingEdgeId(null);
          clearBodyDropPreview();
          return;
        }
      }

      clearBodyDropPreview();
      setReconnectingEdgeId(null);
    },
    [
      buildBodyDropConnection,
      clearBodyDropPreview,
      getClientPoint,
      getNodeIdAtClientPoint,
      onReconnect,
      validateConnection,
    ],
  );

  useEffect(() => {
    if (!bodyDropMode) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      updateBodyDropPreview(event.clientX, event.clientY);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      updateBodyDropPreview(touch.clientX, touch.clientY);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("touchmove", handleTouchMove);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [bodyDropMode, updateBodyDropPreview]);

  useEffect(() => {
    if (!bodyDropMode) {
      setBodyDropTargetId(null);
      setBodyDropTargetValid(false);
    }
  }, [bodyDropMode]);

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      removeNode(nodeId);
      setSelectedNodeId((current) => (current === nodeId ? null : current));
    },
    [removeNode],
  );

  useEffect(() => {
    if (!selectedNodeId) {
      return;
    }

    const selectedStillExists = allNodes.some((node) => node.id === selectedNodeId);
    if (!selectedStillExists) {
      setSelectedNodeId(null);
    }
  }, [allNodes, selectedNodeId]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const getCanvasRelativePoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    [],
  );

  const isInsideCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return false;
    }

    const rect = canvas.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }, []);

  const handlePointerDownCapture = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 2) {
        return;
      }

      const point = getCanvasRelativePoint(event.clientX, event.clientY);
      if (!point) {
        return;
      }

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setSelectionBox({
        startClientX: event.clientX,
        startClientY: event.clientY,
        currentClientX: event.clientX,
        currentClientY: event.clientY,
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
      });
    },
    [getCanvasRelativePoint],
  );

  const handlePointerMoveCapture = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if ((event.buttons & 2) === 0 || !selectionBox) {
        return;
      }

      if (!isInsideCanvas(event.clientX, event.clientY)) {
        setSelectionBox(null);
        return;
      }

      const point = getCanvasRelativePoint(event.clientX, event.clientY);
      if (!point) {
        return;
      }

      event.preventDefault();
      setSelectionBox((current) =>
        current
          ? {
              ...current,
              currentClientX: event.clientX,
              currentClientY: event.clientY,
              currentX: point.x,
              currentY: point.y,
            }
          : current,
      );
    },
    [getCanvasRelativePoint, isInsideCanvas, selectionBox],
  );

  const handlePointerUpCapture = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 2 || !selectionBox || !reactFlowInstance) {
        return;
      }

      event.preventDefault();
      event.currentTarget.releasePointerCapture(event.pointerId);

      const start = reactFlowInstance.screenToFlowPosition({
        x: selectionBox.startClientX,
        y: selectionBox.startClientY,
      });
      const end = reactFlowInstance.screenToFlowPosition({
        x: selectionBox.currentClientX,
        y: selectionBox.currentClientY,
      });

      const left = Math.min(start.x, end.x);
      const right = Math.max(start.x, end.x);
      const top = Math.min(start.y, end.y);
      const bottom = Math.max(start.y, end.y);

      const nextSelectedIds = new Set(
        nodes
          .filter((node) => {
            const nodeX = node.position.x;
            const nodeY = node.position.y;
            const nodeWidth = node.measured?.width ?? node.width ?? 0;
            const nodeHeight = node.measured?.height ?? node.height ?? 0;

            const nodeRight = nodeX + nodeWidth;
            const nodeBottom = nodeY + nodeHeight;

            return (
              nodeRight >= left &&
              nodeX <= right &&
              nodeBottom >= top &&
              nodeY <= bottom
            );
          })
          .map((node) => node.id),
      );

      onNodesChange(
        nodes.map((node) => ({
          id: node.id,
          type: "select",
          selected: nextSelectedIds.has(node.id),
        })),
      );

      setSelectedNodeId(
        nextSelectedIds.size === 1 ? [...nextSelectedIds][0] : null,
      );
      setSelectionBox(null);
    },
    [nodes, onNodesChange, reactFlowInstance, selectionBox],
  );

  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
    },
    [],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const layerType = event.dataTransfer.getData("application/reactflow");
      if (!layerType || !reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      onNodesChange([
        {
          type: "add",
          item: createLayerNode(layerType, position),
        },
      ]);
    },
    [onNodesChange, reactFlowInstance],
  );

  return (
    <div className="network-editor">
      <NodePalette />
      <div
        ref={canvasRef}
        className="network-editor__canvas"
        onContextMenuCapture={handlePaneContextMenu}
        onPointerDownCapture={handlePointerDownCapture}
        onPointerMoveCapture={handlePointerMoveCapture}
        onPointerUpCapture={handlePointerUpCapture}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <ReactFlow
          nodes={allNodes}
          edges={allEdges}
          nodeTypes={nodeTypes}
          onInit={setReactFlowInstance}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onConnectStart={handleConnectStart}
          onConnectEnd={handleConnectEnd}
          onReconnect={handleReconnect}
          onReconnectStart={handleReconnectStart}
          onReconnectEnd={handleReconnectEnd}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          isValidConnection={validateConnection}
          edgesReconnectable
          defaultEdgeOptions={{
            animated: true,
            style: { strokeWidth: 2, stroke: "#555" },
            interactionWidth: NETWORK_EDITOR_INTERACTION.edgeInteractionWidth,
          }}
          connectionRadius={NETWORK_EDITOR_INTERACTION.connectionRadius}
          reconnectRadius={NETWORK_EDITOR_INTERACTION.reconnectRadius}
          panOnDrag={[0]}
          connectionLineStyle={{
            strokeWidth: 3,
            stroke: "#1f1f1f",
          }}
          fitViewOptions={{ padding: 0.2 }}
          fitView
          onPaneContextMenu={handlePaneContextMenu}
        >
          <Background gap={24} size={1.2} color="rgba(124, 97, 38, 0.18)" />
          <Controls />
        </ReactFlow>
        {selectionBox && (
          <div
            style={{
              position: "absolute",
              left: Math.min(selectionBox.startX, selectionBox.currentX),
              top: Math.min(selectionBox.startY, selectionBox.currentY),
              width: Math.abs(selectionBox.currentX - selectionBox.startX),
              height: Math.abs(selectionBox.currentY - selectionBox.startY),
              border: "1px solid rgba(34, 34, 34, 0.7)",
              background: "rgba(34, 34, 34, 0.12)",
              borderRadius: 8,
              pointerEvents: "none",
              zIndex: 10,
            }}
          />
        )}
      </div>
      <LayerConfigPanel
        selectedNodeId={selectedNodeId}
        onDeleteNode={handleDeleteNode}
      />
    </div>
  );
}
