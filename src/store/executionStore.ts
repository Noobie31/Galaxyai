import { create } from "zustand"

interface NodeState {
    status: "idle" | "running" | "success" | "failed"
    output?: any
    error?: string
    startTime?: number
    duration?: number
}

interface ExecutionStore {
    isRunning: boolean
    nodeStates: Record<string, NodeState>

    setIsRunning: (v: boolean) => void
    resetNodeStates: () => void

    setNodeStatus: (nodeId: string, status: NodeState["status"]) => void
    setNodeOutput: (nodeId: string, output: any) => void
    setNodeError: (nodeId: string, error: string) => void
    setNodeStartTime: (nodeId: string, time: number) => void
    setNodeDuration: (nodeId: string, duration: number) => void
}

export const useExecutionStore = create<ExecutionStore>((set) => ({
    isRunning: false,
    nodeStates: {},

    setIsRunning: (v) => set({ isRunning: v }),

    resetNodeStates: () => set({ nodeStates: {} }),

    setNodeStatus: (nodeId, status) =>
        set((s) => ({
            nodeStates: {
                ...s.nodeStates,
                [nodeId]: { ...s.nodeStates[nodeId], status },
            },
        })),

    setNodeOutput: (nodeId, output) =>
        set((s) => ({
            nodeStates: {
                ...s.nodeStates,
                [nodeId]: { ...s.nodeStates[nodeId], output },
            },
        })),

    setNodeError: (nodeId, error) =>
        set((s) => ({
            nodeStates: {
                ...s.nodeStates,
                [nodeId]: { ...s.nodeStates[nodeId], error },
            },
        })),

    setNodeStartTime: (nodeId, startTime) =>
        set((s) => ({
            nodeStates: {
                ...s.nodeStates,
                [nodeId]: { ...s.nodeStates[nodeId], startTime },
            },
        })),

    setNodeDuration: (nodeId, duration) =>
        set((s) => ({
            nodeStates: {
                ...s.nodeStates,
                [nodeId]: { ...s.nodeStates[nodeId], duration },
            },
        })),
}))