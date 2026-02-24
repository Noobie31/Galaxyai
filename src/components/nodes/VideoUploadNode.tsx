"use client"

import { useCallback, useState } from "react"
import { Handle, Position, NodeProps } from "@xyflow/react"
import { useWorkflowStore } from "@/store/workflowStore"
import { useExecutionStore } from "@/store/executionStore"
import { Video, Upload, X, Loader2, AlertCircle } from "lucide-react"

interface VideoNodeData {
    label?: string
    videoUrl?: string
    fileName?: string
    status?: string
    error?: string
    [key: string]: unknown
}

export default function VideoUploadNode({ id, data }: NodeProps) {
    const nodeData = data as VideoNodeData
    const { updateNode, removeNode } = useWorkflowStore()
    const { nodeStates } = useExecutionStore()
    const status = nodeStates[id]?.status || "idle"

    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string>("")

    const handleFile = useCallback(async (file: File) => {
        if (!file) return
        setUploading(true)
        setUploadError("")
        try {
            const formData = new FormData()
            formData.append("file", file)
            const res = await fetch("/api/upload/video", { method: "POST", body: formData })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "Upload failed")
            updateNode(id, {
                videoUrl: result.url,
                fileName: file.name,
                status: "idle",
                error: "",
            })
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Upload failed"
            setUploadError(msg)
            updateNode(id, { error: msg })
        } finally {
            setUploading(false)
        }
    }, [id, updateNode])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file && file.type.startsWith("video/")) handleFile(file)
    }, [handleFile])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
    }

    return (
        <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{
                background: "#111",
                border: `1px solid ${status === "running" ? "#f59e0b" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 14,
                width: 220,
                boxShadow: status === "running" ? `0 0 16px 4px rgba(245,158,11,0.4)` : "none",
                transition: "all 0.2s",
            }}
        >
            {/* Header */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px 8px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{
                        width: 22, height: 22, borderRadius: 6,
                        background: "rgba(245,158,11,0.15)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <Video size={11} style={{ color: "#f59e0b" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                        {nodeData.label || "Upload Video"}
                    </span>
                </div>
                <button
                    onClick={() => removeNode(id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", padding: 2 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
                >
                    <X size={13} />
                </button>
            </div>

            {/* Body */}
            <div style={{ padding: "10px 12px 12px" }}>
                {nodeData.videoUrl ? (
                    <div style={{ position: "relative" }}>
                        <video
                            src={nodeData.videoUrl}
                            controls
                            style={{ width: "100%", borderRadius: 8, display: "block", maxHeight: 140 }}
                        />
                        <button
                            onClick={() => updateNode(id, { videoUrl: "", fileName: "" })}
                            style={{
                                position: "absolute", top: 5, right: 5,
                                background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%",
                                width: 20, height: 20, cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "white",
                            }}
                        >
                            <X size={10} />
                        </button>
                        {nodeData.fileName && (
                            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: "5px 0 0", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {nodeData.fileName}
                            </p>
                        )}
                    </div>
                ) : (
                    <label style={{
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        gap: 6, padding: "18px 12px",
                        border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 8,
                        cursor: uploading ? "not-allowed" : "pointer",
                        background: "rgba(255,255,255,0.02)",
                        transition: "all 0.15s",
                    }}
                        onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)" }}
                    >
                        {uploading ? (
                            <Loader2 size={18} style={{ color: "#f59e0b", animation: "spin 1s linear infinite" }} />
                        ) : (
                            <Upload size={18} style={{ color: "rgba(255,255,255,0.25)" }} />
                        )}
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
                            {uploading ? "Uploading..." : "Click or drop video"}
                        </span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)" }}>
                            MP4, MOV, WEBM, M4V
                        </span>
                        <input
                            type="file" accept="video/*"
                            style={{ display: "none" }}
                            onChange={handleChange}
                            disabled={uploading}
                        />
                    </label>
                )}

                {/* Upload error */}
                {uploadError && (
                    <div style={{
                        display: "flex", alignItems: "flex-start", gap: 6,
                        background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
                        borderRadius: 6, padding: "6px 8px", marginTop: 8,
                    }}>
                        <AlertCircle size={11} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 10, color: "#f87171", lineHeight: 1.4 }}>{uploadError}</span>
                    </div>
                )}

                {/* Execution error */}
                {status === "failed" && nodeStates[id]?.error && (
                    <div style={{
                        display: "flex", alignItems: "flex-start", gap: 6,
                        background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
                        borderRadius: 6, padding: "6px 8px", marginTop: 8,
                    }}>
                        <AlertCircle size={11} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 10, color: "#f87171", lineHeight: 1.4 }}>{String(nodeStates[id]?.error)}</span>
                    </div>
                )}
            </div>

            {/* Output handle */}
            <Handle
                type="source"
                position={Position.Right}
                id="output"
                style={{
                    background: "#f59e0b",
                    width: 10, height: 10,
                    border: "2px solid #111",
                    right: -5,
                }}
            />

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}