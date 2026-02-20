import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { Node, Edge } from "@xyflow/react"

interface WorkflowState {
    workflowId: string | null
    workflowName: string
    nodes: Node[]
    edges: Edge[]
    selectedNodes: string[]
    isSaving: boolean
    lastSaved: Date | null

    // Actions
    setWorkflowId: (id: string) => void
    setWorkflowName: (name: string) => void
    setNodes: (nodes: Node[]) => void
    setEdges: (edges: Edge[]) => void
    addNode: (node: Node) => void
    updateNode: (id: string, data: any) => void
    removeNode: (id: string) => void
    addEdge: (edge: Edge) => void
    removeEdge: (id: string) => void
    setSelectedNodes: (ids: string[]) => void
    setIsSaving: (saving: boolean) => void
    setLastSaved: (date: Date) => void
    reset: () => void
}

export const useWorkflowStore = create<WorkflowState>()(
    immer((set) => ({
        workflowId: null,
        workflowName: "untitled",
        nodes: [],
        edges: [],
        selectedNodes: [],
        isSaving: false,
        lastSaved: null,

        setWorkflowId: (id) => set((state) => { state.workflowId = id }),
        setWorkflowName: (name) => set((state) => { state.workflowName = name }),
        setNodes: (nodes) => set((state) => { state.nodes = nodes }),
        setEdges: (edges) => set((state) => { state.edges = edges }),

        addNode: (node) => set((state) => {
            state.nodes.push(node)
        }),

        updateNode: (id, data) => set((state) => {
            const node = state.nodes.find((n) => n.id === id)
            if (node) node.data = { ...node.data, ...data }
        }),

        removeNode: (id) => set((state) => {
            state.nodes = state.nodes.filter((n) => n.id !== id)
            state.edges = state.edges.filter(
                (e) => e.source !== id && e.target !== id
            )
        }),

        addEdge: (edge) => set((state) => {
            state.edges.push(edge)
        }),

        removeEdge: (id) => set((state) => {
            state.edges = state.edges.filter((e) => e.id !== id)
        }),

        setSelectedNodes: (ids) => set((state) => {
            state.selectedNodes = ids
        }),

        setIsSaving: (saving) => set((state) => {
            state.isSaving = saving
        }),

        setLastSaved: (date) => set((state) => {
            state.lastSaved = date
        }),

        reset: () => set((state) => {
            state.workflowId = null
            state.workflowName = "untitled"
            state.nodes = []
            state.edges = []
            state.selectedNodes = []
        }),
    }))
)