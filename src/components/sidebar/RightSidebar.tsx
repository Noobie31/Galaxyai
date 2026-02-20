"use client"

import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { Clock, ChevronDown, ChevronRight, X } from "lucide-react"

interface NodeExecution {
    id: string
    nodeId: string
    nodeType: string
    status: string
    inputs: any
    outputs: any
    error?: string
    duration?: number
}

interface WorkflowRun {
    id: string
    scope: string
    status: string
    duration?: number
    createdAt: string
    nodeExecutions: NodeExecution[]
}

interface Props {
    workflowId: string
}

export default function RightSidebar({ workflowId }: Props) {
    const [runs, setRuns] = useState<WorkflowRun[]>([])
    const [expandedRun, setExpandedRun] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchRuns = async () => {
        try {
            const res = await fetch(`/api/runs?workflowId=${workflowId}`)
            const data = await res.json()
            setRuns(data)
        } catch (e) {
            console.error("Failed to fetch runs", e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRuns()
        const interval = setInterval(fetchRuns, 5000)
        return () => clearInterval(interval)
    }, [workflowId])

    const statusColor = (status: string) => {
        if (status === "success") return "bg-green-500/20 text-green-400"
        if (status === "failed") return "bg-red-500/20 text-red-400"
        if (status === "running") return "bg-yellow-500/20 text-yellow-400"
        return "bg-white/10 text-white/40"
    }

    const statusDot = (status: string) => {
        if (status === "success") return "bg-green-400"
        if (status === "failed") return "bg-red-400"
        if (status === "running") return "bg-yellow-400 animate-pulse"
        return "bg-white/40"
    }

    return (
        <div className="w-72 flex-shrink-0 bg-[#111111] border-l border-white/5 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <Clock size={14} className="text-white/40" />
                <span className="text-sm font-semibold">Run History</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3">
                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    </div>
                ) : runs.length === 0 ? (
                    <div className="border border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center mt-2">
                        <Clock size={24} className="text-white/20 mb-2" />
                        <p className="text-sm text-white/40">No runs yet.</p>
                        <p className="text-xs text-white/20 mt-1">
                            Click "Run" to start!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {runs.map((run, index) => (
                            <div
                                key={run.id}
                                className="bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden"
                            >
                                {/* Run Header */}
                                <button
                                    onClick={() =>
                                        setExpandedRun(expandedRun === run.id ? null : run.id)
                                    }
                                    className="w-full flex items-center gap-2 p-3 hover:bg-white/5 transition-colors"
                                >
                                    <div
                                        className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(run.status)}`}
                                    />
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium">
                                                Run #{runs.length - index}
                                            </span>
                                            <span
                                                className={`text-xs px-1.5 py-0.5 rounded-full ${statusColor(run.status)}`}
                                            >
                                                {run.scope}
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/30 mt-0.5">
                                            {formatDistanceToNow(new Date(run.createdAt))} ago
                                            {run.duration && ` · ${(run.duration / 1000).toFixed(1)}s`}
                                        </p>
                                    </div>
                                    {expandedRun === run.id ? (
                                        <ChevronDown size={14} className="text-white/40" />
                                    ) : (
                                        <ChevronRight size={14} className="text-white/40" />
                                    )}
                                </button>

                                {/* Expanded Node Details */}
                                {expandedRun === run.id && (
                                    <div className="border-t border-white/5 p-3 space-y-2">
                                        {run.nodeExecutions.map((ne) => (
                                            <div
                                                key={ne.id}
                                                className="bg-[#111111] rounded-lg p-2.5"
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div
                                                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot(ne.status)}`}
                                                    />
                                                    <span className="text-xs font-medium truncate">
                                                        {ne.nodeType}
                                                    </span>
                                                    {ne.duration && (
                                                        <span className="text-xs text-white/30 ml-auto">
                                                            {(ne.duration / 1000).toFixed(1)}s
                                                        </span>
                                                    )}
                                                </div>
                                                {ne.outputs && (
                                                    <p className="text-xs text-white/40 truncate mt-1">
                                                        Output:{" "}
                                                        {typeof ne.outputs === "string"
                                                            ? ne.outputs
                                                            : JSON.stringify(ne.outputs).slice(0, 60)}
                                                    </p>
                                                )}
                                                {ne.error && (
                                                    <p className="text-xs text-red-400 truncate mt-1">
                                                        Error: {ne.error}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}