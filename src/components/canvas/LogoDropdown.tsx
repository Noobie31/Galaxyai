"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Smartphone, Upload, Download, Users, ChevronRight } from "lucide-react"

interface Props {
    workflowName: string
}

export default function LogoDropdown({ workflowName }: Props) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    const handleImport = () => {
        const input = document.createElement("input")
        input.type = "file"
        input.accept = ".json"
        input.onchange = (e: any) => {
            const file = e.target.files[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = (ev) => {
                try {
                    const { useWorkflowStore } = require("@/store/workflowStore")
                    const data = JSON.parse(ev.target?.result as string)
                    if (data.nodes && data.edges) {
                        useWorkflowStore.getState().setNodes(data.nodes)
                        useWorkflowStore.getState().setEdges(data.edges)
                    }
                } catch { alert("Invalid JSON file") }
            }
            reader.readAsText(file)
        }
        input.click()
        setIsOpen(false)
    }

    const handleExport = () => {
        const { useWorkflowStore } = require("@/store/workflowStore")
        const { nodes, edges, workflowName } = useWorkflowStore.getState()
        const data = JSON.stringify({ nodes, edges }, null, 2)
        const blob = new Blob([data], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${workflowName || "workflow"}.json`
        a.click()
        URL.revokeObjectURL(url)
        setIsOpen(false)
    }

    const menuItems = [
        {
            icon: ArrowLeft,
            label: "Back",
            onClick: () => { router.push("/dashboard"); setIsOpen(false) },
            hasChevron: false,
        },
        {
            icon: Smartphone,
            label: "Turn into App",
            badge: "Soon",
            onClick: () => setIsOpen(false),
            hasChevron: false,
        },
        {
            icon: Upload,
            label: "Import",
            onClick: handleImport,
            hasChevron: false,
        },
        {
            icon: Download,
            label: "Export",
            onClick: handleExport,
            hasChevron: false,
        },
        {
            icon: Users,
            label: "Workspaces",
            onClick: () => setIsOpen(false),
            hasChevron: true,
        },
    ]

    return (
        <div ref={ref} style={{ position: "relative" }}>
            {/* Logo button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: isOpen ? "rgba(255,255,255,0.08)" : "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 8px 4px 4px",
                    borderRadius: 8,
                    color: "white",
                }}
                onMouseEnter={(e) => {
                    if (!isOpen) e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                }}
                onMouseLeave={(e) => {
                    if (!isOpen) e.currentTarget.style.background = "none"
                }}
            >
                {/* Logo */}
                <div style={{
                    width: 26, height: 26,
                    background: "white",
                    borderRadius: 7,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}>
                    <span style={{ color: "black", fontWeight: 800, fontSize: 12 }}>N</span>
                </div>

                {/* Chevron */}
                <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.15s",
                        color: "rgba(255,255,255,0.4)",
                    }}
                >
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    width: 200,
                    background: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: 6,
                    zIndex: 1000,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                }}>
                    {menuItems.map((item, i) => {
                        const Icon = item.icon
                        return (
                            <button
                                key={item.label}
                                onClick={item.onClick}
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "8px 10px",
                                    borderRadius: 8,
                                    border: "none",
                                    background: "none",
                                    cursor: "pointer",
                                    color: "rgba(255,255,255,0.65)",
                                    fontSize: 13,
                                    textAlign: "left",
                                    marginTop: i === 1 ? 2 : 0,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(255,255,255,0.06)"
                                    e.currentTarget.style.color = "rgba(255,255,255,0.9)"
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "none"
                                    e.currentTarget.style.color = "rgba(255,255,255,0.65)"
                                }}
                            >
                                <Icon size={15} style={{ flexShrink: 0, opacity: 0.7 }} />
                                <span style={{ flex: 1 }}>{item.label}</span>
                                {item.badge && (
                                    <span style={{
                                        fontSize: 9, fontWeight: 700,
                                        color: "#60a5fa",
                                        background: "rgba(96,165,250,0.1)",
                                        border: "1px solid rgba(96,165,250,0.2)",
                                        padding: "1px 5px", borderRadius: 4,
                                        letterSpacing: "0.03em",
                                    }}>
                                        {item.badge}
                                    </span>
                                )}
                                {item.hasChevron && (
                                    <ChevronRight size={12} style={{ opacity: 0.4 }} />
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}