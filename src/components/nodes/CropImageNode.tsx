"use client"

import { Handle, Position, NodeProps } from "@xyflow/react"
import { useWorkflowStore } from "@/store/workflowStore"
import { useExecutionStore } from "@/store/executionStore"
import { Crop, X, Play } from "lucide-react"

export default function CropImageNode({ id, data }: NodeProps) {
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

    const fields = [
        { key: "xPercent", handle: "x_percent", label: "X %" },
        { key: "yPercent", handle: "y_percent", label: "Y %" },
        { key: "widthPercent", handle: "width_percent", label: "Width %" },
        { key: "heightPercent", handle: "height_percent", label: "Height %" },
    ]

    return (
        <div
            className={`bg-[#1a1a1a] border rounded-xl w-64 shadow-xl transition-all ${status === "running"
                    ? "border-purple-500 shadow-purple-500/20 ring-2 ring-purple-500/30 animate-pulse"
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
                id="image_url"
                style={{ top: "25%" }}
                className="!w-3 !h-3 !bg-green-500 !border-2 !border-[#1a1a1a]"
            />
            <Handle
                type="target"
                position={Position.Left}
                id="x_percent"
                style={{ top: "42%" }}
                className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#1a1a1a]"
            />
            <Handle
                type="target"
                position={Position.Left}
                id="y_percent"
                style={{ top: "57%" }}
                className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#1a1a1a]"
            />
            <Handle
                type="target"
                position={Position.Left}
                id="width_percent"
                style={{ top: "72%" }}
                className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#1a1a1a]"
            />
            <Handle
                type="target"
                position={Position.Left}
                id="height_percent"
                style={{ top: "87%" }}
                className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#1a1a1a]"
            />

            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                        <Crop size={12} className="text-yellow-400" />
                    </div>
                    <span className="text-xs font-semibold text-white/80">Crop Image</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleRunSingle}
                        disabled={status === "running"}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-yellow-500/20 text-yellow-400 transition-colors disabled:opacity-40"
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
                <div className="text-xs text-white/30 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500/60" />
                    image_url
                    {connectedHandles.includes("image_url") && (
                        <span className="text-green-400/60 ml-auto">connected</span>
                    )}
                </div>

                {fields.map((f) => (
                    <div key={f.key} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500/60 flex-shrink-0" />
                        <label className="text-xs text-white/30 w-16 flex-shrink-0">
                            {f.label}
                        </label>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={(data[f.key] as number) ?? 0}
                            onChange={(e) =>
                                updateNode(id, { [f.key]: Number(e.target.value) })
                            }
                            disabled={connectedHandles.includes(f.handle)}
                            className="flex-1 bg-[#111111] border border-white/5 rounded px-2 py-1 text-xs text-white outline-none focus:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                    </div>
                ))}

                {status === "running" && (
                    <div className="flex items-center gap-2 bg-yellow-500/10 rounded-lg px-3 py-2">
                        <div className="w-3 h-3 border-2 border-yellow-500/40 border-t-yellow-500 rounded-full animate-spin" />
                        <span className="text-xs text-yellow-400">Cropping...</span>
                    </div>
                )}

                {output && status === "success" && (
                    <img
                        src={typeof output === "string" ? output : output.url}
                        alt="Cropped"
                        className="w-full h-24 object-cover rounded-lg"
                    />
                )}

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
                className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-[#1a1a1a] hover:!bg-yellow-400 transition-colors"
            />
        </div>
    )
}