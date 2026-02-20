"use client"

import { Handle, Position, NodeProps } from "@xyflow/react"
import { useWorkflowStore } from "@/store/workflowStore"
import { useExecutionStore } from "@/store/executionStore"
import { Type, X } from "lucide-react"

export default function TextNode({ id, data }: NodeProps) {
    const { updateNode, removeNode } = useWorkflowStore()
    const { nodeStates } = useExecutionStore()
    const status = nodeStates[id]?.status || "idle"

    return (
        <div
            className={`bg-[#1a1a1a] border rounded-xl w-64 shadow-xl transition-all ${status === "running"
                    ? "border-purple-500 shadow-purple-500/20 shadow-lg ring-2 ring-purple-500/30 animate-pulse"
                    : status === "success"
                        ? "border-green-500/50"
                        : status === "failed"
                            ? "border-red-500/50"
                            : "border-white/10 hover:border-white/20"
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Type size={12} className="text-blue-400" />
                    </div>
                    <span className="text-xs font-semibold text-white/80">Text</span>
                </div>
                <button
                    onClick={() => removeNode(id)}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
                >
                    <X size={12} />
                </button>
            </div>

            {/* Body */}
            <div className="p-3">
                <textarea
                    value={(data.text as string) || ""}
                    onChange={(e) =>
                        updateNode(id, { text: e.target.value })
                    }
                    placeholder="Enter text..."
                    rows={4}
                    className="w-full bg-[#111111] border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 outline-none resize-none focus:border-white/20 transition-colors"
                />
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id="output"
                className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#1a1a1a] hover:!bg-blue-400 transition-colors"
            />
        </div>
    )
}