"use client"

import { useState, useEffect, useCallback } from "react"
import { formatDistanceToNow } from "date-fns"
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react"

interface NodeExecution {
  id: string
  nodeId: string
  nodeType: string
  status: string
  inputs: any
  outputs: any
  error: string | null
  startedAt: string
  completedAt: string | null
  duration: number | null
}

interface Run {
  id: string
  status: string
  scope: string
  startedAt: string
  completedAt: string | null
  duration: number | null
  nodeExecutions: NodeExecution[]
}

interface Props {
  workflowId: string
}

export default function RightSidebar({ workflowId }: Props) {
  const [runs, setRuns] = useState<Run[]>([])
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchRuns = useCallback(async () => {
    if (!workflowId) return
    try {
      const res = await fetch(`/api/runs?workflowId=${workflowId}`)
      const data = await res.json()
      setRuns(data.runs || [])
    } catch (e) {
      console.error(e)
    }
  }, [workflowId])

  useEffect(() => {
    fetchRuns()
    const interval = setInterval(fetchRuns, 3000)
    return () => clearInterval(interval)
  }, [fetchRuns])

  const getStatusIcon = (status: string) => {
    if (status === "success") return <CheckCircle size={12} className="text-green-400" />
    if (status === "failed") return <XCircle size={12} className="text-red-400" />
    if (status === "running") return <Loader2 size={12} className="text-yellow-400 animate-spin" />
    return <Clock size={12} className="text-white/30" />
  }

  const getStatusColor = (status: string) => {
    if (status === "success") return "text-green-400 bg-green-400/10"
    if (status === "failed") return "text-red-400 bg-red-400/10"
    if (status === "running") return "text-yellow-400 bg-yellow-400/10"
    return "text-white/30 bg-white/5"
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

  return (
    <div style={{
      width: 260,
      flexShrink: 0,
      background: "#0f0f0f",
      borderLeft: "1px solid rgba(255,255,255,0.05)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
          Run History
        </span>
        <button
          onClick={fetchRuns}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.3)",
            padding: 2,
          }}
        >
          <Loader2 size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

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
            <span style={{ fontSize: 10, textAlign: "center", padding: "0 16px" }}>
              Click RUN to execute the workflow
            </span>
          </div>
        ) : (
          runs.map((run, i) => (
            <div key={run.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <button
                onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                style={{
                  width: "100%",
                  background: expandedRun === run.id ? "rgba(255,255,255,0.05)" : "none",
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
                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
                      Run #{runs.length - i}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {getStatusIcon(run.status)}
                    <span style={{
                      fontSize: 9,
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: 4,
                      textTransform: "uppercase",
                    }} className={getStatusColor(run.status)}>
                      {run.status}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 18 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                    {formatDistanceToNow(new Date(run.startedAt))} ago
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 9,
                      color: "rgba(255,255,255,0.3)",
                      background: "rgba(255,255,255,0.05)",
                      padding: "1px 5px",
                      borderRadius: 3,
                    }}>
                      {getScopeLabel(run.scope)}
                    </span>
                    {run.duration && (
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                        {formatDuration(run.duration)}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {expandedRun === run.id && (
                <div style={{ padding: "4px 14px 10px", background: "rgba(0,0,0,0.2)" }}>
                  {(run.nodeExecutions || []).map((ne, j) => (
                    <div key={ne.id} style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                      padding: "6px 0",
                      borderBottom: j < run.nodeExecutions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>
                            {j === run.nodeExecutions.length - 1 ? "+" : "+"}
                          </span>
                          {getStatusIcon(ne.status)}
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                            {getNodeLabel(ne.nodeType)}
                          </span>
                        </div>
                        {ne.duration && (
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                            {formatDuration(ne.duration)}
                          </span>
                        )}
                      </div>
                      {ne.outputs?.output && (
                        <div style={{
                          marginLeft: 18,
                          fontSize: 10,
                          color: "rgba(255,255,255,0.3)",
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: 4,
                          padding: "3px 6px",
                          wordBreak: "break-all",
                          maxHeight: 60,
                          overflow: "hidden",
                        }}>
                          {typeof ne.outputs.output === "string"
                            ? ne.outputs.output.slice(0, 120) + (ne.outputs.output.length > 120 ? "..." : "")
                            : JSON.stringify(ne.outputs.output).slice(0, 120)
                          }
                        </div>
                      )}
                      {ne.error && (
                        <div style={{
                          marginLeft: 18,
                          fontSize: 10,
                          color: "rgba(239,68,68,0.7)",
                          background: "rgba(239,68,68,0.05)",
                          borderRadius: 4,
                          padding: "3px 6px",
                        }}>
                          {ne.error.slice(0, 100)}
                        </div>
                      )}
                    </div>
                  ))}
                  {(!run.nodeExecutions || run.nodeExecutions.length === 0) && (
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", padding: "4px 0" }}>
                      No node details available
                    </div>
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
