"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { formatDistanceToNow } from "date-fns"
import {
    Plus,
    LayoutGrid,
    List,
    Search,
    GitBranch,
    Users,
    AppWindow,
    MessageSquare,
} from "lucide-react"

interface Workflow {
    id: string
    name: string
    updatedAt: string
    createdAt: string
    userId: string
    nodes: any
    edges: any
}

interface Props {
    workflows: Workflow[]
    userId: string
}

export default function DashboardClient({ workflows: initial }: Props) {
    const router = useRouter()
    const [workflows, setWorkflows] = useState(initial)
    const [search, setSearch] = useState("")
    const [view, setView] = useState<"grid" | "list">("grid")
    const [creating, setCreating] = useState(false)
    const [activeTab, setActiveTab] = useState<"workflows" | "tutorials">("workflows")

    const filtered = workflows.filter((w) =>
        w.name.toLowerCase().includes(search.toLowerCase())
    )

    const createWorkflow = async () => {
        setCreating(true)
        try {
            const res = await fetch("/api/workflows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "untitled" }),
            })
            const data = await res.json()
            console.log("API response:", data)

            if (!data.id) {
                console.error("No ID in response!", data)
                setCreating(false)
                return
            }

            router.push(`/workflow/${data.id}`)
        } catch (e) {
            console.error("Create failed:", e)
            setCreating(false)
        }
    }

    const sampleWorkflows = [
        { title: "Weavy Welcome", color: "from-blue-500 to-purple-600" },
        { title: "Weavy Iterators", color: "from-yellow-500 to-orange-600" },
        { title: "Multiple Image Models", color: "from-cyan-500 to-blue-600" },
        { title: "Editing Images", color: "from-gray-600 to-gray-800" },
        { title: "Compositor Node", color: "from-amber-600 to-yellow-700" },
        { title: "Image to Video Models", color: "from-gray-700 to-gray-900" },
        { title: "Camera Angle Ideation", color: "from-slate-600 to-slate-800" },
        { title: "Illustration Machine", color: "from-green-500 to-emerald-600" },
    ]

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-48 flex-shrink-0 bg-[#0f0f0f] border-r border-white/5 flex flex-col">
                {/* User + Create */}
                <div className="p-3 border-b border-white/5">
                    <div className="flex items-center gap-2 mb-3">
                        <UserButton afterSignOutUrl="/sign-in" />
                        <span className="text-sm font-medium truncate">My Workspace</span>
                    </div>
                    <button
                        onClick={createWorkflow}
                        disabled={creating}
                        className="w-full flex items-center justify-center gap-2 bg-[#d4f57a] hover:bg-[#c8ec6a] text-black text-sm font-semibold py-2 px-3 rounded-lg transition-colors disabled:opacity-60"
                    >
                        <Plus size={14} />
                        {creating ? "Creating..." : "Create New File"}
                    </button>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 p-2 space-y-1">
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 text-sm font-medium">
                        <GitBranch size={16} />
                        My Files
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-white/60 transition-colors">
                        <Users size={16} />
                        Shared with me
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-white/60 transition-colors">
                        <AppWindow size={16} />
                        Apps
                    </button>
                </nav>

                {/* Discord */}
                <div className="p-3 border-t border-white/5">
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-white/60 transition-colors">
                        <MessageSquare size={16} />
                        Discord
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Top Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
                    <h1 className="text-lg font-semibold">My Workspace</h1>
                    <button
                        onClick={createWorkflow}
                        disabled={creating}
                        className="flex items-center gap-2 border border-white/20 hover:border-white/40 text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-60"
                    >
                        <Plus size={14} />
                        {creating ? "Creating..." : "Create New File"}
                    </button>
                </div>

                <div className="px-8 py-6">
                    {/* Workflow Library Section */}
                    <div className="bg-[#141414] rounded-xl p-4 mb-8 border border-white/5">
                        <div className="flex gap-4 mb-4">
                            <button
                                onClick={() => setActiveTab("workflows")}
                                className={`text-sm font-medium pb-1 border-b-2 transition-colors ${activeTab === "workflows"
                                    ? "border-white text-white"
                                    : "border-transparent text-white/40 hover:text-white/60"
                                    }`}
                            >
                                Workflow library
                            </button>
                            <button
                                onClick={() => setActiveTab("tutorials")}
                                className={`text-sm font-medium pb-1 border-b-2 transition-colors ${activeTab === "tutorials"
                                    ? "border-white text-white"
                                    : "border-transparent text-white/40 hover:text-white/60"
                                    }`}
                            >
                                Tutorials
                            </button>
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {sampleWorkflows.map((sw, i) => (
                                <div
                                    key={i}
                                    className="flex-shrink-0 w-44 h-28 rounded-lg overflow-hidden relative cursor-pointer group"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${sw.color}`} />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                        <p className="text-xs font-medium text-white">{sw.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* My Files Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-white/80">My files</h2>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5">
                                    <Search size={13} className="text-white/40" />
                                    <input
                                        type="text"
                                        placeholder="Search"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="bg-transparent text-sm text-white placeholder-white/30 outline-none w-36"
                                    />
                                </div>
                                <div className="flex items-center gap-1 bg-[#1a1a1a] border border-white/10 rounded-lg p-1">
                                    <button
                                        onClick={() => setView("list")}
                                        className={`p-1 rounded transition-colors ${view === "list" ? "bg-white/20" : "hover:bg-white/10"
                                            }`}
                                    >
                                        <List size={14} />
                                    </button>
                                    <button
                                        onClick={() => setView("grid")}
                                        className={`p-1 rounded transition-colors ${view === "grid" ? "bg-white/20" : "hover:bg-white/10"
                                            }`}
                                    >
                                        <LayoutGrid size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Empty State */}
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-white/30">
                                <GitBranch size={40} className="mb-3" />
                                <p className="text-sm">No workflows yet</p>
                                <p className="text-xs mt-1">
                                    Click "Create New File" to get started
                                </p>
                            </div>
                        ) : view === "grid" ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {filtered.map((w) => (
                                    <div
                                        key={w.id}
                                        onClick={() => router.push(`/workflow/${w.id}`)}
                                        className="group cursor-pointer"
                                    >
                                        <div className="aspect-[4/3] bg-[#1a1a1a] rounded-xl border border-white/5 group-hover:border-white/20 transition-colors flex items-center justify-center mb-2">
                                            <GitBranch
                                                size={28}
                                                className="text-white/20 group-hover:text-white/40 transition-colors"
                                            />
                                        </div>
                                        <p className="text-xs font-medium text-white/80 truncate">
                                            {w.name}
                                        </p>
                                        <p className="text-xs text-white/30 mt-0.5">
                                            Last edited{" "}
                                            {formatDistanceToNow(new Date(w.updatedAt))} ago
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filtered.map((w) => (
                                    <div
                                        key={w.id}
                                        onClick={() => router.push(`/workflow/${w.id}`)}
                                        className="flex items-center gap-4 p-3 bg-[#1a1a1a] rounded-lg border border-white/5 hover:border-white/20 cursor-pointer transition-colors"
                                    >
                                        <GitBranch size={18} className="text-white/30" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{w.name}</p>
                                            <p className="text-xs text-white/30">
                                                Last edited{" "}
                                                {formatDistanceToNow(new Date(w.updatedAt))} ago
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}