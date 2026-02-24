import { create } from "zustand"

interface WorkflowStore {
    workflowId: string
    workflowName: string
    nodes: any[]
    edges: any[]
    isSaving: boolean
    lastSaved: Date | null

    setWorkflowId: (id: string) => void
    setWorkflowName: (name: string) => void
    setNodes: (nodes: any[]) => void
    setEdges: (edges: any[]) => void
    setIsSaving: (v: boolean) => void
    setLastSaved: (date: Date) => void
    removeNode: (nodeId: string) => void
    addNode: (node: any) => void
    updateNode: (nodeId: string, data: Partial<any>) => void
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
    workflowId: "",
    workflowName: "Untitled",
    nodes: [],
    edges: [],
    isSaving: false,
    lastSaved: null,

    setWorkflowId: (workflowId) => set({ workflowId }),
    setWorkflowName: (workflowName) => set({ workflowName }),
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    setIsSaving: (isSaving) => set({ isSaving }),
    setLastSaved: (lastSaved) => set({ lastSaved }),

    removeNode: (nodeId) =>
        set((s) => ({
            nodes: s.nodes.filter((n) => n.id !== nodeId),
            edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        })),

    addNode: (node) =>
        set((s) => ({ nodes: [...s.nodes, node] })),

    updateNode: (nodeId, data) =>
        set((s) => ({
            nodes: s.nodes.map((n) =>
                n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
            ),
        })),
}))