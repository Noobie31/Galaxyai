"use client"

import { useState, useEffect, useCallback } from "react"
import { formatDistanceToNow } from "date-fns"
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, Loader2, RefreshCw } from "lucide-react"

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
}

export default function RightSidebar({ workflowId }: Props) {
  const [runs, setRuns] = useState<Run[]>([])
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [expandedNode, setExpandedNode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchRuns = useCallback(async () => {
    if (!workflowId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/runs?workflowId=${workflowId}`)
      const data = await res.json()
      // API returns array directly (not wrapped in { runs: [] })
      setRuns(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [workflowId])

  useEffect(() => {
    fetchRuns()
    const interval = setInterval(fetchRuns, 4000)
    return () => clearInterval(interval)
  }, [fetchRuns])

  const getStatusIcon = (status: string) => {
    if (status === "success") return <CheckCircle size={12} className="text-green-400 flex-shrink-0" />
    if (status === "failed") return <XCircle size={12} className="text-red-400 flex-shrink-0" />
    if (status === "running") return <Loader2 size={12} className="text-yellow-400 animate-spin flex-shrink-0" />
    return <Clock size={12} className="text-white/30 flex-shrink-0" />
  }

  const getStatusBadgeStyle = (status: string): React.CSSProperties => {
    if (status === "success") return { color: "#4ade80", background: "rgba(74,222,128,0.1)" }
    if (status === "failed") return { color: "#f87171", background: "rgba(248,113,113,0.1)" }
    if (status === "running") return { color: "#facc15", background: "rgba(250,204,21,0.1)" }
    return { color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)" }
  }

  const getScopeLabel = (scope: string) => {
    if (scope === "full") return "Full Run"
    if (scope === "single") return "Single Node"
    return "Selected Nodes"
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return ""
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
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

  const formatInputs = (inputs: any): string => {
    if (!inputs) return ""
    const parts: string[] = []
    if (inputs.text) parts.push(`text: "${String(inputs.text).slice(0, 40)}${inputs.text.length > 40 ? "..." : ""}"`)
    if (inputs.model) parts.push(`model: ${inputs.model}`)
    if (inputs.image_url) parts.push(`image: ${String(inputs.image_url).split("/").pop()?.slice(0, 30)}`)
    if (inputs.video_url) parts.push(`video: ${String(inputs.video_url).split("/").pop()?.slice(0, 30)}`)
    if (inputs.x_percent !== undefined) parts.push(`x:${inputs.x_percent}% y:${inputs.y_percent}% w:${inputs.width_percent}% h:${inputs.height_percent}%`)
    if (inputs.timestamp) parts.push(`timestamp: ${inputs.timestamp}`)
    return parts.join(", ")
  }

  const formatOutput = (outputs: any): string => {
    if (!outputs) return ""
    const output = outputs.output ?? outputs
    if (typeof output === "string") {
      return output.length > 120 ? output.slice(0, 120) + "..." : output
    }
    return JSON.stringify(output).slice(0, 120)
  }

  return (
    <div style={{
      width: 272,
      flexShrink: 0,
      background: "#0f0f0f",
      borderLeft: "1px solid rgba(255,255,255,0.05)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
          Run History
        </span>
        <button
          onClick={fetchRuns}
          title="Refresh"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.3)",
            padding: 4,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
          }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Runs list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {runs.length === 0 ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: 200,
            color: "rgba(255,255,255,0.2)",
            fontSize: 12,
            gap: 8,
          }}>
            <Clock size={24} />
            <span>No runs yet</span>
            <span style={{ fontSize: 10, textAlign: "center", padding: "0 16px", lineHeight: 1.5 }}>
              Click RUN to execute the workflow
            </span>
          </div>
        ) : (
          runs.map((run, i) => (
            <div key={run.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {/* Run header row */}
              <button
                onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                style={{
                  width: "100%",
                  background: expandedRun === run.id ? "rgba(255,255,255,0.04)" : "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "10px 14px",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {expandedRun === run.id
                      ? <ChevronDown size={12} color="rgba(255,255,255,0.4)" />
                      : <ChevronRight size={12} color="rgba(255,255,255,0.4)" />
                    }
                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                      Run #{runs.length - i}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {getStatusIcon(run.status)}
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      ...getStatusBadgeStyle(run.status),
                    }}>
                      {run.status}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 18 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                    {/* createdAt is the correct field from Prisma schema */}
                    {run.createdAt ? formatDistanceToNow(new Date(run.createdAt)) + " ago" : ""}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 9,
                      color: "rgba(255,255,255,0.35)",
                      background: "rgba(255,255,255,0.05)",
                      padding: "1px 6px",
                      borderRadius: 3,
                    }}>
                      {getScopeLabel(run.scope)}
                    </span>
                    {run.duration != null && (
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                        {formatDuration(run.duration)}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded node executions */}
              {expandedRun === run.id && (
                <div style={{ padding: "4px 14px 12px", background: "rgba(0,0,0,0.25)" }}>
                  {(!run.nodeExecutions || run.nodeExecutions.length === 0) ? (
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", padding: "6px 0" }}>
                      No node details available
                    </div>
                  ) : (
                    run.nodeExecutions.map((ne, j) => {
                      const isLast = j === run.nodeExecutions.length - 1
                      const nodeKey = `${run.id}-${ne.id}`
                      const isNodeExpanded = expandedNode === nodeKey

                      return (
                        <div key={ne.id} style={{
                          paddingLeft: 8,
                          borderLeft: `1px solid ${isLast ? "transparent" : "rgba(255,255,255,0.08)"}`,
                          marginLeft: 4,
                          marginBottom: 2,
                        }}>
                          {/* Node row */}
                          <button
                            onClick={() => setExpandedNode(isNodeExpanded ? null : nodeKey)}
                            style={{
                              width: "100%",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "5px 0",
                              textAlign: "left",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 4,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, flexShrink: 0 }}>
                                {isLast ? "└" : "├"}
                              </span>
                              {getStatusIcon(ne.status)}
                              <span style={{
                                fontSize: 10,
                                color: "rgba(255,255,255,0.7)",
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}>
                                {getNodeLabel(ne.nodeType)}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                              {ne.duration != null && (
                                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>
                                  {formatDuration(ne.duration)}
                                </span>
                              )}
                              {isNodeExpanded
                                ? <ChevronDown size={10} color="rgba(255,255,255,0.2)" />
                                : <ChevronRight size={10} color="rgba(255,255,255,0.2)" />
                              }
                            </div>
                          </button>

                          {/* Node detail — inputs + outputs */}
                          {isNodeExpanded && (
                            <div style={{ paddingLeft: 14, paddingBottom: 6 }}>
                              {/* Inputs */}
                              {ne.inputs && Object.keys(ne.inputs).length > 0 && (
                                <div style={{ marginBottom: 4 }}>
                                  <span style={{
                                    fontSize: 9,
                                    color: "rgba(255,255,255,0.25)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    fontWeight: 600,
                                  }}>
                                    Inputs
                                  </span>
                                  <div style={{
                                    fontSize: 10,
                                    color: "rgba(255,255,255,0.35)",
                                    background: "rgba(255,255,255,0.03)",
                                    borderRadius: 4,
                                    padding: "3px 6px",
                                    marginTop: 2,
                                    wordBreak: "break-all",
                                    lineHeight: 1.5,
                                  }}>
                                    {formatInputs(ne.inputs) || "—"}
                                  </div>
                                </div>
                              )}

                              {/* Output */}
                              {ne.outputs && (
                                <div>
                                  <span style={{
                                    fontSize: 9,
                                    color: "rgba(255,255,255,0.25)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    fontWeight: 600,
                                  }}>
                                    Output
                                  </span>
                                  <div style={{
                                    fontSize: 10,
                                    color: "rgba(255,255,255,0.4)",
                                    background: "rgba(255,255,255,0.03)",
                                    borderRadius: 4,
                                    padding: "3px 6px",
                                    marginTop: 2,
                                    wordBreak: "break-all",
                                    lineHeight: 1.5,
                                    maxHeight: 80,
                                    overflow: "hidden",
                                  }}>
                                    {formatOutput(ne.outputs) || "—"}
                                  </div>
                                </div>
                              )}

                              {/* Error */}
                              {ne.error && (
                                <div style={{
                                  fontSize: 10,
                                  color: "rgba(248,113,113,0.8)",
                                  background: "rgba(248,113,113,0.06)",
                                  borderRadius: 4,
                                  padding: "3px 6px",
                                  marginTop: 4,
                                  lineHeight: 1.5,
                                }}>
                                  ✕ {ne.error.slice(0, 150)}
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
    </div>
  )
}