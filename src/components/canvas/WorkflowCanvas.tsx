"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import {
  ReactFlow, Background, BackgroundVariant, MiniMap,
  Connection, addEdge, applyNodeChanges, applyEdgeChanges,
  useReactFlow,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useWorkflowStore } from "@/store/workflowStore"
import { useHistoryStore } from "@/store/historyStore"
import { useCanvasToolStore } from "@/store/canvasToolStore"
import { useExecutionStore } from "@/store/executionStore"
import { validateConnection, hasCycle } from "@/lib/type-validator"
import TextNode from "@/components/nodes/TextNode"
import ImageUploadNode from "@/components/nodes/ImageUploadNode"
import VideoUploadNode from "@/components/nodes/VideoUploadNode"
import LLMNode from "@/components/nodes/LLMNode"
import CropImageNode from "@/components/nodes/CropImageNode"
import ExtractFrameNode from "@/components/nodes/ExtractFrameNode"
import CanvasToolbar from "./CanvasToolbar"
import { v4 as uuidv4 } from "uuid"
import { Play, Zap, AlertTriangle } from "lucide-react"

const nodeTypes = {
  textNode: TextNode,
  imageUploadNode: ImageUploadNode,
  videoUploadNode: VideoUploadNode,
  llmNode: LLMNode,
  cropImageNode: CropImageNode,
  extractFrameNode: ExtractFrameNode,
}

const defaultData: Record<string, any> = {
  textNode: { label: "Text", text: "", status: "idle" },
  imageUploadNode: { label: "Upload Image", status: "idle" },
  videoUploadNode: { label: "Upload Video", status: "idle" },
  llmNode: { label: "Run Any LLM", model: "gemini-2.5-flash", status: "idle", connectedHandles: [] },
  cropImageNode: { label: "Crop Image", xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100, connectedHandles: [], status: "idle" },
  extractFrameNode: { label: "Extract Frame", timestamp: "0", connectedHandles: [], status: "idle" },
}

function getDownstreamNodes(startIds: string[], edges: any[]): string[] {
  const visited = new Set<string>(startIds)
  const queue = [...startIds]
  while (queue.length > 0) {
    const current = queue.shift()!
    edges.forEach((edge) => {
      if (edge.source === current && !visited.has(edge.target)) {
        visited.add(edge.target)
        queue.push(edge.target)
      }
    })
  }
  return Array.from(visited)
}

interface Props {
  onHistoryToggle: () => void
}

// Toast component for connection errors
function ConnectionToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      background: "#1a1a1a", border: "1px solid rgba(248,113,113,0.4)",
      borderRadius: 10, padding: "10px 16px", zIndex: 9999,
      display: "flex", alignItems: "center", gap: 8,
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      animation: "slideUp 0.2s ease-out",
    }}>
      <AlertTriangle size={14} style={{ color: "#f87171", flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{message}</span>
    </div>
  )
}

