import { create } from "zustand"

type Tool = "select" | "pan" | "cut" | "magic" | "connect"

interface CanvasToolStore {
    activeTool: Tool
    setActiveTool: (tool: Tool) => void
}

export const useCanvasToolStore = create<CanvasToolStore>((set) => ({
    activeTool: "select",
    setActiveTool: (tool) => set({ activeTool: tool }),
}))