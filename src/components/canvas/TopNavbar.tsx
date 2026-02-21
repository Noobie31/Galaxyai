"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useWorkflowStore } from "@/store/workflowStore"
import { useExecutionStore } from "@/store/executionStore"
import { ArrowLeft, FolderOpen, Share2, Save, Play, Download, Check } from "lucide-react"

interface Props {
  workflowId: string
  saveWorkflow: () => Promise<void>
}

export default function TopNavbar({ workflowId, saveWorkflow }: Props) {
  const router = useRouter()
  const { isRunning } = useExecutionStore()
  const { workflowName, setWorkflowName, nodes, edges, isSaving } = useWorkflowStore()
  const [isEditingName, setIsEditingName] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState(false)
  const [shareFeedback, setShareFeedback] = useState(false)

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
        } catch { alert("Invalid JSON file") }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleExport = () => {
    const { nodes, edges, workflowName } = useWorkflowStore.getState()
    const data = JSON.stringify({ nodes, edges }, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${workflowName || "workflow"}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSave = async () => {
    await saveWorkflow()
    setSaveFeedback(true)
    setTimeout(() => setSaveFeedback(false), 2000)
  }

  const handleShare = async () => {
    // Copy current URL to clipboard - workflow is already saved to DB so URL is shareable
    await navigator.clipboard.writeText(window.location.href)
    setShareFeedback(true)
    setTimeout(() => setShareFeedback(false), 2000)
  }

  const handleRun = async () => {
    if (!workflowId || isRunning) return
    const { runWorkflow } = await import("@/lib/execution-engine")
    runWorkflow(workflowId, nodes, edges, "full")
  }

  const navBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 5,
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.6)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, cursor: "pointer",
    padding: "4px 10px", fontSize: 11, fontWeight: 500,
    flexShrink: 0, whiteSpace: "nowrap" as const,
  }

  return (
    <div style={{
      height: 44, minHeight: 44,
      display: "flex", alignItems: "center",
      padding: "0 16px", gap: 8,
      background: "#111111",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      zIndex: 50, flexShrink: 0,
    }}>
      {/* Back */}
      <button onClick={() => router.push("/dashboard")} style={{
        width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer",
        background: "rgba(147,51,234,0.3)", display: "flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
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
            padding: "2px 8px", fontSize: 13, fontWeight: 600, outline: "none", width: 160,
          }}
        />
      ) : (
        <button onClick={() => setIsEditingName(true)} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 600, padding: 0,
        }}>
          {workflowName}
        </button>
      )}

      <div style={{ flex: 1 }} />

      {/* OPEN */}
      <button onClick={handleOpen} style={navBtnStyle}>
        <FolderOpen size={12} /> OPEN
      </button>

      {/* EXPORT */}
      <button onClick={handleExport} style={navBtnStyle}>
        <Download size={12} /> EXPORT
      </button>

      {/* SHARE - copies URL */}
      <button onClick={handleShare} style={{
        ...navBtnStyle,
        color: shareFeedback ? "#4ade80" : "rgba(255,255,255,0.6)",
        borderColor: shareFeedback ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)",
      }}>
        {shareFeedback ? <Check size={12} /> : <Share2 size={12} />}
        {shareFeedback ? "COPIED!" : "SHARE"}
      </button>

      {/* SAVE */}
      <button onClick={handleSave} disabled={isSaving} style={{
        ...navBtnStyle,
        color: saveFeedback ? "#4ade80" : "rgba(255,255,255,0.6)",
        borderColor: saveFeedback ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)",
      }}>
        {saveFeedback ? <Check size={12} /> : <Save size={12} />}
        {isSaving ? "SAVING..." : saveFeedback ? "SAVED!" : "SAVE"}
      </button>

      {/* RUN */}
      <button onClick={handleRun} disabled={isRunning} style={{
        display: "flex", alignItems: "center", gap: 6,
        background: "#d4f57a", color: "black", border: "none",
        borderRadius: 8, cursor: isRunning ? "not-allowed" : "pointer",
        padding: "5px 16px", fontSize: 12, fontWeight: 700,
        opacity: isRunning ? 0.6 : 1, flexShrink: 0,
      }}>
        <Play size={12} fill="black" />
        {isRunning ? "RUNNING..." : "RUN"}
      </button>
    </div>
  )
}
