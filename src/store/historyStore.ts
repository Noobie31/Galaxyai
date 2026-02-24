import { create } from "zustand"

interface HistoryEntry {
    nodes: any[]
    edges: any[]
}

interface HistoryStore {
    past: HistoryEntry[]
    future: HistoryEntry[]

    pushHistory: (entry: HistoryEntry) => void
    undo: () => HistoryEntry | null
    redo: () => HistoryEntry | null
    clearHistory: () => void
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
    past: [],
    future: [],

    pushHistory: (entry) =>
        set((s) => ({
            past: [...s.past.slice(-49), entry], // keep max 50 entries
            future: [], // clear redo stack on new action
        })),

    undo: () => {
        const { past } = get()
        if (past.length === 0) return null
        const entry = past[past.length - 1]
        set((s) => ({
            past: s.past.slice(0, -1),
            future: [entry, ...s.future],
        }))
        return entry
    },

    redo: () => {
        const { future } = get()
        if (future.length === 0) return null
        const entry = future[0]
        set((s) => ({
            past: [...s.past, entry],
            future: s.future.slice(1),
        }))
        return entry
    },

    clearHistory: () => set({ past: [], future: [] }),
}))