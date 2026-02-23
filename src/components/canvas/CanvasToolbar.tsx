"use client"

import { useCallback, useState, useRef, useEffect } from "react"
import { useReactFlow, useViewport, Panel } from "@xyflow/react"
import { useWorkflowStore } from "@/store/workflowStore"
import { useHistoryStore } from "@/store/historyStore"
import { useCanvasToolStore } from "@/store/canvasToolStore"
import { useRouter } from "next/navigation"
import { useClerk } from "@clerk/nextjs"
import {
  MousePointer2, Hand, Scissors, Sparkles,
  Plus, Type, ImageIcon, Video, Brain, Crop, Film,
  Undo2, Redo2, ArrowLeft, Moon, Sun, Share2, Check,
} from "lucide-react"

// ── Tooltip — appears ABOVE toolbar buttons ──
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
  { id: "llm-1", type: "llmNode", position: { x: 880, y: 200 }, data: { label: "LLM - Product Description", model: "gemini-2.0-flash", connectedHandles: ["system_prompt", "user_message", "images"], status: "idle" } },
  { id: "text-3", type: "textNode", position: { x: 880, y: 80 }, data: { label: "Text", text: "You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.", status: "idle" } },
  { id: "llm-2", type: "llmNode", position: { x: 1280, y: 400 }, data: { label: "LLM - Final Post", model: "gemini-2.0-flash", connectedHandles: ["system_prompt", "user_message", "images"], status: "idle" } },
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

interface ToolbarProps {
  onHistoryToggle: () => void
}

