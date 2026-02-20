import { create } from "zustand"
import { immer } from "zustand/middleware/immer"

export type NodeStatus = "idle" | "running" | "success" | "failed"

interface NodeExecutionState {
    status: NodeStatus
    output?: any
    error?: string
    startTime?: number
    duration?: number
}

interface ExecutionState {
    isRunning: boolean
    currentRunId: string | null
    nodeStates: Record<string, NodeExecutionState>

    // Actions
    setIsRunning: (running: boolean) => void
    setCurrentRunId: (id: string | null) => void
    setNodeStatus: (nodeId: string, status: NodeStatus) => void
    setNodeOutput: (nodeId: string, output: any) => void
    setNodeError: (nodeId: string, error: string) => void
    setNodeStartTime: (nodeId: string, time: number) => void
    setNodeDuration: (nodeId: string, duration: number) => void
    resetNodeStates: () => void
    reset: () => void
}

export const useExecutionStore = create<ExecutionState>()(
    immer((set) => ({
        isRunning: false,
        currentRunId: null,
        nodeStates: {},

        setIsRunning: (running) => set((state) => {
            state.isRunning = running
        }),

        setCurrentRunId: (id) => set((state) => {
            state.currentRunId = id
        }),

        setNodeStatus: (nodeId, status) => set((state) => {
            if (!state.nodeStates[nodeId]) {
                state.nodeStates[nodeId] = { status: "idle" }
            }
            state.nodeStates[nodeId].status = status
        }),

        setNodeOutput: (nodeId, output) => set((state) => {
            if (!state.nodeStates[nodeId]) {
                state.nodeStates[nodeId] = { status: "idle" }
            }
            state.nodeStates[nodeId].output = output
        }),

        setNodeError: (nodeId, error) => set((state) => {
            if (!state.nodeStates[nodeId]) {
                state.nodeStates[nodeId] = { status: "idle" }
            }
            state.nodeStates[nodeId].error = error
        }),

        setNodeStartTime: (nodeId, time) => set((state) => {
            if (!state.nodeStates[nodeId]) {
                state.nodeStates[nodeId] = { status: "idle" }
            }
            state.nodeStates[nodeId].startTime = time
        }),

        setNodeDuration: (nodeId, duration) => set((state) => {
            if (!state.nodeStates[nodeId]) {
                state.nodeStates[nodeId] = { status: "idle" }
            }
            state.nodeStates[nodeId].duration = duration
        }),

        resetNodeStates: () => set((state) => {
            state.nodeStates = {}
        }),

        reset: () => set((state) => {
            state.isRunning = false
            state.currentRunId = null
            state.nodeStates = {}
        }),
    }))
)