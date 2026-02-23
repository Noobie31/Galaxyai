"use client"

import { useEffect, useRef, useCallback } from "react"
import { useWorkflowStore } from "@/store/workflowStore"
import { useCanvasToolStore } from "@/store/canvasToolStore"
import { useReactFlow } from "@xyflow/react"

/**
 * Drop this hook inside WorkflowClient component
 * Implements ALL keyboard shortcuts:
 * - Ctrl+S → save
 * - Ctrl+Z → undo
 * - Ctrl+Shift+Z → redo
 * - Ctrl+Enter → run workflow
 * - T → add text node
 * - I → add image node
 * - V → add video node
 * - L → add LLM node
 * - C → add crop node
 * - E → add extract frame node
 * - Escape → deselect
 * - Ctrl+0 → fit view
 */
export function useKeyboardShortcuts({
    workflowId,
    saveWorkflow,
    undo,
    redo,
}: {
    workflowId: string
    saveWorkflow: () => Promise<void>
    undo: () => any
    redo: () => any
}) {
    const { setNodes, setEdges, nodes, edges } = useWorkflowStore()
    const { setActiveTool } = useCanvasToolStore()
    const { addNodes, fitView } = useReactFlow()

    const addNode = useCallback((type: string) => {
        // Don't add node if user is typing in an input
        const activeEl = document.activeElement
        if (
            activeEl instanceof HTMLInputElement ||
            activeEl instanceof HTMLTextAreaElement ||
            (activeEl as HTMLElement)?.isContentEditable
        ) return

        const newNode = {
            id: `${type}-${Date.now()}`,
            type,
            position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 },
            data: {},
        }
        addNodes(newNode)
    }, [addNodes])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const ctrl = e.ctrlKey || e.metaKey
            const shift = e.shiftKey

            // Ctrl+S → save
            if (ctrl && e.key === "s") {
                e.preventDefault()
                saveWorkflow()
                return
            }

            // Ctrl+Z → undo
            if (ctrl && !shift && e.key === "z") {
                e.preventDefault()
                const entry = undo()
                if (entry) {
                    setNodes(entry.nodes)
                    setEdges(entry.edges)
                }
                return
            }

            // Ctrl+Shift+Z → redo
            if (ctrl && shift && e.key === "z") {
                e.preventDefault()
                const entry = redo()
                if (entry) {
                    setNodes(entry.nodes)
                    setEdges(entry.edges)
                }
                return
            }

            // Ctrl+Enter → run workflow
            if (ctrl && e.key === "Enter") {
                e.preventDefault()
                import("@/lib/execution-engine").then(({ runWorkflow }) => {
                    runWorkflow(workflowId, nodes, edges, "full")
                })
                return
            }

            // Ctrl+0 → fit view
            if (ctrl && e.key === "0") {
                e.preventDefault()
                fitView({ duration: 300 })
                return
            }

            // Escape → switch to select tool
            if (e.key === "Escape") {
                setActiveTool("select")
                return
            }

            // Single-key shortcuts (skip if in input)
            const activeEl = document.activeElement
            if (
                activeEl instanceof HTMLInputElement ||
                activeEl instanceof HTMLTextAreaElement ||
                (activeEl as HTMLElement)?.isContentEditable
            ) return

            switch (e.key.toLowerCase()) {
                case "t": addNode("textInput"); break
                case "i": addNode("imageUpload"); break
                case "v": addNode("videoUpload"); break
                case "l": addNode("llm"); break
                case "c": addNode("cropImage"); break
                case "e": addNode("extractFrame"); break
                case "h": setActiveTool("pan"); break
                case "v": setActiveTool("select"); break // v also = select (after node add check)
            }
        }

        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [workflowId, nodes, edges, saveWorkflow, undo, redo, addNode, setActiveTool, fitView, setNodes, setEdges])
}