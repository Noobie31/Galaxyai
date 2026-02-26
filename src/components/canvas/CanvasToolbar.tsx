"use client"

import { useCallback, useState, useRef, useEffect } from "react"
import { useReactFlow, Panel } from "@xyflow/react"
import { useWorkflowStore } from "@/store/workflowStore"
import { useHistoryStore } from "@/store/historyStore"
import { useCanvasToolStore } from "@/store/canvasToolStore"
import { useExecutionStore } from "@/store/executionStore"
import { useRouter } from "next/navigation"
import {
  MousePointer2, Hand, Scissors, Sparkles, Link2,
  Plus, Type, ImageIcon, Video, Brain, Crop, Film,
  Undo2, Redo2, Play, History, Download, Upload,
  ArrowLeft, Share2, Check, ChevronDown, Keyboard,
} from "lucide-react"
import KeyboardShortcutsModal from "./KeyboardShortcutsModal"

// ── Tooltip — appears ABOVE buttons ──
function Tip({ label, shortcut, children }: { label: string; shortcut?: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
          transform: "translateX(-50%)",
          background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 7, padding: "5px 9px",
          fontSize: 12, color: "rgba(255,255,255,0.85)",
          whiteSpace: "nowrap", pointerEvents: "none", zIndex: 9999,
          display: "flex", alignItems: "center", gap: 6,
          boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
        }}>
          {label}
          {shortcut && (
            <span style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 4, padding: "1px 5px", fontSize: 11,
              color: "rgba(255,255,255,0.4)", fontFamily: "monospace",
            }}>{shortcut}</span>
          )}
          <div style={{
            position: "absolute", top: "100%", left: "50%",
            transform: "translateX(-50%)", width: 0, height: 0,
            borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
            borderTop: "5px solid rgba(255,255,255,0.12)",
          }} />
        </div>
      )}
    </div>
  )
}

// ── Node types for + popup ──
const NODE_TYPES = [
  { type: "textNode", label: "Text", icon: Type, color: "#6366f1" },
  { type: "imageUploadNode", label: "Image", icon: ImageIcon, color: "#0ea5e9" },
  { type: "videoUploadNode", label: "Video", icon: Video, color: "#f59e0b" },
  { type: "llmNode", label: "LLM", icon: Brain, color: "#8b5cf6" },
  { type: "cropImageNode", label: "Crop Image", icon: Crop, color: "#10b981" },
  { type: "extractFrameNode", label: "Extract Frame", icon: Film, color: "#f43f5e" },
]

const SAMPLE_NODES = [
  { id: "text-1", type: "textNode", position: { x: 80, y: 80 }, data: { label: "Text", text: "You are a professional marketing copywriter. Generate a compelling one-paragraph product description.", status: "idle" } },
  { id: "text-2", type: "textNode", position: { x: 80, y: 240 }, data: { label: "Text", text: "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.", status: "idle" } },
  { id: "img-1", type: "imageUploadNode", position: { x: 80, y: 420 }, data: { label: "Upload Image", status: "idle" } },
  { id: "video-1", type: "videoUploadNode", position: { x: 80, y: 600 }, data: { label: "Upload Video", status: "idle" } },
  { id: "crop-1", type: "cropImageNode", position: { x: 480, y: 420 }, data: { label: "Crop Image", xPercent: 10, yPercent: 10, widthPercent: 80, heightPercent: 80, connectedHandles: ["image_url"], status: "idle" } },
  { id: "extract-1", type: "extractFrameNode", position: { x: 480, y: 600 }, data: { label: "Extract Frame", timestamp: "50%", connectedHandles: ["video_url"], status: "idle" } },
  { id: "llm-1", type: "llmNode", position: { x: 880, y: 200 }, data: { label: "LLM - Product Description", model: "gemini-2.5-flash", connectedHandles: ["system_prompt", "user_message", "images"], status: "idle" } },
  { id: "text-3", type: "textNode", position: { x: 880, y: 80 }, data: { label: "Text", text: "You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.", status: "idle" } },
  { id: "llm-2", type: "llmNode", position: { x: 1280, y: 400 }, data: { label: "LLM - Final Post", model: "gemini-2.5-flash", connectedHandles: ["system_prompt", "user_message", "images"], status: "idle" } },
]

