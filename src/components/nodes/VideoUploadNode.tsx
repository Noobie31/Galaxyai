"use client"

import { Handle, Position, NodeProps } from "@xyflow/react"
import { useWorkflowStore } from "@/store/workflowStore"
import { useExecutionStore } from "@/store/executionStore"
import { Video, Upload, X, AlertCircle } from "lucide-react"
import { useRef } from "react"

export default function VideoUploadNode({ id, data }: NodeProps) {
    const { updateNode, removeNode } = useWorkflowStore()
    const { nodeStates } = useExecutionStore()
    const status = nodeStates[id]?.status || "idle"
    const inputRef = useRef<HTMLInputElement>(null)

    const handleUpload = async (file: File) => {
        updateNode(id, { uploading: true, error: null })
        try {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("nodeId", id)

            const res = await fetch("/api/upload/video", {
                method: "POST",
                body: formData,
            })
            const result = await res.json()

            if (!res.ok || result.error) {
                throw new Error(result.error || "Upload failed")
            }

            updateNode(id, {
                videoUrl: result.url,
                fileName: file.name,
                uploading: false,
                error: null,
            })
        } catch (e: any) {
            updateNode(id, {
                uploading: false,
                error: e.message || "Upload failed. Please try again.",
            })
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleUpload(file)
    }

    return (
        <div className={`bg-[#1a1a1a] border rounded-xl w-64 shadow-xl transition-all ${status === "running" ? "border-purple-500 shadow-purple-500/20 ring-2 ring-purple-500/30 animate-pulse"
                : status === "success" ? "border-green-500/50"
                    : status === "failed" ? "border-red-500/50"
                        : "border-white/10 hover:border-white/20"
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <Video size={12} className="text-orange-400" />
                    </div>
                    <span className="text-xs font-semibold text-white/80">Upload Video</span>
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
                <input
                    ref={inputRef}
                    type="file"
                    accept=".mp4,.mov,.webm,.m4v"
                    onChange={handleFileChange}
                    className="hidden"
                />

                {/* ✅ Upload error display */}
                {data.error && !data.videoUrl && (
                    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-2">
                        <AlertCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400 leading-relaxed">{data.error as string}</p>
                    </div>
                )}

                {data.videoUrl ? (
                    <div className="relative group">
                        <video
                            src={data.videoUrl as string}
                            controls
                            className="w-full h-36 object-cover rounded-lg bg-black"
                        />
                        <button
                            onClick={() => updateNode(id, { videoUrl: null, fileName: null, error: null })}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X size={10} className="text-white" />
                        </button>
                        <p className="text-xs text-white/30 mt-1 truncate">{data.fileName as string}</p>
                    </div>
                ) : (
                    <div
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const file = e.dataTransfer.files?.[0]
                            if (file) handleUpload(file)
                        }}
                        className="border border-dashed border-white/10 rounded-lg h-24 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/25 hover:bg-white/[0.02] transition-all"
                    >
                        {data.uploading ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                        ) : (
                            <>
                                <Upload size={18} className="text-white/25" />
                                <p className="text-xs text-white/30">Click or drag video here</p>
                                <p className="text-xs text-white/15">mp4, mov, webm, m4v</p>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id="output"
                className="!w-3 !h-3 !bg-orange-500 !border-2 !border-[#1a1a1a] hover:!bg-orange-400 transition-colors"
            />
        </div>
    )
}