export default function WorkflowCanvas({ onHistoryToggle }: Props) {
  const { nodes, edges, setNodes, setEdges, updateNode } = useWorkflowStore()
  const { pushHistory } = useHistoryStore()
  const { activeTool } = useCanvasToolStore()
  const { nodeStates } = useExecutionStore()
  const { fitView, setNodes: rfSetNodes } = useReactFlow()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; selectedIds: string[] } | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const safeNodes = nodes ?? []
  const safeEdges = edges ?? []

  // ── Handle custom keyboard shortcut events from useKeyboardShortcuts ──
  useEffect(() => {
    const handleFitView = () => fitView({ duration: 500, padding: 0.1 })
    const handleSelectAll = () => {
      setNodes(safeNodes.map((n) => ({ ...n, selected: true })))
    }

    window.addEventListener("workflow:fitview", handleFitView)
    window.addEventListener("workflow:selectall", handleSelectAll)
    return () => {
      window.removeEventListener("workflow:fitview", handleFitView)
      window.removeEventListener("workflow:selectall", handleSelectAll)
    }
  }, [fitView, safeNodes, setNodes])

  // Inject execution status className onto each node for glow effect
  const nodesWithStatus = safeNodes.map((node) => {
    const status = nodeStates[node.id]?.status
    return {
      ...node,
      className: status === "running"
        ? "node-running"
        : status === "success"
          ? "node-success"
          : status === "failed"
            ? "node-failed"
            : "",
    }
  })

  const onNodesChange = useCallback(
    (changes: any) => setNodes(applyNodeChanges(changes, safeNodes)),
    [safeNodes, setNodes]
  )

  const onEdgesChange = useCallback(
    (changes: any) => setEdges(applyEdgeChanges(changes, safeEdges)),
    [safeEdges, setEdges]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      // ── Type-safe connection validation with user feedback ──
      if (!validateConnection(connection, safeNodes)) {
        // Find source and target node types for a helpful message
        const sourceNode = safeNodes.find((n) => n.id === connection.source)
        const targetHandle = connection.targetHandle || "input"
        setConnectionError(
          `Cannot connect ${sourceNode?.type?.replace("Node", "") || "this node"} output to "${targetHandle}" — incompatible types`
        )
        return
      }
      if (hasCycle(safeNodes, safeEdges, { source: connection.source!, target: connection.target! })) {
        setConnectionError("Circular connections are not allowed — this would create a loop")
        return
      }
      pushHistory({ nodes: safeNodes, edges: safeEdges })
      const newEdge = {
        ...connection,
        id: uuidv4(),
        type: "default",
        animated: true,
        style: { stroke: "#a855f7", strokeWidth: 2 },
      }
      setEdges(addEdge(newEdge, safeEdges as any[]) as any)
      if (connection.target && connection.targetHandle) {
        const targetNode = safeNodes.find((n) => n.id === connection.target)
        const existing = (targetNode?.data?.connectedHandles as string[]) || []
        if (!existing.includes(connection.targetHandle)) {
          updateNode(connection.target, { connectedHandles: [...existing, connection.targetHandle] })
        }
      }
    },
    [safeNodes, safeEdges, setEdges, pushHistory, updateNode]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData("nodeType")
      if (!type || !reactFlowWrapper.current) return
      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = { x: e.clientX - bounds.left, y: e.clientY - bounds.top }
      pushHistory({ nodes: safeNodes, edges: safeEdges })
      setNodes([
        ...safeNodes,
        { id: uuidv4(), type, position, data: defaultData[type] || { label: type, status: "idle" } },
      ])
    },
    [safeNodes, safeEdges, setNodes, pushHistory]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const onEdgesDelete = useCallback(
    (deletedEdges: any[]) => {
      deletedEdges.forEach((edge) => {
        if (edge.target && edge.targetHandle) {
          const targetNode = safeNodes.find((n) => n.id === edge.target)
          if (targetNode) {
            const updated = ((targetNode.data?.connectedHandles as string[]) || []).filter(
              (h) => h !== edge.targetHandle
            )
            updateNode(edge.target, { connectedHandles: updated })
          }
        }
      })
    },
    [safeNodes, updateNode]
  )

  const onNodesDelete = useCallback(
    (_deletedNodes: any[]) => {
      pushHistory({ nodes: safeNodes, edges: safeEdges })
    },
    [safeNodes, safeEdges, pushHistory]
  )

  const onNodeDragStop = useCallback(
    (_: any, __: any, _draggedNodes: any[]) => {
      pushHistory({ nodes: safeNodes, edges: safeEdges })
    },
    [safeNodes, safeEdges, pushHistory]
  )

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: any) => {
      if (activeTool !== "cut") return
      pushHistory({ nodes: safeNodes, edges: safeEdges })
      const remaining = safeEdges.filter((e) => e.id !== edge.id)
      setEdges(remaining)
      if (edge.target && edge.targetHandle) {
        const targetNode = safeNodes.find((n) => n.id === edge.target)
        if (targetNode) {
          const updated = ((targetNode.data?.connectedHandles as string[]) || []).filter(
            (h) => h !== edge.targetHandle
          )
          updateNode(edge.target, { connectedHandles: updated })
        }
      }
    },
    [activeTool, safeNodes, safeEdges, setEdges, pushHistory, updateNode]
  )

  const onSelectionContextMenu = useCallback(
    (e: React.MouseEvent, selectedNodes: any[]) => {
      e.preventDefault()
      if (selectedNodes.length > 0) {
        setContextMenu({ x: e.clientX, y: e.clientY, selectedIds: selectedNodes.map((n) => n.id) })
      }
    },
    []
  )

  const runSelected = async () => {
    if (!contextMenu) return
    const { workflowId } = useWorkflowStore.getState()
    if (!workflowId) return
    const { runSelectedNodes } = await import("@/lib/execution-engine")
    runSelectedNodes(workflowId, contextMenu.selectedIds, safeNodes, safeEdges)
    setContextMenu(null)
  }

  const runFromHere = async () => {
    if (!contextMenu) return
    const { workflowId } = useWorkflowStore.getState()
    if (!workflowId) return
    const downstreamIds = getDownstreamNodes(contextMenu.selectedIds, safeEdges)
    const { runSelectedNodes } = await import("@/lib/execution-engine")
    runSelectedNodes(workflowId, downstreamIds, safeNodes, safeEdges)
    setContextMenu(null)
  }

  const isPanMode = activeTool === "pan"
  const isCutMode = activeTool === "cut"

  return (
    <div
      ref={reactFlowWrapper}
      className={isCutMode ? "cut-mode" : ""}
      style={{ width: "100%", height: "100%", cursor: isCutMode ? "crosshair" : undefined }}
      onClick={() => setContextMenu(null)}
    >
      <ReactFlow
        nodes={nodesWithStatus}
        edges={safeEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onEdgesDelete={onEdgesDelete}
        onNodesDelete={onNodesDelete}
        onNodeDragStop={onNodeDragStop}
        onEdgeClick={onEdgeClick}
        onSelectionContextMenu={onSelectionContextMenu}
        onPaneClick={() => setContextMenu(null)}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={["Delete", "Backspace"]}
        multiSelectionKeyCode="Shift"
        panOnDrag={isPanMode ? true : [1, 2]}
        selectionOnDrag={!isPanMode}
        panOnScroll={false}
        style={{ background: "#0a0a0a" }}
        defaultEdgeOptions={{
          type: "default",
          animated: true,
          style: { stroke: "#a855f7", strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#ffffff12" />
        <MiniMap
          style={{
            background: "#111",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
          }}
          nodeColor="#2a2a2a"
          maskColor="rgba(0,0,0,0.6)"
        />
        <CanvasToolbar onHistoryToggle={onHistoryToggle} />
      </ReactFlow>

      {/* Empty state */}
      {safeNodes.length === 0 && (
        <div style={{
          position: "absolute", inset: 0, top: 48,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          pointerEvents: "none", zIndex: 5,
        }}>
          <p style={{ fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.25)", margin: "0 0 6px" }}>
            Add a node to get started
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.18)", margin: 0 }}>
            Click + in the toolbar, drag from the sidebar, or use keyboard shortcuts (T, I, L, C, E)
          </p>
        </div>
      )}

      {/* Connection error toast */}
      {connectionError && (
        <ConnectionToast
          message={connectionError}
          onDismiss={() => setConnectionError(null)}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: "fixed", left: contextMenu.x, top: contextMenu.y,
            background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, padding: 6, zIndex: 1000, minWidth: 190,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: "4px 10px 8px", fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: "0.05em" }}>
            {contextMenu.selectedIds.length} NODE{contextMenu.selectedIds.length > 1 ? "S" : ""} SELECTED
          </div>
          <button onClick={runSelected} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            background: "rgba(212,245,122,0.08)", border: "1px solid rgba(212,245,122,0.15)",
            borderRadius: 8, padding: "8px 12px", cursor: "pointer",
            color: "#d4f57a", fontSize: 12, fontWeight: 600,
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(212,245,122,0.15)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(212,245,122,0.08)")}
          >
            <Play size={12} fill="#d4f57a" /> Run Selected Nodes
          </button>
          <button onClick={runFromHere} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            background: "none", border: "none", marginTop: 4,
            borderRadius: 8, padding: "8px 12px", cursor: "pointer",
            color: "rgba(255,255,255,0.45)", fontSize: 12,
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,0.45)" }}
          >
            <Zap size={12} /> Run from here (+ downstream)
          </button>
        </div>
      )}

      <style>{`
        @keyframes nodeGlow {
          0%, 100% { box-shadow: 0 0 8px 2px rgba(168, 85, 247, 0.5), 0 0 20px 6px rgba(168, 85, 247, 0.2); }
          50% { box-shadow: 0 0 16px 6px rgba(168, 85, 247, 0.8), 0 0 40px 12px rgba(168, 85, 247, 0.35); }
        }
        @keyframes nodeSuccessFlash {
          0% { box-shadow: 0 0 12px 4px rgba(74, 222, 128, 0.7); }
          100% { box-shadow: none; }
        }
        @keyframes nodeFailFlash {
          0% { box-shadow: 0 0 12px 4px rgba(248, 113, 113, 0.7); }
          100% { box-shadow: none; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .react-flow__node.node-running {
          animation: nodeGlow 1.2s ease-in-out infinite;
          border-radius: 12px;
          z-index: 10 !important;
        }
        .react-flow__node.node-success {
          animation: nodeSuccessFlash 1s ease-out forwards;
          border-radius: 12px;
        }
        .react-flow__node.node-failed {
          animation: nodeFailFlash 1s ease-out forwards;
          border-radius: 12px;
        }
        .cut-mode .react-flow__edge:hover .react-flow__edge-path {
          stroke: #f43f5e !important;
          stroke-width: 3 !important;
          cursor: crosshair !important;
        }
      `}</style>
    </div>
  )
}