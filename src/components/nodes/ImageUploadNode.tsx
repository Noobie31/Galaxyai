"use client"

import { Handle, Position, NodeProps } from "@xyflow/react"
import { useWorkflowStore } from "@/store/workflowStore"
import { useExecutionStore } from "@/store/executionStore"
import { Image, Upload, X } from "lucide-react"
import { useRef } from "react"

export default function ImageUploadNode({ id, data }: NodeProps) {
    const { updateNode, removeNode } = useWorkflowStore()
    const { nodeStates } = useExecutionStore()
    const status = nodeStates[id]?.status || "idle"
    const inputRef = useRef<HTMLInputElement>(null)

    const handleUpload = async (file: File) => {
        updateNode(id, { uploading: true })
        try {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("nodeId", id)

            const res = await fetch("/api/upload/image", {
                method: "POST",
                body: formData,
            })
            const result = await res.json()
            updateNode(id, {
                imageUrl: result.url,
                fileName: file.name,
                uploading: false,
            })
        } catch (e) {
            updateNode(id, { uploading: false, error: "Upload failed" })
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleUpload(file)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const file = e.dataTransfer.files?.[0]
        if (file && file.type.startsWith("image/")) handleUpload(file)
    }

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
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Image size={12} className="text-green-400" />
                    </div>
                    <span className="text-xs font-semibold text-white/80">Upload Image</span>
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
                    accept=".jpg,.jpeg,.png,.webp,.gif"
                    onChange={handleFileChange}
                    className="hidden"
                />

                {data.imageUrl ? (
                    <div className="relative group">
                        <img
                            src={data.imageUrl as string}
                            alt="Uploaded"
                            className="w-full h-36 object-cover rounded-lg"
                        />
                        <button
                            onClick={() => updateNode(id, { imageUrl: null, fileName: null })}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X size={10} className="text-white" />
                        </button>
                        <p className="text-xs text-white/30 mt-1 truncate">
                            {data.fileName as string}
                        </p>
                    </div>
                ) : (
                    <div
                        onClick={() => inputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className="border border-dashed border-white/10 rounded-lg h-24 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/30 hover:bg-white/5 transition-all"
                    >
                        {data.uploading ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                        ) : (
                            <>
                                <Upload size={18} className="text-white/30" />
                                <p className="text-xs text-white/30">
                                    Click or drag image here
                                </p>
                                <p className="text-xs text-white/20">
                                    jpg, png, webp, gif
                                </p>
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
                className="!w-3 !h-3 !bg-green-500 !border-2 !border-[#1a1a1a] hover:!bg-green-400 transition-colors"
            />
        </div>
    )
}