const SAMPLE_EDGES = [
  { id: "e1", source: "img-1", target: "crop-1", targetHandle: "image_url", animated: true, type: "default", style: { stroke: "#a855f7", strokeWidth: 2 } },
  { id: "e2", source: "video-1", target: "extract-1", targetHandle: "video_url", animated: true, type: "default", style: { stroke: "#a855f7", strokeWidth: 2 } },
  { id: "e3", source: "text-1", target: "llm-1", targetHandle: "system_prompt", animated: true, type: "default", style: { stroke: "#a855f7", strokeWidth: 2 } },
  { id: "e4", source: "text-2", target: "llm-1", targetHandle: "user_message", animated: true, type: "default", style: { stroke: "#a855f7", strokeWidth: 2 } },
  { id: "e5", source: "crop-1", target: "llm-1", targetHandle: "images", animated: true, type: "default", style: { stroke: "#a855f7", strokeWidth: 2 } },
  { id: "e6", source: "text-3", target: "llm-2", targetHandle: "system_prompt", animated: true, type: "default", style: { stroke: "#a855f7", strokeWidth: 2 } },
  { id: "e7", source: "llm-1", target: "llm-2", targetHandle: "user_message", animated: true, type: "default", style: { stroke: "#a855f7", strokeWidth: 2 } },
  { id: "e8", source: "crop-1", target: "llm-2", targetHandle: "images", animated: true, type: "default", style: { stroke: "#a855f7", strokeWidth: 2 } },
  { id: "e9", source: "extract-1", target: "llm-2", targetHandle: "images", animated: true, type: "default", style: { stroke: "#a855f7", strokeWidth: 2 } },
]

function usePopupClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    setTimeout(() => document.addEventListener("mousedown", h), 50)
    return () => document.removeEventListener("mousedown", h)
  }, [open, onClose])
  return ref
}

