"use client"

import { useCallback, useRef } from "react"
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    MiniMap,
    Connection,
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useWorkflowStore } from "@/store/workflowStore"
import { useHistoryStore } from "@/store/historyStore"
import { validateConnection } from "@/lib/type-validator"
import TextNode from "@/components/nodes/TextNode"
import ImageUploadNode from "@/components/nodes/ImageUploadNode"
import VideoUploadNode from "@/components/nodes/VideoUploadNode"
import LLMNode from "@/components/nodes/LLMNode"
import CropImageNode from "@/components/nodes/CropImageNode"
import ExtractFrameNode from "@/components/nodes/ExtractFrameNode"
import CanvasToolbar from "./CanvasToolbar"
import { v4 as uuidv4 } from "uuid"

const nodeTypes = {
    textNode: TextNode,
    imageUploadNode: ImageUploadNode,
    videoUploadNode: VideoUploadNode,
    llmNode: LLMNode,
    cropImageNode: CropImageNode,
    extractFrameNode: ExtractFrameNode,
}

export default function WorkflowCanvas() {
    const {
        nodes,
        edges,
        setNodes,
        setEdges,
        updateNode,
    } = useWorkflowStore()
    const { pushHistory } = useHistoryStore()
    const reactFlowWrapper = useRef<HTMLDivElement>(null)

    const onNodesChange = useCallback(
        (changes: any) => {
            setNodes(applyNodeChanges(changes, nodes))
        },
        [nodes, setNodes]
    )

    const onEdgesChange = useCallback(
        (changes: any) => {
            setEdges(applyEdgeChanges(changes, edges))
        },
        [edges, setEdges]
    )

    const onConnect = useCallback(
        (connection: Connection) => {
            if (!validateConnection(connection, nodes)) return
            pushHistory({ nodes, edges })

            const newEdge = {
                ...connection,
                id: uuidv4(),
                animated: true,
                style: { stroke: "#a855f7", strokeWidth: 2 },
            }
            setEdges(addEdge(newEdge, edges))

            if (connection.target && connection.targetHandle) {
                const targetNode = nodes.find((n) => n.id === connection.target)
                const existing = (targetNode?.data?.connectedHandles as string[]) || []
                if (!existing.includes(connection.targetHandle)) {
                    updateNode(connection.target, {
                        connectedHandles: [...existing, connection.targetHandle],
                    })
                }
            }
        },
        [nodes, edges, setEdges, pushHistory, updateNode]
    )

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            const type = e.dataTransfer.getData("nodeType")
            if (!type || !reactFlowWrapper.current) return

            const bounds = reactFlowWrapper.current.getBoundingClientRect()
            const position = {
                x: e.clientX - bounds.left,
                y: e.clientY - bounds.top,
            }

            const defaultData: Record<string, any> = {
                textNode: { label: "Text", text: "", status: "idle" },
                imageUploadNode: { label: "Upload Image", status: "idle" },
                videoUploadNode: { label: "Upload Video", status: "idle" },
                llmNode: {
                    label: "Run Any LLM",
                    model: "gemini-2.5-flash",
                    status: "idle",
                    connectedHandles: [],
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

            pushHistory({ nodes, edges })
            setNodes([
                ...nodes,
                {
                    id: uuidv4(),
                    type,
                    position,
                    data: defaultData[type] || { label: type, status: "idle" },
                },
            ])
        },
        [nodes, edges, setNodes, pushHistory]
    )

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
    }, [])

    const onEdgesDelete = useCallback(
        (deletedEdges: any[]) => {
            deletedEdges.forEach((edge) => {
                if (edge.target && edge.targetHandle) {
                    const targetNode = nodes.find((n) => n.id === edge.target)
                    if (targetNode) {
                        const updated = (
                            (targetNode.data?.connectedHandles as string[]) || []
                        ).filter((h) => h !== edge.targetHandle)
                        updateNode(edge.target, { connectedHandles: updated })
                    }
                }
            })
        },
        [nodes, updateNode]
    )

    return (
        <div ref={reactFlowWrapper} className="w-full h-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onEdgesDelete={onEdgesDelete}
                nodeTypes={nodeTypes}
                fitView
                deleteKeyCode={["Delete", "Backspace"]}
                multiSelectionKeyCode="Shift"
                className="bg-[#0a0a0a]"
                defaultEdgeOptions={{
                    animated: true,
                    style: { stroke: "#a855f7", strokeWidth: 2 },
                }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={24}
                    size={1}
                    color="#ffffff15"
                />
                <MiniMap
                    className="!bg-[#111111] !border-white/10"
                    nodeColor="#333333"
                    maskColor="rgba(0,0,0,0.7)"
                />
                <CanvasToolbar />
            </ReactFlow>
        </div>
    )
}