export default function CanvasToolbar({ onHistoryToggle }: ToolbarProps) {
  const { addNodes, fitView } = useReactFlow()
  const { zoom } = useViewport()
  const { activeTool, setActiveTool } = useCanvasToolStore()
  const { undo, redo, past, future } = useHistoryStore()
  const { workflowName, setWorkflowName, isSaving } = useWorkflowStore()
  const router = useRouter()

  const [addOpen, setAddOpen] = useState(false)
  const [presetsOpen, setPresetsOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [shareOk, setShareOk] = useState(false)
  const [historyActive, setHistoryActive] = useState(false)

  const handleUndo = () => {
    const entry = undo()
    if (entry) {
      useWorkflowStore.getState().setNodes(entry.nodes)
      useWorkflowStore.getState().setEdges(entry.edges)
    }
  }

  const handleRedo = () => {
    const entry = redo()
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
      data: { ...({ textNode: { label: "Text", text: "", status: "idle" }, imageUploadNode: { label: "Upload Image", status: "idle" }, videoUploadNode: { label: "Upload Video", status: "idle" }, llmNode: { label: "Run Any LLM", model: "gemini-2.0-flash", status: "idle", connectedHandles: [] }, cropImageNode: { label: "Crop Image", xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100, connectedHandles: [], status: "idle" }, extractFrameNode: { label: "Extract Frame", timestamp: "0", connectedHandles: [], status: "idle" } }[type] || { label: type, status: "idle" }) },
    })
  }

  // Load the sample workflow directly into the store (no API needed)
  const handleLoadSample = () => {
    useWorkflowStore.getState().setNodes(SAMPLE_NODES as any)
    useWorkflowStore.getState().setEdges(SAMPLE_EDGES as any)
    fitView({ duration: 500, padding: 0.1 })
  }

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href).catch(() => { })
    setShareOk(true)
    setTimeout(() => setShareOk(false), 2000)
  }

  const toggleDarkMode = () => {
    setDarkMode((d) => {
      const next = !d
      document.documentElement.style.setProperty("--bg", next ? "#0a0a0a" : "#f5f5f5")
      document.body.style.background = next ? "#0a0a0a" : "#f5f5f5"
      return next
    })
  }

  const handleHistoryToggle = () => {
    setHistoryActive((v) => !v)
    onHistoryToggle()
  }

  const ToolBtn = ({ children, isActive, onClick, disabled, title }: any) => (
    <button onClick={onClick} disabled={disabled} title={title}
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

  const topBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 5,
    background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8,
    padding: "0 10px", height: 32,
    color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 500, cursor: "pointer",
  }

  const tools = [
    { id: "select", icon: MousePointer2, label: "Select" },
    { id: "pan", icon: Hand, label: "Pan" },
    { id: "cut", icon: Scissors, label: "Cut Connections" },
    { id: "magic", icon: Sparkles, label: "Magic" },
  ]

  return (
    <>
      {/* ── TOP OVERLAY: workflow name left + controls right ── */}
      <Panel position="top-left" style={{ margin: "10px 0 0 10px", pointerEvents: "all" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Back to dashboard */}
          <button
            onClick={() => router.push("/dashboard")}
            style={{ ...topBtnStyle, paddingLeft: 8, paddingRight: 8 }}
            title="Back to Dashboard"
          >
            <ArrowLeft size={14} />
          </button>

          {/* Logo + workflow name */}
          {editingName ? (
            <input autoFocus value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingName(false) }}
              style={{
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8, padding: "4px 10px", color: "white", fontSize: 13,
                fontWeight: 500, outline: "none", width: 180,
              }}
            />
          ) : (
            <button onClick={() => setEditingName(true)} style={{ ...topBtnStyle, gap: 8 }}>
              <div style={{
                width: 20, height: 20, background: "white", borderRadius: 5,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ color: "black", fontWeight: 900, fontSize: 10 }}>N</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>›</span>
              <span style={{ color: "rgba(255,255,255,0.8)" }}>{workflowName || "Untitled"}</span>
              {isSaving && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.3)", display: "inline-block" }} />}
            </button>
          )}
        </div>
      </Panel>

      <Panel position="top-right" style={{ margin: "10px 10px 0 0", pointerEvents: "all" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Dark mode toggle */}
          <button onClick={toggleDarkMode} style={{ ...topBtnStyle, width: 32, padding: 0, justifyContent: "center" }} title="Toggle dark mode">
            {darkMode ? <Moon size={13} /> : <Sun size={13} />}
          </button>

          {/* Share */}
          <button onClick={handleShare} style={{ ...topBtnStyle, color: shareOk ? "#4ade80" : "rgba(255,255,255,0.55)" }}>
            {shareOk ? <Check size={13} /> : <Share2 size={13} />}
            {shareOk ? "Copied!" : "Share"}
          </button>

          {/* Version History toggle */}
          <button
            onClick={handleHistoryToggle}
            style={{ ...topBtnStyle, background: historyActive ? "rgba(99,102,241,0.15)" : "rgba(0,0,0,0.55)", borderColor: historyActive ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.09)", color: historyActive ? "#a78bfa" : "rgba(255,255,255,0.55)" }}
            title="Version History"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" strokeLinecap="round" />
            </svg>
            Version History
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
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
            Turn workflow into app
          </button>
        </div>
      </Panel>

      {/* ── BOTTOM LEFT: undo/redo ── */}
      <Panel position="bottom-left" style={{ margin: "0 0 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            display: "flex", alignItems: "center",
            background: "#141414", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: "4px",
          }}>
            <Tip label="Undo">
              <ToolBtn isActive={false} onClick={handleUndo} disabled={past.length === 0} title="Undo">
                <Undo2 size={13} />
              </ToolBtn>
            </Tip>
            <Tip label="Redo">
              <ToolBtn isActive={false} onClick={handleRedo} disabled={future.length === 0} title="Redo">
                <Redo2 size={13} />
              </ToolBtn>
            </Tip>
          </div>

          <button style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#141414", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: "7px 12px",
            color: "rgba(255,255,255,0.28)", fontSize: 12, cursor: "default",
          }}>
            <span style={{ fontFamily: "monospace" }}>⌘</span> Keyboard shortcuts
          </button>
        </div>
      </Panel>

      {/* ── BOTTOM CENTER: main toolbar ── */}
      <Panel position="bottom-center" style={{ margin: "0 0 16px 0" }}>
        <div style={{
          display: "flex", alignItems: "center",
          background: "#141414", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20, padding: "4px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
        }}>
          {/* + Add node */}
          <Tip label="New Node">
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
              <Tip key={t.id} label={t.label}>
                <ToolBtn isActive={activeTool === t.id} onClick={() => setActiveTool(t.id as any)}>
                  <Icon size={15} />
                </ToolBtn>
              </Tip>
            )
          })}

          {/* Presets */}
          <Tip label="Presets / Templates">
            <div style={{ position: "relative" }}>
              <ToolBtn isActive={presetsOpen} onClick={() => { setPresetsOpen(!presetsOpen); setAddOpen(false) }}>
                <NodesIcon />
              </ToolBtn>
              {presetsOpen && <PresetsPopup onLoad={handleLoadSample} onClose={() => setPresetsOpen(false)} />}
            </div>
          </Tip>
        </div>
      </Panel>
    </>
  )
}