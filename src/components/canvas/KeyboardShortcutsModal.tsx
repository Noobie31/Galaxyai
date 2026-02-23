"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

interface Props {
    isOpen: boolean
    onClose: () => void
}

const shortcuts = [
    {
        section: "General",
        items: [
            { label: "Undo", keys: ["Ctrl", "Z"] },
            { label: "Redo", keys: ["Ctrl", "Shift", "Z"] },
            { label: "Save", keys: ["Ctrl", "S"] },
            { label: "Select all", keys: ["Ctrl", "A"] },
            { label: "Deselect all", keys: ["Esc"] },
            { label: "Multi-select", keys: ["Shift", "Click"], extra: ["Ctrl", "Drag"] },
            { label: "Cut edges (Scissor)", keys: ["X", "Drag"], extra: ["Y", "Drag"] },
        ],
    },
    {
        section: "Node Creation",
        items: [
            { label: "New text node", keys: ["T"] },
            { label: "Image node", keys: ["I"] },
            { label: "Video node", keys: ["V"] },
            { label: "LLM node", keys: ["L"] },
            { label: "Crop image node", keys: ["C"] },
            { label: "Extract frame node", keys: ["E"] },
        ],
    },
    {
        section: "Node Operations",
        items: [
            { label: "Delete node", keys: ["Delete"] },
            { label: "Run selected node", keys: ["Ctrl", "Enter"] },
            { label: "Run workflow", keys: ["Ctrl", "Shift", "Enter"] },
        ],
    },
    {
        section: "View",
        items: [
            { label: "Zoom in", keys: ["+"] },
            { label: "Zoom out", keys: ["-"] },
            { label: "Fit view", keys: ["Ctrl", "0"] },
        ],
    },
]

function KeyBadge({ label }: { label: string }) {
    return (
        <span style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 28,
            height: 22,
            padding: "0 6px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 5,
            fontSize: 11,
            fontWeight: 500,
            color: "rgba(255,255,255,0.7)",
            fontFamily: "monospace",
        }}>
            {label}
        </span>
    )
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: Props) {
    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        if (isOpen) window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0,
                    background: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(4px)",
                    zIndex: 999,
                }}
            />

            {/* Modal */}
            <div style={{
                position: "fixed",
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: 480,
                maxHeight: "75vh",
                background: "#141414",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
                overflow: "hidden",
            }}>
                {/* Header */}
                <div style={{
                    display: "flex", alignItems: "flex-start",
                    justifyContent: "space-between",
                    padding: "20px 24px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    flexShrink: 0,
                }}>
                    <div>
                        <h2 style={{ fontSize: 16, fontWeight: 600, color: "white", margin: 0 }}>
                            Keyboard Shortcuts
                        </h2>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "4px 0 0" }}>
                            Quickly navigate and create with these shortcuts.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 28, height: 28,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 8, cursor: "pointer",
                            color: "rgba(255,255,255,0.5)",
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ overflowY: "auto", padding: "16px 24px 24px" }}>
                    {shortcuts.map((group) => (
                        <div key={group.section} style={{ marginBottom: 24 }}>
                            <h3 style={{
                                fontSize: 11, fontWeight: 700,
                                color: "rgba(255,255,255,0.35)",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                margin: "0 0 10px",
                            }}>
                                {group.section}
                            </h3>

                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                {group.items.map((item) => (
                                    <div
                                        key={item.label}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "7px 10px",
                                            borderRadius: 8,
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                    >
                                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
                                            {item.label}
                                        </span>

                                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            {item.keys.map((key) => (
                                                <KeyBadge key={key} label={key} />
                                            ))}
                                            {item.extra && (
                                                <>
                                                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: "0 2px" }}>or</span>
                                                    {item.extra.map((key) => (
                                                        <KeyBadge key={key} label={key} />
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}