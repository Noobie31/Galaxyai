"use client"

import { useState } from "react"
import { useReactFlow } from "@xyflow/react"
import { useWorkflowStore } from "@/store/workflowStore"
import {
    Search,
    Type,
    Image,
    Video,
    Brain,
    Crop,
    Film,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"
import { v4 as uuidv4 } from "uuid"

const nodeTypes = [
    {
        type: "textNode",
        label: "Text",
        icon: Type,
        description: "Text input node",
    },
    {
        type: "imageUploadNode",
        label: "Upload Image",
        icon: Image,
        description: "Upload image file",
    },
    {
        type: "videoUploadNode",
        label: "Upload Video",
        icon: Video,
        description: "Upload video file",
    },
    {
        type: "llmNode",
        label: "Run Any LLM",
        icon: Brain,
        description: "Run Gemini LLM",
    },
    {
        type: "cropImageNode",
        label: "Crop Image",
        icon: Crop,
        description: "Crop an image",
    },
    {
        type: "extractFrameNode",
        label: "Extract Frame",
        icon: Film,
        description: "Extract video frame",
    },
]

const defaultNodeData: Record<string, any> = {
    textNode: { label: "Text", text: "", status: "idle" },
    imageUploadNode: { label: "Upload Image", status: "idle" },
    videoUploadNode: { label: "Upload Video", status: "idle" },
    llmNode: {
        label: "Run Any LLM",
        model: "gemini-2.5-flash",
    },
    cropImageNode: {
        label: "Crop Image",
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 100,
        connectedHandles: [],
        status: "idle",
    },
    extractFrameNode: {
        label: "Extract Frame",
        timestamp: "0",
        connectedHandles: [],
        status: "idle",
    },
}

export default function LeftSidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const [search, setSearch] = useState("")
    const { addNode } = useWorkflowStore()
    const { screenToFlowPosition } = useReactFlow()

    const filtered = nodeTypes.filter(
        (n) =>
            n.label.toLowerCase().includes(search.toLowerCase()) ||
            n.description.toLowerCase().includes(search.toLowerCase())
    )

    const handleAddNode = (type: string) => {
        const position = screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
        })

        const newNode = {
            id: uuidv4(),
            type,
            position: {
                x: position.x + (Math.random() - 0.5) * 200,
                y: position.y + (Math.random() - 0.5) * 200,
            },
            data: { ...defaultNodeData[type] },
        }

        addNode(newNode)
    }

    const handleDragStart = (e: React.DragEvent, type: string) => {
        e.dataTransfer.setData("nodeType", type)
        e.dataTransfer.effectAllowed = "move"
    }

    return (
        <div
            className={`relative flex-shrink-0 bg-[#111111] border-r border-white/5 flex flex-col transition-all duration-300 ${collapsed ? "w-12" : "w-60"
                }`}
        >
            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-6 z-10 w-6 h-6 bg-[#1a1a1a] border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            >
                {collapsed ? (
                    <ChevronRight size={12} />
                ) : (
                    <ChevronLeft size={12} />
                )}
            </button>

            {!collapsed && (
                <>
                    {/* Search */}
                    <div className="p-3 border-b border-white/5">
                        <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-3 py-2 border border-white/5">
                            <Search size={13} className="text-white/40 flex-shrink-0" />
                            <input
                                type="text"
                                placeholder="Search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-transparent text-sm text-white placeholder-white/30 outline-none w-full"
                            />
                        </div>
                    </div>

                    {/* Quick Access */}
                    <div className="flex-1 overflow-y-auto p-3">
                        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                            Quick access
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {filtered.map((node) => {
                                const Icon = node.icon
                                return (
                                    <button
                                        key={node.type}
                                        onClick={() => handleAddNode(node.type)}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, node.type)}
                                        className="flex flex-col items-center justify-center gap-2 p-3 bg-[#1a1a1a] hover:bg-[#222222] border border-white/5 hover:border-white/20 rounded-xl transition-all cursor-grab active:cursor-grabbing group"
                                    >
                                        <Icon
                                            size={20}
                                            className="text-white/60 group-hover:text-white transition-colors"
                                        />
                                        <span className="text-xs text-white/60 group-hover:text-white text-center leading-tight transition-colors">
                                            {node.label}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Collapsed Icons */}
            {collapsed && (
                <div className="flex-1 flex flex-col items-center gap-2 pt-4">
                    {nodeTypes.map((node) => {
                        const Icon = node.icon
                        return (
                            <button
                                key={node.type}
                                onClick={() => handleAddNode(node.type)}
                                title={node.label}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <Icon size={16} className="text-white/60" />
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}