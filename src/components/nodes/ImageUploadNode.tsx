"use client"

import { useCallback, useState } from "react"
import { Handle, Position, NodeProps } from "@xyflow/react"
import { useWorkflowStore } from "@/store/workflowStore"
import { useExecutionStore } from "@/store/executionStore"
import { ImageIcon, Upload, X, Loader2, AlertCircle } from "lucide-react"

interface ImageNodeData {
    label?: string
    imageUrl?: string
    fileName?: string
    status?: string
    error?: string
    [key: string]: unknown
}

export default function ImageUploadNode({ id, data }: NodeProps) {
    const nodeData = data as ImageNodeData
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
            const res = await fetch("/api/upload/image", { method: "POST", body: formData })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "Upload failed")
            updateNode(id, {
                imageUrl: result.url,
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
        if (file && file.type.startsWith("image/")) handleFile(file)
    }, [handleFile])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
    }

    const glowColor = status === "running" ? "#0ea5e9"
        : status === "success" ? "#4ade80"
            : status === "failed" ? "#f87171"
                : "transparent"

    return (
        <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{
                background: "#111",
                border: `1px solid ${status === "running" ? "#0ea5e9" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 14,
                width: 220,
                boxShadow: status === "running" ? `0 0 16px 4px rgba(14,165,233,0.4)` : "none",
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
                        background: "rgba(14,165,233,0.15)",
                        border: "1px solid rgba(14,165,233,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <ImageIcon size={11} style={{ color: "#0ea5e9" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                        {nodeData.label || "Upload Image"}
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
                {nodeData.imageUrl ? (
                    <div style={{ position: "relative" }}>
                        <img
                            src={nodeData.imageUrl}
                            alt="uploaded"
                            style={{ width: "100%", borderRadius: 8, display: "block", maxHeight: 140, objectFit: "cover" }}
                        />
                        <button
                            onClick={() => updateNode(id, { imageUrl: "", fileName: "" })}
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
                            <Loader2 size={18} style={{ color: "#0ea5e9", animation: "spin 1s linear infinite" }} />
                        ) : (
                            <Upload size={18} style={{ color: "rgba(255,255,255,0.25)" }} />
                        )}
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
                            {uploading ? "Uploading..." : "Click or drop image"}
                        </span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)" }}>
                            JPG, PNG, WEBP, GIF
                        </span>
                        <input
                            type="file" accept="image/*"
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
                    background: "#0ea5e9",
                    width: 10, height: 10,
                    border: "2px solid #111",
                    right: -5,
                }}
            />

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}