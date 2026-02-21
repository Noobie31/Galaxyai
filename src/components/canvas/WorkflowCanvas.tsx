"use client"

import { useCallback, useRef, useState } from "react"
import {
  ReactFlow, Background, BackgroundVariant, MiniMap,
  Connection, addEdge, applyNodeChanges, applyEdgeChanges,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useWorkflowStore } from "@/store/workflowStore"
import { useHistoryStore } from "@/store/historyStore"
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
  llmNode: { label: "Run Any LLM", model: "gemini-2.5-flash", status: "idle", connectedHandles: [] },
  cropImageNode: { label: "Crop Image", xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100, connectedHandles: [], status: "idle" },
  extractFrameNode: { label: "Extract Frame", timestamp: "0", connectedHandles: [], status: "idle" },
}

export default function WorkflowCanvas() {
  const { nodes, edges, setNodes, setEdges, updateNode } = useWorkflowStore()
  const { pushHistory } = useHistoryStore()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; selectedIds: string[] } | null>(null)

  const onNodesChange = useCallback(
    (changes: any) => setNodes(applyNodeChanges(changes, nodes)),
    [nodes, setNodes]
  )

  const onEdgesChange = useCallback(
    (changes: any) => setEdges(applyEdgeChanges(changes, edges)),
    [edges, setEdges]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      // Type validation
      if (!validateConnection(connection, nodes)) return
      // Cycle detection
      if (hasCycle(nodes, edges, { source: connection.source!, target: connection.target! })) {
        console.warn("Cycle detected - connection rejected")
        return
      }
      pushHistory({ nodes, edges })
      const newEdge = {
        ...connection,
        id: uuidv4(),
        animated: true,
        style: { stroke: "#a855f7", strokeWidth: 2 },
      }
      setEdges(addEdge(newEdge, edges as any[]) as any)
      if (connection.target && connection.targetHandle) {
        const targetNode = nodes.find((n) => n.id === connection.target)
        const existing = (targetNode?.data?.connectedHandles as string[]) || []
        if (!existing.includes(connection.targetHandle)) {
          updateNode(connection.target, { connectedHandles: [...existing, connection.targetHandle] })
        }
      }
    },
    [nodes, edges, setEdges, pushHistory, updateNode]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData("nodeType")
      if (!type || !reactFlowWrapper.current) return
      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = { x: e.clientX - bounds.left, y: e.clientY - bounds.top }
      pushHistory({ nodes, edges })
      setNodes([
        ...nodes,
        { id: uuidv4(), type, position, data: defaultData[type] || { label: type, status: "idle" } },
      ])
    },
    [nodes, edges, setNodes, pushHistory]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const onEdgesDelete = useCallback(
    (deletedEdges: any[]) => {
      deletedEdges.forEach((edge) => {
        if (edge.target && edge.targetHandle) {
          const targetNode = nodes.find((n) => n.id === edge.target)
          if (targetNode) {
            const updated = ((targetNode.data?.connectedHandles as string[]) || []).filter(
              (h) => h !== edge.targetHandle
            )
            updateNode(edge.target, { connectedHandles: updated })
          }
        }
      })
    },
    [nodes, updateNode]
  )

  const onSelectionContextMenu = useCallback(
    (e: React.MouseEvent, selectedNodes: any[]) => {
      e.preventDefault()
      if (selectedNodes.length > 1) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          selectedIds: selectedNodes.map((n) => n.id),
        })
      }
    },
    []
  )

  const runSelected = async () => {
    if (!contextMenu) return
    const { workflowId } = useWorkflowStore.getState()
    if (!workflowId) return
    const { runSelectedNodes } = await import("@/lib/execution-engine")
    runSelectedNodes(workflowId, contextMenu.selectedIds, nodes, edges)
    setContextMenu(null)
  }

  return (
    <div ref={reactFlowWrapper} className="w-full h-full" onClick={() => setContextMenu(null)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
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
        className="bg-[#0a0a0a]"
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: "#a855f7", strokeWidth: 2 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#ffffff15" />
        <MiniMap
          className="!bg-[#111111] !border-white/10"
          nodeColor="#333333"
          maskColor="rgba(0,0,0,0.7)"
        />
        <CanvasToolbar />
      </ReactFlow>

      {/* Right-click context menu for multi-selected nodes */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            background: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: 6,
            zIndex: 1000,
            minWidth: 180,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              padding: "4px 8px 8px",
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
              fontWeight: 600,
            }}
          >
            {contextMenu.selectedIds.length} NODES SELECTED
          </div>

          <button
            onClick={runSelected}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              background: "rgba(212,245,122,0.1)", border: "1px solid rgba(212,245,122,0.2)",
              borderRadius: 7, padding: "8px 12px", cursor: "pointer",
              color: "#d4f57a", fontSize: 12, fontWeight: 600,
            }}
          >
            <Play size={12} fill="#d4f57a" />
            Run Selected Nodes
          </button>

          <button
            onClick={() => {
              const { workflowId } = useWorkflowStore.getState()
              if (workflowId) {
                import("@/lib/execution-engine").then(({ runSelectedNodes }) => {
                  runSelectedNodes(workflowId, contextMenu.selectedIds, nodes, edges)
                })
              }
              setContextMenu(null)
            }}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              background: "none", border: "none", marginTop: 4,
              borderRadius: 7, padding: "8px 12px", cursor: "pointer",
              color: "rgba(255,255,255,0.5)", fontSize: 12,
            }}
          >
            <Zap size={12} />
            Run from here
          </button>
        </div>
      )}
    </div>
  )
}

