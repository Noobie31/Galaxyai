"use client"

import { useState, useCallback } from "react"
import { useReactFlow, useViewport, Panel } from "@xyflow/react"
import { useWorkflowStore } from "@/store/workflowStore"
import { useHistoryStore } from "@/store/historyStore"
import { useExecutionStore } from "@/store/executionStore"
import { MousePointer2, Hand, Undo2, Redo2, Play, Save, FolderOpen, Share2, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CanvasToolbar() {
  const router = useRouter()
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const { zoom } = useViewport()
  const [tool, setTool] = useState<"select" | "pan">("select")
  const { nodes, edges, workflowName, setWorkflowName, workflowId, isSaving, setIsSaving, setLastSaved } = useWorkflowStore()
  const { undo, redo } = useHistoryStore()
  const { isRunning } = useExecutionStore()
  const [isEditingName, setIsEditingName] = useState(false)

  const handleUndo = useCallback(() => {
    const entry = undo()
    if (entry) {
      useWorkflowStore.getState().setNodes(entry.nodes)
      useWorkflowStore.getState().setEdges(entry.edges)
    }
  }, [undo])

  const handleRedo = useCallback(() => {
    const entry = redo()
    if (entry) {
      useWorkflowStore.getState().setNodes(entry.nodes)
      useWorkflowStore.getState().setEdges(entry.edges)
    }
  }, [redo])

  const handleSave = async () => {
    const state = useWorkflowStore.getState()
    setIsSaving(true)
    try {
      await fetch(`/api/workflows/${state.workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: state.workflowName, nodes: state.nodes, edges: state.edges }),
      })
      setLastSaved(new Date())
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpen = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          if (data.nodes && data.edges) {
            useWorkflowStore.getState().setNodes(data.nodes)
            useWorkflowStore.getState().setEdges(data.edges)
          }
        } catch {}
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    alert("Link copied!")
  }

  const handleRun = async () => {
    if (!workflowId || isRunning) return
    const { runWorkflow } = await import("@/lib/execution-engine")
    runWorkflow(workflowId, nodes, edges, "full")
  }

  return (
    <>
      {/* Top Bar - fixed position to avoid ReactFlow Panel issues */}
      <Panel position="top-left" className="!m-0 !p-0 !left-0 !top-0 !right-0" style={{ width: "100%", zIndex: 100 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          background: "#111111",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "8px 16px",
          width: "100%",
          gap: "12px",
        }}>
          {/* Back button */}
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 8,
              background: "rgba(147,51,234,0.3)", border: "none", cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={14} color="#c084fc" />
          </button>

          {/* Workflow name */}
          {isEditingName ? (
            <input
              autoFocus
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => { if (e.key === "Enter") setIsEditingName(false) }}
              style={{
                background: "rgba(255,255,255,0.1)", color: "white",
                border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6,
                padding: "2px 8px", fontSize: 14, fontWeight: 600, outline: "none", width: 180,
              }}
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "white", fontSize: 14, fontWeight: 600, padding: "2px 4px",
              }}
            >
              {workflowName}
            </button>
          )}

          <div style={{ flex: 1 }} />

          {/* OPEN */}
          <button onClick={handleOpen} style={btnStyle}>
            <FolderOpen size={13} />
            OPEN
          </button>

          {/* SHARE */}
          <button onClick={handleShare} style={btnStyle}>
            <Share2 size={13} />
            SHARE
          </button>

          {/* SAVE */}
          <button onClick={handleSave} disabled={isSaving} style={btnStyle}>
            <Save size={13} />
            {isSaving ? "SAVING..." : "SAVE"}
          </button>

          {/* RUN */}
          <button onClick={handleRun} disabled={isRunning} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#d4f57a", color: "black",
            border: "none", borderRadius: 8, cursor: "pointer",
            padding: "6px 20px", fontSize: 13, fontWeight: 700,
            opacity: isRunning ? 0.6 : 1,
          }}>
            <Play size={13} fill="black" />
            {isRunning ? "RUNNING..." : "RUN"}
          </button>
        </div>
      </Panel>

      {/* Bottom Toolbar */}
      <Panel position="bottom-center" className="!mb-4">
        <div className="flex items-center gap-1 bg-[#1a1a1a] border border-white/10 rounded-xl px-2 py-1.5 shadow-xl">
          <button onClick={() => setTool("select")}
            className={`p-2 rounded-lg transition-colors ${tool === "select" ? "bg-[#d4f57a] text-black" : "text-white/60 hover:text-white hover:bg-white/10"}`}>
            <MousePointer2 size={16} />
          </button>
          <button onClick={() => setTool("pan")}
            className={`p-2 rounded-lg transition-colors ${tool === "pan" ? "bg-[#d4f57a] text-black" : "text-white/60 hover:text-white hover:bg-white/10"}`}>
            <Hand size={16} />
          </button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button onClick={handleUndo} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"><Undo2 size={16} /></button>
          <button onClick={handleRedo} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"><Redo2 size={16} /></button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button onClick={() => zoomOut()} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-base font-bold">-</button>
          <button onClick={() => fitView()} className="px-2 py-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xs min-w-14 text-center">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => zoomIn()} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-base font-bold">+</button>
        </div>
      </Panel>
    </>
  )
}

const btnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
  background: "rgba(255,255,255,0.05)",
  color: "rgba(255,255,255,0.7)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8, cursor: "pointer",
  padding: "5px 12px", fontSize: 12, fontWeight: 500,
}
