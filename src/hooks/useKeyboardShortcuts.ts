import { useEffect } from "react"
import { useCanvasToolStore } from "@/store/canvasToolStore"
import { useHistoryStore } from "@/store/historyStore"
import { useWorkflowStore } from "@/store/workflowStore"

export function useKeyboardShortcuts() {
    const { setActiveTool } = useCanvasToolStore()
    const { undo, redo } = useHistoryStore()

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
            // Don't fire shortcuts when typing in inputs/textareas
            if (tag === "input" || tag === "textarea") return

            // Tool shortcuts
            if (e.key === "v" || e.key === "V") setActiveTool("select")
            if (e.key === "h" || e.key === "H") setActiveTool("pan")
            if (e.key === "c" || e.key === "C") setActiveTool("cut")

            // Undo / Redo
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
        }

        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [setActiveTool, undo, redo])
}