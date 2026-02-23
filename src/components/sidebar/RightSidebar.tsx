"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useExecutionStore } from "@/store/executionStore"
import { X, ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, Loader2, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface NodeExecution {
  id: string
  nodeId: string
  nodeType: string
  status: string
  inputs: any
  outputs: any
  error: string | null
  duration: number | null
  createdAt: string
}

interface Run {
  id: string
  status: string
  scope: string
  createdAt: string
  duration: number | null
  nodeExecutions: NodeExecution[]
}

interface Props {
  workflowId: string
  onClose: () => void
}

export default function RightSidebar({ workflowId, onClose }: Props) {
  const { isRunning } = useExecutionStore()
  const [runs, setRuns] = useState<Run[]>([])
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [expandedNode, setExpandedNode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const fetchRuns = useCallback(async () => {
    if (!workflowId) return
    setLoading(true)
    try {
      // Try both possible API endpoints
      const res = await fetch(`/api/runs?workflowId=${workflowId}`)
      if (res.ok) {
        const data = await res.json()
        setRuns(Array.isArray(data) ? data : [])
      } else {
        // Fallback to workflow-specific endpoint
        const res2 = await fetch(`/api/workflows/${workflowId}/runs`)
        if (res2.ok) {
          const data2 = await res2.json()
          setRuns(Array.isArray(data2) ? data2 : [])
        }
      }
    } catch (e) {
      console.error("Failed to fetch run history", e)
    } finally {
      setLoading(false)
    }
  }, [workflowId])

  // Initial fetch
  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  // Poll only while running, then fetch once more on completion
  useEffect(() => {
    if (isRunning) {
      pollRef.current = setInterval(fetchRuns, 3000)
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      // Fetch once when run finishes to get latest results
      fetchRuns()
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [isRunning, fetchRuns])

  const getStatusIcon = (status: string) => {
    if (status === "success") return <CheckCircle size={12} style={{ color: "#4ade80", flexShrink: 0 }} />
    if (status === "failed") return <XCircle size={12} style={{ color: "#f87171", flexShrink: 0 }} />
    if (status === "running") return <Loader2 size={12} style={{ color: "#facc15", flexShrink: 0, animation: "spin 1s linear infinite" }} />
    return <Clock size={12} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { color: string; bg: string }> = {
      success: { color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
      failed: { color: "#f87171", bg: "rgba(248,113,113,0.1)" },
      running: { color: "#facc15", bg: "rgba(250,204,21,0.1)" },
    }
    const s = colors[status] || { color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.05)" }
    return (
      <span style={{
        fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
        textTransform: "uppercase", letterSpacing: "0.05em",
        color: s.color, background: s.bg,
      }}>
        {status}
      </span>
    )
  }

  const getScopeLabel = (scope: string) => {
    if (scope === "full") return "Full Workflow"
    if (scope === "single") return "Single Node"
    return "Selected Nodes"
  }

  const formatMs = (ms: number | null) => {
    if (!ms) return ""
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
  }

  const getNodeLabel = (type: string) => {
    const labels: Record<string, string> = {
      textNode: "Text Node",
      imageUploadNode: "Upload Image",
      videoUploadNode: "Upload Video",
      llmNode: "LLM Node",
      cropImageNode: "Crop Image",
      extractFrameNode: "Extract Frame",
    }
    return labels[type] || type
  }

  const formatOutput = (outputs: any): string => {
    if (!outputs) return "—"
    const out = outputs.output ?? outputs
    if (typeof out === "string") return out.length > 120 ? out.slice(0, 120) + "..." : out
    return JSON.stringify(out).slice(0, 120)
  }

  const formatInputSummary = (inputs: any): string => {
    if (!inputs || typeof inputs !== "object") return "—"
    const parts: string[] = []
    if (inputs.text) parts.push(`"${String(inputs.text).slice(0, 40)}..."`)
    if (inputs.model) parts.push(`model: ${inputs.model}`)
    if (inputs.image_url) parts.push("image: [url]")
    if (inputs.video_url) parts.push("video: [url]")
    if (inputs.x_percent !== undefined) parts.push(`crop: ${inputs.x_percent}%,${inputs.y_percent}% ${inputs.width_percent}×${inputs.height_percent}%`)
    if (inputs.timestamp) parts.push(`t: ${inputs.timestamp}`)
    return parts.join(" · ") || "—"
  }

  return (
    <div style={{
      width: 300, flexShrink: 0,
      background: "#0d0d0d",
      borderLeft: "1px solid rgba(255,255,255,0.06)",
      display: "flex", flexDirection: "column",
      overflow: "hidden", height: "100vh",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
            Version History
          </span>
          {isRunning && (
            <div style={{
              width: 6, height: 6, borderRadius: "50%", background: "#facc15",
              animation: "pulse 1s ease-in-out infinite",
            }} />
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={fetchRuns}
            title="Refresh"
            style={{
              width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.25)", borderRadius: 6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
          >
            <RefreshCw size={12} style={loading ? { animation: "spin 1s linear infinite" } : {}} />
          </button>
          <button
            onClick={onClose}
            style={{
              width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.25)", borderRadius: 6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Runs list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {runs.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            height: 200, color: "rgba(255,255,255,0.15)", fontSize: 12, gap: 10, textAlign: "center", padding: "0 24px",
          }}>
            <Clock size={28} style={{ opacity: 0.3 }} />
            <span style={{ fontWeight: 500 }}>No runs yet</span>
            <span style={{ fontSize: 11, lineHeight: 1.6, color: "rgba(255,255,255,0.1)" }}>
              Run the workflow to see history here
            </span>
          </div>
        ) : (
          runs.map((run, i) => (
            <div key={run.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {/* Run row */}
              <button
                onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                style={{
                  width: "100%", background: expandedRun === run.id ? "rgba(255,255,255,0.03)" : "none",
                  border: "none", cursor: "pointer",
                  padding: "11px 14px", textAlign: "left",
                  display: "flex", flexDirection: "column", gap: 5,
                }}
                onMouseEnter={(e) => { if (expandedRun !== run.id) e.currentTarget.style.background = "rgba(255,255,255,0.02)" }}
                onMouseLeave={(e) => { if (expandedRun !== run.id) e.currentTarget.style.background = "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {expandedRun === run.id
                      ? <ChevronDown size={11} style={{ color: "rgba(255,255,255,0.3)" }} />
                      : <ChevronRight size={11} style={{ color: "rgba(255,255,255,0.3)" }} />
                    }
                    <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
                      Run #{runs.length - i}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {getStatusIcon(run.status)}
                    {getStatusBadge(run.status)}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 17 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                    {run.createdAt ? formatDistanceToNow(new Date(run.createdAt), { addSuffix: true }) : ""}
                  </span>
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    <span style={{
                      fontSize: 9, color: "rgba(255,255,255,0.2)",
                      background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 3,
                    }}>
                      {getScopeLabel(run.scope)}
                    </span>
                    {run.duration != null && (
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                        {formatMs(run.duration)}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded: node-level details */}
              {expandedRun === run.id && (
                <div style={{ padding: "4px 14px 12px", background: "rgba(0,0,0,0.2)" }}>
                  {(!run.nodeExecutions || run.nodeExecutions.length === 0) ? (
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", margin: "6px 0" }}>No node details</p>
                  ) : (
                    run.nodeExecutions.map((ne, j) => {
                      const isLast = j === run.nodeExecutions.length - 1
                      const nodeKey = `${run.id}-${ne.id}`
                      const isNodeExpanded = expandedNode === nodeKey
                      return (
                        <div key={ne.id} style={{
                          paddingLeft: 8,
                          borderLeft: `1px solid ${isLast ? "transparent" : "rgba(255,255,255,0.07)"}`,
                          marginLeft: 4, marginBottom: 2,
                        }}>
                          <button
                            onClick={() => setExpandedNode(isNodeExpanded ? null : nodeKey)}
                            style={{
                              width: "100%", background: "none", border: "none",
                              cursor: "pointer", padding: "4px 0", textAlign: "left",
                              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                              <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 10, flexShrink: 0 }}>
                                {isLast ? "└" : "├"}
                              </span>
                              {getStatusIcon(ne.status)}
                              <span style={{
                                fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 500,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                              }}>
                                {getNodeLabel(ne.nodeType)}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                              {ne.duration != null && (
                                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{formatMs(ne.duration)}</span>
                              )}
                              {isNodeExpanded
                                ? <ChevronDown size={9} style={{ color: "rgba(255,255,255,0.2)" }} />
                                : <ChevronRight size={9} style={{ color: "rgba(255,255,255,0.2)" }} />
                              }
                            </div>
                          </button>

                          {isNodeExpanded && (
                            <div style={{ paddingLeft: 14, paddingBottom: 6 }}>
                              {ne.inputs && Object.keys(ne.inputs).length > 0 && (
                                <div style={{ marginBottom: 4 }}>
                                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Inputs</span>
                                  <div style={{
                                    fontSize: 10, color: "rgba(255,255,255,0.3)",
                                    background: "rgba(255,255,255,0.03)", borderRadius: 4,
                                    padding: "3px 6px", marginTop: 2, lineHeight: 1.5, wordBreak: "break-all",
                                  }}>
                                    {formatInputSummary(ne.inputs)}
                                  </div>
                                </div>
                              )}
                              {ne.outputs && (
                                <div style={{ marginBottom: 4 }}>
                                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Output</span>
                                  <div style={{
                                    fontSize: 10, color: "rgba(255,255,255,0.4)",
                                    background: "rgba(255,255,255,0.03)", borderRadius: 4,
                                    padding: "3px 6px", marginTop: 2, lineHeight: 1.5, wordBreak: "break-all",
                                    maxHeight: 80, overflow: "hidden",
                                  }}>
                                    {formatOutput(ne.outputs)}
                                  </div>
                                </div>
                              )}
                              {ne.error && (
                                <div style={{
                                  fontSize: 10, color: "rgba(248,113,113,0.8)",
                                  background: "rgba(248,113,113,0.05)", borderRadius: 4,
                                  padding: "3px 6px", marginTop: 2, lineHeight: 1.5,
                                }}>
                                  ✕ {ne.error.slice(0, 200)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  )
}