function AddNodePopup({ onAdd, onClose }: { onAdd: (type: string) => void; onClose: () => void }) {
  const ref = usePopupClose(true, onClose)
  return (
    <div ref={ref} style={{
      position: "absolute", bottom: "calc(100% + 10px)", left: "50%",
      transform: "translateX(-50%)",
      background: "#141414", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12, padding: "6px", width: 210, zIndex: 9999,
      boxShadow: "0 -4px 32px rgba(0,0,0,0.7)",
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 8px 6px", margin: 0 }}>
        Add Node
      </p>
      {NODE_TYPES.map((n) => {
        const Icon = n.icon
        return (
          <button key={n.type} onClick={() => { onAdd(n.type); onClose() }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "7px 8px", border: "none", borderRadius: 7,
              background: "none", cursor: "pointer", color: "rgba(255,255,255,0.65)", fontSize: 13,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "white" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,0.65)" }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
              background: n.color + "22", border: `1px solid ${n.color}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={12} style={{ color: n.color }} />
            </div>
            {n.label}
          </button>
        )
      })}
    </div>
  )
}

function PresetsPopup({ onLoad, onClose }: { onLoad: () => void; onClose: () => void }) {
  const ref = usePopupClose(true, onClose)
  return (
    <div ref={ref} style={{
      position: "absolute", bottom: "calc(100% + 10px)", left: "50%",
      transform: "translateX(-50%)",
      background: "#141414", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12, padding: "6px", width: 240, zIndex: 9999,
      boxShadow: "0 -4px 32px rgba(0,0,0,0.7)",
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 8px 6px", margin: 0 }}>
        Templates
      </p>
      <button onClick={() => { onLoad(); onClose() }}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "9px 8px", border: "none", borderRadius: 7,
          background: "none", cursor: "pointer", textAlign: "left",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.25))",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <path d="M10 6.5h4M17.5 10v4" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: "white", margin: "0 0 2px" }}>Product Marketing Kit</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>9 nodes · Full parallel pipeline</p>
        </div>
      </button>
    </div>
  )
}

const NodesIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="7" cy="7" r="2" /><circle cx="17" cy="7" r="2" />
    <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
    <path d="M9 7h6M7 9v6M17 9v6M9 17h6" />
  </svg>
)

// Reusable floating pill button style
const pillStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 5,
  background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8,
  padding: "0 10px", height: 32,
  color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 500,
  cursor: "pointer",
}

export default function CanvasToolbar({
  onHistoryToggle,
  showHistory,
}: {
  onHistoryToggle?: () => void
  showHistory?: boolean
}) {
  const { addNodes, fitView } = useReactFlow()
  const { activeTool, setActiveTool } = useCanvasToolStore()
  const { undo, redo, past, future } = useHistoryStore()
  const { workflowName, setWorkflowName, isSaving, nodes, edges } = useWorkflowStore()
  const { isRunning } = useExecutionStore()
  const router = useRouter()

  const [addOpen, setAddOpen] = useState(false)
  const [presetsOpen, setPresetsOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [shareOk, setShareOk] = useState(false)
  const [exportOk, setExportOk] = useState(false)
  const [logoMenuOpen, setLogoMenuOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const logoMenuRef = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  // Close logo menu on outside click
  useEffect(() => {
    if (!logoMenuOpen) return
    const h = (e: MouseEvent) => {
      if (logoMenuRef.current && !logoMenuRef.current.contains(e.target as Node)) setLogoMenuOpen(false)
    }
    setTimeout(() => document.addEventListener("mousedown", h), 50)
    return () => document.removeEventListener("mousedown", h)
  }, [logoMenuOpen])

  const handleExport = () => {
    const { nodes, edges, workflowName } = useWorkflowStore.getState()
    const data = { name: workflowName, nodes, edges, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${workflowName || "workflow"}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExportOk(true)
    setTimeout(() => setExportOk(false), 2000)
    setLogoMenuOpen(false)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!data.nodes || !data.edges) throw new Error("Invalid workflow JSON")
        if (data.name) useWorkflowStore.getState().setWorkflowName(data.name)
        useWorkflowStore.getState().setNodes(data.nodes)
        useWorkflowStore.getState().setEdges(data.edges)
        fitView({ duration: 500, padding: 0.1 })
      } catch {
        alert("Invalid workflow file.")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href).catch(() => { })
    setShareOk(true)
    setTimeout(() => setShareOk(false), 2000)
    setLogoMenuOpen(false)
  }

  const handleUndo = () => {
    const { nodes, edges } = useWorkflowStore.getState()
    const entry = undo({ nodes, edges })
    if (entry) {
      useWorkflowStore.getState().setNodes(entry.nodes)
      useWorkflowStore.getState().setEdges(entry.edges)
    }
  }

  const handleRedo = () => {
    const { nodes, edges } = useWorkflowStore.getState()
    const entry = redo({ nodes, edges })
    if (entry) {
      useWorkflowStore.getState().setNodes(entry.nodes)
      useWorkflowStore.getState().setEdges(entry.edges)
    }
  }

  const handleAddNode = (type: string) => {
    addNodes({
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 200 + Math.random() * 300, y: 200 + Math.random() * 200 },
      data: {
        ...({
          textNode: { label: "Text", text: "", status: "idle" },
          imageUploadNode: { label: "Upload Image", status: "idle" },
          videoUploadNode: { label: "Upload Video", status: "idle" },
          llmNode: { label: "Run Any LLM", model: "gemini-2.5-flash", status: "idle", connectedHandles: [] },
          cropImageNode: { label: "Crop Image", xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100, connectedHandles: [], status: "idle" },
          extractFrameNode: { label: "Extract Frame", timestamp: "0", connectedHandles: [], status: "idle" },
        }[type] || { label: type, status: "idle" }),
      },
    })
  }

  const handleLoadSample = () => {
    useWorkflowStore.getState().setNodes(SAMPLE_NODES as any)
    useWorkflowStore.getState().setEdges(SAMPLE_EDGES as any)
    fitView({ duration: 500, padding: 0.1 })
  }

  const handleRunAll = async () => {
    const { workflowId } = useWorkflowStore.getState()
    if (!workflowId || isRunning) return
    const { runWorkflow } = await import("@/lib/execution-engine")
    runWorkflow(workflowId, nodes, edges, "full")
  }

  const ToolBtn = ({ children, isActive, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}
      style={{
        width: 34, height: 32,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isActive ? "rgba(255,255,255,0.12)" : "none",
        border: "none", cursor: disabled ? "not-allowed" : "pointer", borderRadius: 10,
        color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
        opacity: disabled ? 0.3 : 1, flexShrink: 0,
      }}
      onMouseEnter={(e) => { if (!isActive && !disabled) { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)" } }}
      onMouseLeave={(e) => { if (!isActive && !disabled) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,0.4)" } }}
    >
      {children}
    </button>
  )

  const tools = [
    { id: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
    { id: "pan", icon: Hand, label: "Pan", shortcut: "H" },
    { id: "cut", icon: Scissors, label: "Cut Connections", shortcut: "X" },
    { id: "magic", icon: Sparkles, label: "Magic" },
    { id: "connect", icon: Link2, label: "Connect" },
  ]

  const logoMenuItems = [
    { icon: ArrowLeft, label: "Back to Dashboard", onClick: () => { router.push("/dashboard"); setLogoMenuOpen(false) } },
    null,
    { icon: Upload, label: "Import", onClick: () => { importRef.current?.click(); setLogoMenuOpen(false) } },
    { icon: exportOk ? Check : Download, label: exportOk ? "Exported!" : "Export as JSON", onClick: handleExport, highlight: exportOk },
    { icon: shareOk ? Check : Share2, label: shareOk ? "Copied!" : "Copy share link", onClick: handleShare, highlight: shareOk },
  ]

  return (
    <>
      {/* ── TOP LEFT: Logo dropdown + workflow name ── */}
      <Panel position="top-left" style={{ margin: "10px 0 0 10px", pointerEvents: "all" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>

          {/* Logo dropdown */}
          <div ref={logoMenuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setLogoMenuOpen((v) => !v)}
              style={{
                ...pillStyle,
                paddingLeft: 6, paddingRight: 8, gap: 6,
                background: logoMenuOpen ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.6)",
              }}
            >
              {/* Logo mark */}
              <div style={{
                width: 22, height: 22, background: "white", borderRadius: 6,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ color: "black", fontWeight: 900, fontSize: 11 }}>N</span>
              </div>
              <ChevronDown
                size={12}
                style={{
                  color: "rgba(255,255,255,0.35)",
                  transform: logoMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s",
                }}
              />
            </button>

            {/* Dropdown */}
            {logoMenuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", left: 0,
                background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12, padding: 6, minWidth: 210, zIndex: 9999,
                boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
              }}>
                {logoMenuItems.map((item, i) =>
                  item === null ? (
                    <div key={i} style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "4px 0" }} />
                  ) : (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 10px", border: "none", borderRadius: 8,
                        background: "none", cursor: "pointer", textAlign: "left",
                        color: (item as any).highlight ? "#4ade80" : "rgba(255,255,255,0.65)",
                        fontSize: 13,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = (item as any).highlight ? "#4ade80" : "white" }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = (item as any).highlight ? "#4ade80" : "rgba(255,255,255,0.65)" }}
                    >
                      <item.icon size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
                      {item.label}
                    </button>
                  )
                )}
              </div>
            )}

            <input ref={importRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleImport} />
          </div>

          {/* Breadcrumb separator */}
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 16 }}>›</span>

          {/* Workflow name */}
          {editingName ? (
            <input autoFocus value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingName(false) }}
              style={{
                ...pillStyle,
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                color: "white", fontSize: 13, fontWeight: 500, outline: "none", width: 180,
                padding: "0 10px",
              } as any}
            />
          ) : (
            <button onClick={() => setEditingName(true)} style={{ ...pillStyle }}>
              <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
                {workflowName || "Untitled"}
              </span>
              {isSaving && (
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.3)", display: "inline-block", marginLeft: 2 }} />
              )}
            </button>
          )}
        </div>
      </Panel>

      {/* ── TOP RIGHT: Run All + History toggle ── */}
      <Panel position="top-right" style={{ margin: "10px 10px 0 0", pointerEvents: "all" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>

          {/* History toggle */}
          <button
            onClick={onHistoryToggle}
            style={{
              ...pillStyle,
              background: showHistory ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.6)",
              border: `1px solid ${showHistory ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.09)"}`,
              color: showHistory ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
            }}
          >
            <History size={13} />
            History
          </button>

          {/* Run All */}
          <button
            onClick={handleRunAll}
            disabled={isRunning}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: isRunning ? "rgba(255,255,255,0.08)" : "white",
              color: isRunning ? "rgba(255,255,255,0.35)" : "black",
              border: "none", borderRadius: 8,
              cursor: isRunning ? "not-allowed" : "pointer",
              padding: "0 14px", height: 32,
              fontSize: 13, fontWeight: 600,
              transition: "all 0.15s",
            }}
          >
            {isRunning ? (
              <>
                <div style={{
                  width: 11, height: 11,
                  border: "2px solid rgba(0,0,0,0.2)",
                  borderTop: "2px solid rgba(0,0,0,0.6)",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }} />
                Running...
              </>
            ) : (
              <>
                <Play size={11} fill="black" />
                Run All
              </>
            )}
          </button>

          {/* Turn into app */}
          <button style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#2563eb", border: "none", borderRadius: 8,
            padding: "0 14px", height: 32,
            color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Turn into app
          </button>
        </div>
      </Panel>

      {/* ── BOTTOM LEFT: Undo/Redo + Keyboard shortcuts ── */}
      <Panel position="bottom-left" style={{ margin: "0 0 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Undo / Redo */}
          <div style={{
            display: "flex", alignItems: "center",
            background: "#141414", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: "4px",
          }}>
            <Tip label="Undo" shortcut="Ctrl+Z">
              <ToolBtn isActive={false} onClick={handleUndo} disabled={past.length === 0}>
                <Undo2 size={13} />
              </ToolBtn>
            </Tip>
            <Tip label="Redo" shortcut="Ctrl+Shift+Z">
              <ToolBtn isActive={false} onClick={handleRedo} disabled={future.length === 0}>
                <Redo2 size={13} />
              </ToolBtn>
            </Tip>
          </div>

          {/* Keyboard shortcuts button */}
          <button
            onClick={() => setShortcutsOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#141414", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "0 12px", height: 40,
              color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#141414"; e.currentTarget.style.color = "rgba(255,255,255,0.4)" }}
          >
            <Keyboard size={13} />
            Keyboard shortcuts
          </button>
        </div>
      </Panel>

      {/* ── BOTTOM CENTER: Main toolbar ── */}
      <Panel position="bottom-center" style={{ margin: "0 0 16px 0" }}>
        <div style={{
          display: "flex", alignItems: "center",
          background: "#141414", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20, padding: "4px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
        }}>
          {/* + Add node */}
          <Tip label="Add Node">
            <div style={{ position: "relative" }}>
              <ToolBtn isActive={addOpen} onClick={() => { setAddOpen(!addOpen); setPresetsOpen(false) }}>
                <Plus size={16} />
              </ToolBtn>
              {addOpen && <AddNodePopup onAdd={handleAddNode} onClose={() => setAddOpen(false)} />}
            </div>
          </Tip>

          {tools.map((t) => {
            const Icon = t.icon
            return (
              <Tip key={t.id} label={t.label} shortcut={t.shortcut}>
                <ToolBtn isActive={activeTool === t.id} onClick={() => setActiveTool(t.id as any)}>
                  <Icon size={15} />
                </ToolBtn>
              </Tip>
            )
          })}

          {/* Presets / Templates */}
          <Tip label="Templates">
            <div style={{ position: "relative" }}>
              <ToolBtn isActive={presetsOpen} onClick={() => { setPresetsOpen(!presetsOpen); setAddOpen(false) }}>
                <NodesIcon />
              </ToolBtn>
              {presetsOpen && <PresetsPopup onLoad={handleLoadSample} onClose={() => setPresetsOpen(false)} />}
            </div>
          </Tip>
        </div>
      </Panel>

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .cut-mode .react-flow__edge:hover .react-flow__edge-path {
          stroke: #f43f5e !important;
          stroke-width: 3 !important;
          cursor: crosshair !important;
        }
      `}</style>
    </>
  )
}
