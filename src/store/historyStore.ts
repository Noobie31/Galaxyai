import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { Node, Edge } from "@xyflow/react"

interface HistoryEntry {
    nodes: Node[]
    edges: Edge[]
}

interface HistoryState {
    past: HistoryEntry[]
    future: HistoryEntry[]

    pushHistory: (entry: HistoryEntry) => void
    undo: () => HistoryEntry | null
    redo: () => HistoryEntry | null
    clear: () => void
}

export const useHistoryStore = create<HistoryState>()(
    immer((set, get) => ({
        past: [],
        future: [],

        pushHistory: (entry) => set((state) => {
            state.past.push(entry)
            state.future = []
            if (state.past.length > 50) {
                state.past.shift()
            }
        }),

        undo: () => {
            const { past } = get()
            if (past.length === 0) return null

            const previous = past[past.length - 1]
            set((state) => {
                state.past.pop()
                state.future.unshift(previous)
            })
            return previous
        },

        redo: () => {
            const { future } = get()
            if (future.length === 0) return null

            const next = future[0]
            set((state) => {
                state.future.shift()
                state.past.push(next)
            })
            return next
        },

        clear: () => set((state) => {
            state.past = []
            state.future = []
        }),
    }))
)