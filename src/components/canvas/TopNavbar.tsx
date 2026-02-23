"use client"

import { useState } from "react"
import { useWorkflowStore } from "@/store/workflowStore"
import { useExecutionStore } from "@/store/executionStore"
import { Play, Share2, Check, Moon } from "lucide-react"
import LogoDropdown from "@/components/canvas/LogoDropdown"
import KeyboardShortcutsModal from "@/components/canvas/KeyboardShortcutsModal"

interface Props {
  workflowId: string
  saveWorkflow: () => Promise<void>
}

export default function TopNavbar({ workflowId, saveWorkflow }: Props) {
  const { isRunning } = useExecutionStore()
  const { workflowName, setWorkflowName, nodes, edges, isSaving } = useWorkflowStore()
  const [isEditingName, setIsEditingName] = useState(false)
  const [shareFeedback, setShareFeedback] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setShareFeedback(true)
    setTimeout(() => setShareFeedback(false), 2000)
  }

  const handleRun = async () => {
    if (!workflowId || isRunning) return
    const { runWorkflow } = await import("@/lib/execution-engine")
    runWorkflow(workflowId, nodes, edges, "full")
  }

  // Ctrl+S to save
  if (typeof window !== "undefined") {
    // handled via useEffect in WorkflowClient
  }

  return (
    <>
      <div style={{
        height: 48, minHeight: 48,
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        background: "#0a0a0a",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        zIndex: 50, flexShrink: 0,
      }}>
        {/* Left: Logo dropdown + workflow name */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LogoDropdown workflowName={workflowName} />

          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 16, lineHeight: 1 }}>›</span>

          {/* Workflow name */}
          {isEditingName ? (
            <input
              autoFocus
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setIsEditingName(false)
                if (e.key === "Escape") setIsEditingName(false)
              }}
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 14, fontWeight: 500,
                outline: "none", width: 200,
              }}
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "none", border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.85)",
                fontSize: 14, fontWeight: 500,
                padding: "4px 6px", borderRadius: 6,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              {workflowName}
            </button>
          )}

          {isSaving && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
              Saving...
            </span>
          )}
        </div>

        {/* Right: actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* Dark mode toggle */}
          <button
            style={{
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "none", border: "none", cursor: "pointer",
              borderRadius: 8, color: "rgba(255,255,255,0.4)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            title="Toggle theme"
          >
            <Moon size={15} />
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: shareFeedback ? "#4ade80" : "rgba(255,255,255,0.55)",
              fontSize: 13, fontWeight: 500,
              padding: "5px 10px", borderRadius: 8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            {shareFeedback ? <Check size={13} /> : (
              // Diamond/share icon like Krea
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M11 4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM3 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM11 12.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" stroke="currentColor" strokeWidth="1.2" />
                <path d="M4.5 7.5L9.5 10M9.5 4L4.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            )}
            {shareFeedback ? "Copied!" : "Share"}
          </button>

          {/* Run */}
          <button
            onClick={handleRun}
            disabled={isRunning}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: isRunning ? "rgba(255,255,255,0.08)" : "white",
              color: isRunning ? "rgba(255,255,255,0.35)" : "black",
              border: "none", borderRadius: 8,
              cursor: isRunning ? "not-allowed" : "pointer",
              padding: "6px 14px", fontSize: 13, fontWeight: 600,
              transition: "all 0.15s",
            }}
          >
            {isRunning ? (
              <>
                <div style={{
                  width: 11, height: 11,
                  border: "2px solid rgba(255,255,255,0.15)",
                  borderTop: "2px solid rgba(255,255,255,0.5)",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }} />
                Running...
              </>
            ) : (
              <>
                <Play size={11} fill="black" />
                Run
              </>
            )}
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />

          {/* Version history icon */}
          <button
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer", borderRadius: 8,
              padding: "5px 10px",
              color: "rgba(255,255,255,0.5)",
              fontSize: 12,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            title="Version history"
          >
            {/* Clock icon */}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M6.5 4v2.5l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M2 4l3.5 3.5L9 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}