"use client"

import { useState, useCallback } from "react"
import { useReactFlow, useViewport, Panel } from "@xyflow/react"
import { useWorkflowStore } from "@/store/workflowStore"
import { useHistoryStore } from "@/store/historyStore"
import { MousePointer2, Hand, Undo2, Redo2 } from "lucide-react"

export default function CanvasToolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const { zoom } = useViewport()
  const [tool, setTool] = useState<"select" | "pan">("select")
  const { undo, redo } = useHistoryStore()

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

  return (
    <Panel position="bottom-center" className="!mb-4">
      <div className="flex items-center gap-1 bg-[#1a1a1a] border border-white/10 rounded-xl px-2 py-1.5 shadow-xl">
        <button
          onClick={() => setTool("select")}
          className={`p-2 rounded-lg transition-colors ${tool === "select" ? "bg-[#d4f57a] text-black" : "text-white/60 hover:text-white hover:bg-white/10"}`}
          title="Select"
        >
          <MousePointer2 size={16} />
        </button>
        <button
          onClick={() => setTool("pan")}
          className={`p-2 rounded-lg transition-colors ${tool === "pan" ? "bg-[#d4f57a] text-black" : "text-white/60 hover:text-white hover:bg-white/10"}`}
          title="Pan"
        >
          <Hand size={16} />
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <button onClick={handleUndo} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <Undo2 size={16} />
        </button>
        <button onClick={handleRedo} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <Redo2 size={16} />
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <button onClick={() => zoomOut()} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-base font-bold leading-none">-</button>
        <button onClick={() => fitView()} className="px-2 py-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xs min-w-14 text-center">
          {Math.round(zoom * 100)}%
        </button>
        <button onClick={() => zoomIn()} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-base font-bold leading-none">+</button>
      </div>
    </Panel>
  )
}
