import { create } from "zustand"

type CanvasTool = "add" | "select" | "pan" | "cut" | "magic" | "nodes"

interface CanvasToolState {
    activeTool: CanvasTool
    setActiveTool: (tool: CanvasTool) => void
}

export const useCanvasToolStore = create<CanvasToolState>((set) => ({
    activeTool: "select",
    setActiveTool: (tool) => set({ activeTool: tool }),
}))