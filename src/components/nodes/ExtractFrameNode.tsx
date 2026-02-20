"use client"

import { Handle, Position, NodeProps } from "@xyflow/react"
import { useWorkflowStore } from "@/store/workflowStore"
import { useExecutionStore } from "@/store/executionStore"
import { Film, X, Play } from "lucide-react"

export default function ExtractFrameNode({ id, data }: NodeProps) {
  const { updateNode, removeNode } = useWorkflowStore()
  const { nodeStates } = useExecutionStore()
  const status = nodeStates[id]?.status || "idle"
  const output = nodeStates[id]?.output
  const error = nodeStates[id]?.error
  const connectedHandles = (data.connectedHandles as string[]) || []

  const handleRunSingle = async () => {
    const { runSingleNode } = await import("@/lib/execution-engine")
    const { workflowId, nodes, edges } = useWorkflowStore.getState()
    if (workflowId) runSingleNode(workflowId, id, nodes, edges)
  }

  return (
    <div className={`bg-[#1a1a1a] border rounded-xl w-64 shadow-xl transition-all ${
      status === "running" ? "border-purple-500 shadow-purple-500/20 ring-2 ring-purple-500/30 animate-pulse"
      : status === "success" ? "border-green-500/50"
      : status === "failed" ? "border-red-500/50"
      : "border-white/10 hover:border-white/20"
    }`}>

      {/* Input Handles */}
      <Handle type="target" position={Position.Left} id="video_url" style={{ top: "38%" }} className="!w-3 !h-3 !bg-orange-500 !border-2 !border-[#1a1a1a]" />
      <Handle type="target" position={Position.Left} id="timestamp" style={{ top: "62%" }} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#1a1a1a]" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-pink-500/20 flex items-center justify-center">
            <Film size={12} className="text-pink-400" />
          </div>
          <span className="text-xs font-semibold text-white/80">Extract Frame</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleRunSingle} disabled={status === "running"}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-pink-500/20 text-pink-400 transition-colors disabled:opacity-40">
            <Play size={10} />
          </button>
          <button onClick={() => removeNode(id)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3">
        {/* video_url */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-orange-500/60" />
            <span className="text-xs text-white/40">video_url</span>
          </div>
          {connectedHandles.includes("video_url") && (
            <span className="text-xs text-orange-400/60">connected</span>
          )}
        </div>

        {/* timestamp */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500/60" />
            <span className="text-xs text-white/40">timestamp</span>
            {connectedHandles.includes("timestamp") && (
              <span className="text-xs text-blue-400/60 ml-auto">connected</span>
            )}
          </div>
          <input
            type="text"
            value={(data.timestamp as string) || "0"}
            onChange={(e) => updateNode(id, { timestamp: e.target.value })}
            disabled={connectedHandles.includes("timestamp")}
            placeholder="e.g. 5 or 50%"
            className="w-full bg-[#111111] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-white/20">Seconds (5) or percent (50%)</p>
        </div>

        {/* Status */}
        {status === "running" && (
          <div className="flex items-center gap-2 bg-pink-500/10 rounded-lg px-3 py-2">
            <div className="w-3 h-3 border-2 border-pink-500/40 border-t-pink-500 rounded-full animate-spin" />
            <span className="text-xs text-pink-400">Extracting frame...</span>
          </div>
        )}

        {output && status === "success" && (
          <div>
            <img
              src={typeof output === "string" ? output : output.url}
              alt="Extracted frame"
              className="w-full h-28 object-cover rounded-lg"
            />
            <p className="text-xs text-white/30 mt-1">Frame extracted ?</p>
          </div>
        )}

        {error && status === "failed" && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle type="source" position={Position.Right} id="output"
        className="!w-3 !h-3 !bg-pink-500 !border-2 !border-[#1a1a1a] hover:!bg-pink-400 transition-colors" />
    </div>
  )
}
