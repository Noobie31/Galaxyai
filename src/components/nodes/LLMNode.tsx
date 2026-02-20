"use client"

import { Handle, Position, NodeProps } from "@xyflow/react"
import { useWorkflowStore } from "@/store/workflowStore"
import { useExecutionStore } from "@/store/executionStore"
import { Brain, X, ChevronDown, Play } from "lucide-react"
import { useState } from "react"

const GEMINI_MODELS = [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
]
export default function LLMNode({ id, data }: NodeProps) {
    const { updateNode, removeNode } = useWorkflowStore()
    const { nodeStates } = useExecutionStore()
    const status = nodeStates[id]?.status || "idle"
    const output = nodeStates[id]?.output
    const error = nodeStates[id]?.error
    const [showModels, setShowModels] = useState(false)

    const connectedHandles = (data.connectedHandles as string[]) || []

    const handleRunSingle = async () => {
        const { runSingleNode } = await import("@/lib/execution-engine")
        const { workflowId, nodes, edges } = useWorkflowStore.getState()
        if (workflowId) runSingleNode(workflowId, id, nodes, edges)
    }

    return (
        <div
            className={`bg-[#1a1a1a] border rounded-xl w-72 shadow-xl transition-all ${status === "running"
                ? "border-purple-500 shadow-purple-500/30 shadow-lg ring-2 ring-purple-500/40 animate-pulse"
                : status === "success"
                    ? "border-green-500/50"
                    : status === "failed"
                        ? "border-red-500/50"
                        : "border-white/10 hover:border-white/20"
                }`}
        >
            {/* Input Handles */}
            <Handle
                type="target"
                position={Position.Left}
                id="system_prompt"
                style={{ top: "30%" }}
                className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#1a1a1a]"
            />
            <Handle
                type="target"
                position={Position.Left}
                id="user_message"
                style={{ top: "50%" }}
                className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#1a1a1a]"
            />
            <Handle
                type="target"
                position={Position.Left}
                id="images"
                style={{ top: "70%" }}
                className="!w-3 !h-3 !bg-green-500 !border-2 !border-[#1a1a1a]"
            />

            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Brain size={12} className="text-purple-400" />
                    </div>
                    <span className="text-xs font-semibold text-white/80">Run Any LLM</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleRunSingle}
                        disabled={status === "running"}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-purple-500/20 text-purple-400 transition-colors disabled:opacity-40"
                        title="Run this node"
                    >
                        <Play size={10} />
                    </button>
                    <button
                        onClick={() => removeNode(id)}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="p-3 space-y-2">
                {/* Model Selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowModels(!showModels)}
                        className="w-full flex items-center justify-between bg-[#111111] border border-white/5 rounded-lg px-3 py-2 text-xs text-white/70 hover:border-white/20 transition-colors"
                    >
                        <span>
                            {GEMINI_MODELS.find((m) => m.value === data.model)?.label ||
                                "Select Model"}
                        </span>
                        <ChevronDown size={12} />
                    </button>
                    {showModels && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden z-50 shadow-xl">
                            {GEMINI_MODELS.map((m) => (
                                <button
                                    key={m.value}
                                    onClick={() => {
                                        updateNode(id, { model: m.value })
                                        setShowModels(false)
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Handle Labels */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500/60" />
                        <span className="text-xs text-white/30">system_prompt</span>
                        {connectedHandles.includes("system_prompt") && (
                            <span className="text-xs text-blue-400/60 ml-auto">connected</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500/60" />
                        <span className="text-xs text-white/30">user_message</span>
                        {connectedHandles.includes("user_message") && (
                            <span className="text-xs text-blue-400/60 ml-auto">connected</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500/60" />
                        <span className="text-xs text-white/30">images (multi)</span>
                        {connectedHandles.includes("images") && (
                            <span className="text-xs text-green-400/60 ml-auto">connected</span>
                        )}
                    </div>
                </div>

                {/* Status */}
                {status === "running" && (
                    <div className="flex items-center gap-2 bg-purple-500/10 rounded-lg px-3 py-2">
                        <div className="w-3 h-3 border-2 border-purple-500/40 border-t-purple-500 rounded-full animate-spin" />
                        <span className="text-xs text-purple-400">Processing...</span>
                    </div>
                )}

                {/* Output */}
                {output && status === "success" && (
                    <div className="bg-[#111111] border border-green-500/20 rounded-lg p-2.5 max-h-32 overflow-y-auto">
                        <p className="text-xs text-white/60 leading-relaxed">
                            {typeof output === "string" ? output : JSON.stringify(output)}
                        </p>
                    </div>
                )}

                {/* Error */}
                {error && status === "failed" && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        <p className="text-xs text-red-400">{error}</p>
                    </div>
                )}
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id="output"
                className="!w-3 !h-3 !bg-purple-500 !border-2 !border-[#1a1a1a] hover:!bg-purple-400 transition-colors"
            />
        </div>
    )
}