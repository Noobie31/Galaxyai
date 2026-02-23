"use client"

import { useCallback, useRef, useState } from "react"
import {
  ReactFlow, Background, BackgroundVariant, MiniMap,
  Connection, addEdge, applyNodeChanges, applyEdgeChanges,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useWorkflowStore } from "@/store/workflowStore"
import { useHistoryStore } from "@/store/historyStore"
import { useCanvasToolStore } from "@/store/canvasToolStore"
import { validateConnection, hasCycle } from "@/lib/type-validator"
import TextNode from "@/components/nodes/TextNode"
import ImageUploadNode from "@/components/nodes/ImageUploadNode"
import VideoUploadNode from "@/components/nodes/VideoUploadNode"
import LLMNode from "@/components/nodes/LLMNode"
import CropImageNode from "@/components/nodes/CropImageNode"
import ExtractFrameNode from "@/components/nodes/ExtractFrameNode"
import CanvasToolbar from "./CanvasToolbar"
import { v4 as uuidv4 } from "uuid"
import { Play, Zap } from "lucide-react"

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
  llmNode: { label: "Run Any LLM", model: "gemini-2.0-flash", status: "idle", connectedHandles: [] },
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

export default function WorkflowCanvas({ onHistoryToggle }: Props) {
  const { nodes, edges, setNodes, setEdges, updateNode } = useWorkflowStore()
  const { pushHistory } = useHistoryStore()
  const { activeTool } = useCanvasToolStore()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; selectedIds: string[] } | null>(null)

  // Safely get arrays - guard against undefined during hydration
  const safeNodes = nodes ?? []
  const safeEdges = edges ?? []

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
      if (!validateConnection(connection, safeNodes)) return
      if (hasCycle(safeNodes, safeEdges, { source: connection.source!, target: connection.target! })) {
        console.warn("Cycle detected - connection rejected")
        return
      }
      pushHistory({ nodes: safeNodes, edges: safeEdges })
      const newEdge = {
        ...connection,
        id: uuidv4(),
        type: "default",       // ← curved bezier (default ReactFlow edge type)
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

  return (
    <div ref={reactFlowWrapper} style={{ width: "100%", height: "100%" }} onClick={() => setContextMenu(null)}>
      <ReactFlow
        nodes={safeNodes}
        edges={safeEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onEdgesDelete={onEdgesDelete}
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
          type: "default",   // curved bezier edges
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
        {/* Pass onHistoryToggle so toolbar header can toggle right sidebar */}
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
            Add a node
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.18)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            Click + or drag from the left sidebar
          </p>
        </div>
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
    </div>
  )
}