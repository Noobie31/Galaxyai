import { useEffect } from "react"
import { useCanvasToolStore } from "@/store/canvasToolStore"
import { useHistoryStore } from "@/store/historyStore"
import { useWorkflowStore } from "@/store/workflowStore"
import { useExecutionStore } from "@/store/executionStore"
import { v4 as uuidv4 } from "uuid"

const defaultNodeData: Record<string, any> = {
    textNode: { label: "Text", text: "", status: "idle" },
    imageUploadNode: { label: "Upload Image", status: "idle" },
    videoUploadNode: { label: "Upload Video", status: "idle" },
    llmNode: { label: "Run Any LLM", model: "gemini-2.5-flash", status: "idle", connectedHandles: [] },
    cropImageNode: { label: "Crop Image", xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100, connectedHandles: [], status: "idle" },
    extractFrameNode: { label: "Extract Frame", timestamp: "0", connectedHandles: [], status: "idle" },
}

function spawnNode(type: string) {
    const { addNode } = useWorkflowStore.getState()
    addNode({
        id: uuidv4(),
        type,
        position: {
            x: 200 + Math.random() * 400,
            y: 150 + Math.random() * 300,
        },
        data: { ...defaultNodeData[type] },
    })
}

export function useKeyboardShortcuts() {
    const { setActiveTool } = useCanvasToolStore()
    const { undo, redo } = useHistoryStore()

    useEffect(() => {
        const handler = async (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
            // Don't fire shortcuts when typing in inputs/textareas
            if (tag === "input" || tag === "textarea") return

            // ── Tool shortcuts ──
            if (!e.ctrlKey && !e.metaKey) {
                if (e.key === "v" || e.key === "V") setActiveTool("select")
                if (e.key === "h" || e.key === "H") setActiveTool("pan")
                if (e.key === "x" || e.key === "X") setActiveTool("cut")

                // ── Node creation shortcuts ──
                if (e.key === "t" || e.key === "T") spawnNode("textNode")
                if (e.key === "i" || e.key === "I") spawnNode("imageUploadNode")
                if (e.key === "l" || e.key === "L") spawnNode("llmNode")
                if (e.key === "c" || e.key === "C") spawnNode("cropImageNode")
                if (e.key === "e" || e.key === "E") spawnNode("extractFrameNode")
                // Note: "V" is already pan tool, so video uses Shift+V
                if (e.shiftKey && (e.key === "v" || e.key === "V")) spawnNode("videoUploadNode")
            }

            // ── Undo / Redo ──
            if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
                e.preventDefault()
                const entry = undo()
                if (entry) {
                    useWorkflowStore.getState().setNodes(entry.nodes)
                    useWorkflowStore.getState().setEdges(entry.edges)
                }
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
                e.preventDefault()
                const entry = redo()
                if (entry) {
                    useWorkflowStore.getState().setNodes(entry.nodes)
                    useWorkflowStore.getState().setEdges(entry.edges)
                }
            }

            // ── Ctrl+0: fit view ──
            if ((e.ctrlKey || e.metaKey) && e.key === "0") {
                e.preventDefault()
                // Dispatch a custom event that WorkflowCanvas can listen to
                window.dispatchEvent(new CustomEvent("workflow:fitview"))
            }

            // ── Ctrl+A: select all ──
            if ((e.ctrlKey || e.metaKey) && e.key === "a") {
                e.preventDefault()
                window.dispatchEvent(new CustomEvent("workflow:selectall"))
            }

            // ── Ctrl+Enter: run full workflow ──
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                const { isRunning } = useExecutionStore.getState()
                if (isRunning) return
                const { workflowId, nodes, edges } = useWorkflowStore.getState()
                if (!workflowId) return
                const { runWorkflow } = await import("@/lib/execution-engine")
                runWorkflow(workflowId, nodes, edges, "full")
            }
        }

        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [setActiveTool, undo, redo])
}