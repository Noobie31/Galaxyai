"use client"

import { useState, useCallback } from "react"
import { useReactFlow, useViewport, Panel } from "@xyflow/react"
import { useWorkflowStore } from "@/store/workflowStore"
import { useHistoryStore } from "@/store/historyStore"
import { useExecutionStore } from "@/store/executionStore"
import {
  MousePointer2,
  Hand,
  Undo2,
  Redo2,
  Play,
  Save,
  Upload,
  Download,
  ArrowLeft,
} from "lucide-react"
import { useRouter } from "next/navigation"

export default function CanvasToolbar() {
  const router = useRouter()
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const { zoom } = useViewport()
  const [tool, setTool] = useState<"select" | "pan">("select")
  const {
    nodes,
    edges,
    workflowName,
    setWorkflowName,
    workflowId,
    isSaving,
    setIsSaving,
    setLastSaved,
  } = useWorkflowStore()
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
        body: JSON.stringify({
          name: state.workflowName,
          nodes: state.nodes,
          edges: state.edges,
        }),
      })
      setLastSaved(new Date())
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = () => {
    const data = JSON.stringify({ nodes, edges }, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${workflowName}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
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
        } catch (err) {
          console.error("Invalid JSON file")
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleRun = async () => {
    if (!workflowId || isRunning) return
    const { runWorkflow } = await import("@/lib/execution-engine")
    runWorkflow(workflowId, nodes, edges, "full")
  }

  return (
    <>
      {/* Top Bar */}
      <Panel
        position="top-left"
        className="!m-0 !p-0"
        style={{ width: "100vw" }}
      >
        <div className="flex items-center gap-2 bg-[#111111] border-b border-white/5 px-4 py-2 w-full">
          {/* Back */}
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors mr-1"
          >
            <ArrowLeft size={16} />
          </button>

          {/* Workflow Name */}
          {isEditingName ? (
            <input
              autoFocus
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setIsEditingName(false)
              }}
              className="bg-white/10 text-sm font-medium px-2 py-1 rounded outline-none border border-white/20 w-40"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-sm font-medium text-white/80 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors"
            >
              {workflowName}
            </button>
          )}

          <div className="flex-1" />

          {/* Buttons */}
          <button
            onClick={handleImport}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-white/10 rounded-lg transition-colors"
          >
            <Upload size={13} />
            Open
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-white/10 rounded-lg transition-colors"
          >
            <Download size={13} />
            Export
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-white/10 rounded-lg transition-colors disabled:opacity-60"
          >
            <Save size={13} />
            {isSaving ? "Saving..." : "Save"}
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 text-sm px-4 py-1.5 bg-[#d4f57a] hover:bg-[#c8ec6a] text-black font-semibold rounded-lg transition-colors disabled:opacity-60"
          >
            <Play size={14} />
            {isRunning ? "Running..." : "Run"}
          </button>
        </div>
      </Panel>

      {/* Bottom Toolbar */}
      <Panel position="bottom-center" className="!mb-4">
        <div className="flex items-center gap-1 bg-[#1a1a1a] border border-white/10 rounded-xl px-2 py-1.5 shadow-xl">
          <button
            onClick={() => setTool("select")}
            className={`p-2 rounded-lg transition-colors ${
              tool === "select"
                ? "bg-[#d4f57a] text-black"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
            title="Select"
          >
            <MousePointer2 size={16} />
          </button>

          <button
            onClick={() => setTool("pan")}
            className={`p-2 rounded-lg transition-colors ${
              tool === "pan"
                ? "bg-[#d4f57a] text-black"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
            title="Pan"
          >
            <Hand size={16} />
          </button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <button
            onClick={handleUndo}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Undo"
          >
            <Undo2 size={16} />
          </button>

          <button
            onClick={handleRedo}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Redo"
          >
            <Redo2 size={16} />
          </button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <button
            onClick={() => zoomOut()}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors font-bold"
          >
            -
          </button>
          <button
            onClick={() => fitView()}
            className="px-2 py-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xs min-w-14 text-center"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => zoomIn()}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors font-bold"
          >
            +
          </button>
        </div>
      </Panel>
    </>
  )
}
