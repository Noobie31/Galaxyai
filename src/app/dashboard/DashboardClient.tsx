"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useUser, useClerk } from "@clerk/nextjs"
import {
  Plus, Search, ChevronDown,
  Home, ImageIcon, Video, Pen, Type, Folder,
  Clock, ExternalLink, Pencil, Copy, Trash2, LogOut, User, Check,
} from "lucide-react"

interface Workflow {
  id: string
  name: string
  updatedAt: string
  createdAt?: string
  userId?: string
  nodes?: any[] | null
  edges?: any[] | null
}

interface Props {
  workflows?: Workflow[]
  userId?: string
}

type SortBy = "lastViewed" | "dateCreated" | "alphabetical"
type OrderBy = "newest" | "oldest"

export default function DashboardClient({ workflows: initialWorkflows = [], userId }: Props) {
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useClerk()

  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows)
  const [activeTab, setActiveTab] = useState("Projects")
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isLoadingSample, setIsLoadingSample] = useState(false)

  // Sort state
  const [sortBy, setSortBy] = useState<SortBy>("lastViewed")
  const [orderBy, setOrderBy] = useState<OrderBy>("newest")
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; workflow: Workflow } | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const contextRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  const tabs = ["Projects", "Apps", "Examples", "Templates"]

  const bg = "#0a0a0a"
  const navBg = "rgba(10,10,10,0.96)"
  const navBorder = "rgba(255,255,255,0.06)"
  const textPrimary = "white"
  const textSecondary = "rgba(255,255,255,0.45)"
  const textMuted = "rgba(255,255,255,0.25)"

  useEffect(() => { fetchWorkflows() }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) setContextMenu(null)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) setSortDropdownOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const fetchWorkflows = async () => {
    try {
      const res = await fetch("/api/workflows")
      if (res.ok) setWorkflows(await res.json())
    } catch (e) { console.error(e) }
  }

  const createWorkflow = async () => {
    setIsCreating(true)
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled" }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        alert(`Failed to create workflow: ${err.error || res.status}`)
        return
      }
      router.push(`/workflow/${(await res.json()).id}`)
    } catch (e: any) {
      alert(`Network error: ${e.message}. Check your environment variables in Vercel.`)
    } finally {
      setIsCreating(false)
    }
  }

  const loadSampleWorkflow = async () => {
    setIsLoadingSample(true)
    try {
      const res = await fetch("/api/workflows/sample", { method: "POST" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        alert(`Failed to load sample: ${err.error || res.status}`)
        return
      }
      router.push(`/workflow/${(await res.json()).id}`)
    } catch (e: any) {
      alert(`Network error: ${e.message}`)
    } finally {
      setIsLoadingSample(false)
    }
  }

  const deleteWorkflow = async (id: string) => {
    try {
      await fetch(`/api/workflows/${id}`, { method: "DELETE" })
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
    } catch (e) { console.error(e) }
    setContextMenu(null)
  }

  const duplicateWorkflow = async (wf: Workflow) => {
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${wf.name} (copy)`, nodes: wf.nodes, edges: wf.edges }),
      })
      if (res.ok) fetchWorkflows()
    } catch (e) { console.error(e) }
    setContextMenu(null)
  }

  const renameWorkflow = async (id: string, name: string) => {
    try {
      await fetch(`/api/workflows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      setWorkflows((prev) => prev.map((w) => w.id === id ? { ...w, name } : w))
    } catch (e) { console.error(e) }
    setRenamingId(null)
  }

  // ── Sort + filter ──
  const sortedWorkflows = useMemo(() => {
    const filtered = workflows.filter((w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    return [...filtered].sort((a, b) => {
      if (sortBy === "alphabetical") {
        const cmp = a.name.localeCompare(b.name)
        return orderBy === "oldest" ? -cmp : cmp
      }
      const dateKey = sortBy === "dateCreated" ? "createdAt" : "updatedAt"
      const aTime = new Date((a as any)[dateKey] ?? a.updatedAt).getTime()
      const bTime = new Date((b as any)[dateKey] ?? b.updatedAt).getTime()
      return orderBy === "newest" ? bTime - aTime : aTime - bTime
    })
  }, [workflows, searchQuery, sortBy, orderBy])

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `Edited ${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `Edited ${hrs}h ago`
    return `Edited ${Math.floor(hrs / 24)}d ago`
  }

  const sortLabel = sortBy === "lastViewed" ? "Last viewed" : sortBy === "dateCreated" ? "Date created" : "Alphabetical"

  const userInitial = user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U"
  const userEmail = user?.emailAddresses?.[0]?.emailAddress || ""
  const userName = user?.fullName || user?.firstName || "User"

  return (
    <div
      style={{ minHeight: "100vh", background: bg, color: textPrimary, fontFamily: "system-ui, -apple-system, sans-serif" }}
      onClick={() => { setContextMenu(null); setSortDropdownOpen(false) }}
    >
      {/* ── TOP NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px",
        background: navBg,
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${navBorder}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
          <div style={{
            width: 28, height: 28, background: "white",
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ color: "black", fontWeight: 900, fontSize: 13 }}>N</span>
          </div>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 1,
          background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "3px",
          border: `1px solid rgba(255,255,255,0.07)`,
        }}>
          {[
            { icon: <Home size={15} />, label: "Home" },
            { icon: <ImageIcon size={15} />, label: "Image" },
            { icon: <Video size={15} />, label: "Video" },
            { icon: <Pen size={15} />, label: "Enhancer" },
            { icon: <Type size={15} />, label: "Edit" },
            { icon: <Folder size={15} />, label: "Assets" },
            {
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="7" cy="7" r="2" /><circle cx="17" cy="7" r="2" />
                  <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
                  <path d="M9 7h6M7 9v6M17 9v6M9 17h6" />
                </svg>
              ),
              label: "Nodes", active: true,
            },
          ].map((item) => (
            <NavIconBtn key={item.label} {...item} textSecondary={textSecondary} />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 120, justifyContent: "flex-end" }}>
          <NavBtn><Search size={15} /></NavBtn>
          <button style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "#2563eb", border: "none", borderRadius: 8,
            padding: "6px 12px", color: "white", fontSize: 12, fontWeight: 600,
            cursor: "pointer", whiteSpace: "nowrap",
          }}>
            ↑ Upgrade Now
          </button>

          <div ref={userMenuRef} style={{ position: "relative" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setUserMenuOpen((v) => !v) }}
              style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: "white",
                cursor: "pointer", border: "none", flexShrink: 0,
              }}
            >
              {userInitial}
            </button>

            {userMenuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "#1a1a1a", border: `1px solid rgba(255,255,255,0.12)`,
                borderRadius: 12, padding: 6, minWidth: 220,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 200,
              }}>
                <div style={{ padding: "8px 10px 10px", borderBottom: `1px solid rgba(255,255,255,0.07)`, marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0,
                    }}>
                      {userInitial}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</p>
                      <p style={{ margin: 0, fontSize: 11, color: textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setUserMenuOpen(false)} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 9,
                  padding: "8px 10px", border: "none", borderRadius: 7,
                  background: "none", cursor: "pointer", color: textSecondary, fontSize: 13,
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <User size={13} /> Profile
                </button>
                <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "3px 0" }} />
                <button
                  onClick={() => signOut({ redirectUrl: "/sign-in" })}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 9,
                    padding: "8px 10px", border: "none", borderRadius: 7,
                    background: "none", cursor: "pointer", color: "#f87171", fontSize: 13,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(248,113,113,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div style={{ paddingTop: 52 }}>
        {/* Hero Banner */}
        <div style={{ padding: "20px 60px 0" }}>
          <div style={{
            borderRadius: 14, overflow: "hidden",
            position: "relative", height: 220, background: "#111",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(https://s.krea.ai/nodesHeaderBannerBlurGradient.webp)`,
              backgroundSize: "cover", backgroundPosition: "center right",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to right, rgba(0,0,0,0.9) 30%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0.05) 100%)",
            }} />
            <div style={{
              position: "relative", zIndex: 1, padding: "28px 32px", height: "100%",
              display: "flex", flexDirection: "column", gap: 10, boxSizing: "border-box",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, background: "rgba(20,20,20,0.8)",
                  borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                    <circle cx="7" cy="7" r="2" /><circle cx="17" cy="7" r="2" />
                    <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
                    <path d="M9 7h6M7 9v6M17 9v6M9 17h6" />
                  </svg>
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "white", margin: 0, letterSpacing: "-0.01em" }}>Nodes</h1>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", maxWidth: 300, lineHeight: 1.65, margin: 0 }}>
                Nodes is the most powerful way to operate NextFlow. Connect every tool and model into complex automated pipelines.
              </p>
              <div style={{ marginTop: "auto" }}>
                <button onClick={createWorkflow} disabled={isCreating} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "white", border: "none", borderRadius: 8,
                  padding: "8px 16px", color: "black", fontSize: 13, fontWeight: 600,
                  cursor: isCreating ? "not-allowed" : "pointer",
                }}>
                  <Plus size={13} />
                  {isCreating ? "Creating..." : "New Workflow"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs + Search + Sort ── */}
        <div style={{ padding: "20px 60px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex" }}>
              {tabs.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "8px 16px", background: "none", border: "none",
                  borderBottom: activeTab === tab ? `2px solid ${textPrimary}` : "2px solid transparent",
                  color: activeTab === tab ? textPrimary : textSecondary,
                  fontSize: 14, fontWeight: activeTab === tab ? 600 : 400, cursor: "pointer",
                }}>
                  {tab}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Search */}
              <div style={{ position: "relative" }}>
                <Search size={12} style={{
                  position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
                  color: textMuted, pointerEvents: "none",
                }} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid rgba(255,255,255,0.08)`,
                    borderRadius: 8, paddingLeft: 28, paddingRight: 12,
                    paddingTop: 6, paddingBottom: 6,
                    color: textPrimary, fontSize: 13, outline: "none", width: 190,
                  }}
                />
              </div>

              {/* ── Sort / Order dropdown ── */}
              <div
                ref={sortDropdownRef}
                style={{ position: "relative" }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSortDropdownOpen((v) => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: sortDropdownOpen ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${sortDropdownOpen ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 8, padding: "6px 12px",
                    color: sortDropdownOpen ? "white" : textSecondary,
                    fontSize: 13, cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {sortLabel}
                  <ChevronDown
                    size={13}
                    style={{
                      transform: sortDropdownOpen ? "rotate(180deg)" : "rotate(0)",
                      transition: "transform 0.2s",
                      opacity: 0.55,
                    }}
                  />
                </button>

                {sortDropdownOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0,
                    background: "#161616",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12, padding: "5px",
                    minWidth: 186, zIndex: 500,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
                  }}>
                    {/* Sort by section */}
                    <p style={{
                      fontSize: 10, fontWeight: 600,
                      color: "rgba(255,255,255,0.22)",
                      textTransform: "uppercase", letterSpacing: "0.09em",
                      margin: 0, padding: "5px 10px 5px",
                    }}>
                      Sort by
                    </p>
                    {([
                      { value: "lastViewed" as SortBy, label: "Last viewed" },
                      { value: "dateCreated" as SortBy, label: "Date created" },
                      { value: "alphabetical" as SortBy, label: "Alphabetical" },
                    ]).map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setSortBy(item.value)}
                        style={{
                          width: "100%", display: "flex", alignItems: "center",
                          justifyContent: "space-between",
                          padding: "7px 10px", border: "none", borderRadius: 7,
                          background: "none", cursor: "pointer",
                          color: sortBy === item.value ? "white" : "rgba(255,255,255,0.5)",
                          fontSize: 13, fontWeight: sortBy === item.value ? 500 : 400,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        {item.label}
                        {sortBy === item.value && (
                          <Check size={12} style={{ color: "white", flexShrink: 0 }} />
                        )}
                      </button>
                    ))}

                    <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "4px 0" }} />

                    {/* Order by section */}
                    <p style={{
                      fontSize: 10, fontWeight: 600,
                      color: "rgba(255,255,255,0.22)",
                      textTransform: "uppercase", letterSpacing: "0.09em",
                      margin: 0, padding: "5px 10px 5px",
                    }}>
                      Order by
                    </p>
                    {([
                      { value: "newest" as OrderBy, label: "Newest first" },
                      { value: "oldest" as OrderBy, label: "Oldest first" },
                    ]).map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setOrderBy(item.value)}
                        style={{
                          width: "100%", display: "flex", alignItems: "center",
                          justifyContent: "space-between",
                          padding: "7px 10px", border: "none", borderRadius: 7,
                          background: "none", cursor: "pointer",
                          color: orderBy === item.value ? "white" : "rgba(255,255,255,0.5)",
                          fontSize: 13, fontWeight: orderBy === item.value ? 500 : 400,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        {item.label}
                        {orderBy === item.value && (
                          <Check size={12} style={{ color: "white", flexShrink: 0 }} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginTop: 0 }} />
        </div>

        {/* Grid */}
        <div style={{ padding: "20px 60px 60px" }}>
          {activeTab === "Templates" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              <TemplateCard
                name="Product Marketing Kit Generator"
                description="All 6 node types in one workflow. Two parallel branches (image crop + video frame extraction) converge at a final LLM node to generate marketing copy."
                nodeCount={9}
                tags={["Parallel", "Multi-modal", "LLM"]}
                onClick={loadSampleWorkflow}
                isLoading={isLoadingSample}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              />
            </div>
          ) : activeTab === "Projects" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              <WorkflowCard isNew onClick={createWorkflow} isCreating={isCreating} textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted} />
              {sortedWorkflows.map((wf) => (
                <WorkflowCard
                  key={wf.id} workflow={wf}
                  isRenaming={renamingId === wf.id}
                  renameValue={renameValue}
                  onRenameChange={setRenameValue}
                  onRenameSubmit={() => renameWorkflow(wf.id, renameValue)}
                  onClick={() => router.push(`/workflow/${wf.id}`)}
                  onContextMenu={(e: React.MouseEvent) => {
                    e.preventDefault(); e.stopPropagation()
                    setContextMenu({ x: e.clientX, y: e.clientY, workflow: wf })
                  }}
                  formatTime={formatTime}
                  textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted}
                />
              ))}
            </div>
          ) : (
            <EmptyState textMuted={textMuted} />
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div ref={contextRef} onClick={(e) => e.stopPropagation()} style={{
          position: "fixed", top: contextMenu.y, left: contextMenu.x,
          background: "#1a1a1a", border: `1px solid rgba(255,255,255,0.1)`,
          borderRadius: 10, padding: 4, zIndex: 1000, minWidth: 160,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          {[
            { icon: <ExternalLink size={13} />, label: "Open", onClick: () => { router.push(`/workflow/${contextMenu.workflow.id}`); setContextMenu(null) }, danger: false },
            { icon: <Pencil size={13} />, label: "Rename", onClick: () => { setRenamingId(contextMenu.workflow.id); setRenameValue(contextMenu.workflow.name); setContextMenu(null) }, danger: false },
            { icon: <Copy size={13} />, label: "Duplicate", onClick: () => duplicateWorkflow(contextMenu.workflow), danger: false },
            null,
            { icon: <Trash2 size={13} />, label: "Delete", onClick: () => deleteWorkflow(contextMenu.workflow.id), danger: true },
          ].map((item, i) =>
            item === null ? (
              <div key={i} style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "3px 0" }} />
            ) : (
              <button key={item.label} onClick={item.onClick} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 9,
                padding: "8px 10px", border: "none", borderRadius: 7, background: "none",
                cursor: "pointer", color: item.danger ? "#f87171" : "rgba(255,255,255,0.7)", fontSize: 13,
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = item.danger ? "rgba(248,113,113,0.08)" : "rgba(255,255,255,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                {item.icon}{item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

/* ── Shared small components ── */

function NavBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
      background: "none", border: "none", cursor: "pointer", borderRadius: 8,
      color: "rgba(255,255,255,0.4)",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)" }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,0.4)" }}
    >
      {children}
    </button>
  )
}

function NavIconBtn({ icon, label, active, textSecondary }: any) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: "relative" }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button style={{
        width: 34, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? "rgba(255,255,255,0.12)" : "none",
        border: "none", borderRadius: 8, cursor: "pointer",
        color: active ? "white" : textSecondary,
      }}
        onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.75)" } }}
        onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = textSecondary } }}
      >
        {icon}
      </button>
      {show && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
          background: "#1e1e1e", border: `1px solid rgba(255,255,255,0.1)`,
          borderRadius: 6, padding: "4px 8px",
          fontSize: 11, color: "rgba(255,255,255,0.8)",
          whiteSpace: "nowrap", pointerEvents: "none", zIndex: 200,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}>
          {label}
        </div>
      )}
    </div>
  )
}

function WorkflowCard({ isNew, onClick, onContextMenu, isCreating, workflow, isRenaming, renameValue, onRenameChange, onRenameSubmit, formatTime, textPrimary, textSecondary, textMuted }: any) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onClick={onClick} onContextMenu={onContextMenu}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 12, cursor: "pointer", overflow: "hidden", transition: "all 0.15s",
      }}
    >
      <div style={{
        height: 140,
        background: isNew ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.03)",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderBottom: `1px solid rgba(255,255,255,0.05)`,
      }}>
        {isNew ? (
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid rgba(255,255,255,0.1)`,
          }}>
            <Plus size={16} style={{ color: "rgba(255,255,255,0.4)" }} />
          </div>
        ) : (
          <WorkflowThumbnail nodes={workflow?.nodes} edges={workflow?.edges} />
        )}
      </div>
      <div style={{ padding: "10px 12px" }}>
        {isNew ? (
          <p style={{ fontSize: 14, fontWeight: 500, color: textSecondary, margin: 0 }}>
            {isCreating ? "Creating..." : "New Workflow"}
          </p>
        ) : isRenaming ? (
          <input autoFocus value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onBlur={onRenameSubmit}
            onKeyDown={(e) => { if (e.key === "Enter") onRenameSubmit(); if (e.key === "Escape") onRenameChange(workflow.name) }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", background: "rgba(255,255,255,0.08)",
              border: `1px solid rgba(255,255,255,0.2)`,
              borderRadius: 5, padding: "3px 7px", color: textPrimary, fontSize: 14, outline: "none", boxSizing: "border-box",
            }}
          />
        ) : (
          <>
            <p style={{ fontSize: 14, fontWeight: 500, color: textPrimary, margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {workflow.name}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={10} style={{ color: textMuted }} />
              <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>{formatTime(workflow.updatedAt)}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function WorkflowThumbnail({ nodes, edges }: { nodes?: any[]; edges?: any[] }) {
  if (!nodes?.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 24, background: "rgba(255,255,255,0.07)", borderRadius: 5, border: `1px solid rgba(255,255,255,0.1)` }} />
        <div style={{ width: 44, height: 24, background: "rgba(255,255,255,0.05)", borderRadius: 5, border: `1px solid rgba(255,255,255,0.08)` }} />
      </div>
    )
  }
  return (
    <svg width="120" height="80" viewBox="0 0 120 80">
      {edges?.slice(0, 3).map((e: any, i: number) => (
        <line key={i} x1={20 + i * 18} y1={40} x2={58 + i * 18} y2={40}
          stroke="rgba(168,85,247,0.45)" strokeWidth="1.5" />
      ))}
      {nodes?.slice(0, 4).map((n: any, i: number) => (
        <rect key={i}
          x={8 + (i % 2) * 62} y={14 + Math.floor(i / 2) * 36}
          width={46} height={26} rx={4}
          fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)" strokeWidth="1"
        />
      ))}
    </svg>
  )
}

function TemplateCard({ name, description, nodeCount, tags, onClick, isLoading, textPrimary, textSecondary }: any) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={!isLoading ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 12, cursor: isLoading ? "not-allowed" : "pointer",
        overflow: "hidden", transition: "all 0.15s", opacity: isLoading ? 0.7 : 1,
      }}
    >
      <div style={{
        height: 120,
        background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.12))",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderBottom: `1px solid rgba(255,255,255,0.05)`,
        position: "relative", overflow: "hidden",
      }}>
        <svg width="160" height="90" viewBox="0 0 160 90">
          <rect x="4" y="8" width="30" height="16" rx="3" fill="rgba(14,165,233,0.25)" stroke="rgba(14,165,233,0.5)" strokeWidth="1" />
          <rect x="44" y="8" width="30" height="16" rx="3" fill="rgba(234,179,8,0.25)" stroke="rgba(234,179,8,0.5)" strokeWidth="1" />
          <rect x="84" y="8" width="30" height="16" rx="3" fill="rgba(99,102,241,0.25)" stroke="rgba(99,102,241,0.5)" strokeWidth="1" />
          <rect x="4" y="52" width="30" height="16" rx="3" fill="rgba(245,158,11,0.25)" stroke="rgba(245,158,11,0.5)" strokeWidth="1" />
          <rect x="44" y="52" width="30" height="16" rx="3" fill="rgba(244,63,94,0.25)" stroke="rgba(244,63,94,0.5)" strokeWidth="1" />
          <rect x="124" y="30" width="32" height="30" rx="4" fill="rgba(168,85,247,0.3)" stroke="rgba(168,85,247,0.7)" strokeWidth="1.5" />
          <path d="M34 16 L44 16" stroke="rgba(168,85,247,0.6)" strokeWidth="1.2" fill="none" />
          <path d="M74 16 L84 16" stroke="rgba(168,85,247,0.6)" strokeWidth="1.2" fill="none" />
          <path d="M114 16 L140 30" stroke="rgba(168,85,247,0.6)" strokeWidth="1.2" fill="none" />
          <path d="M34 60 L44 60" stroke="rgba(168,85,247,0.6)" strokeWidth="1.2" fill="none" />
          <path d="M74 60 L140 60" stroke="rgba(168,85,247,0.6)" strokeWidth="1.2" fill="none" />
          <text x="19" y="20" fontSize="4" fill="rgba(255,255,255,0.5)" textAnchor="middle">IMG</text>
          <text x="59" y="20" fontSize="4" fill="rgba(255,255,255,0.5)" textAnchor="middle">CROP</text>
          <text x="99" y="20" fontSize="4" fill="rgba(255,255,255,0.5)" textAnchor="middle">LLM</text>
          <text x="19" y="64" fontSize="4" fill="rgba(255,255,255,0.5)" textAnchor="middle">VID</text>
          <text x="59" y="64" fontSize="4" fill="rgba(255,255,255,0.5)" textAnchor="middle">FRAME</text>
          <text x="140" y="48" fontSize="5" fill="rgba(255,255,255,0.7)" textAnchor="middle">LLM</text>
          <text x="140" y="54" fontSize="3.5" fill="rgba(168,85,247,0.8)" textAnchor="middle">#2</text>
        </svg>
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.4)",
          borderRadius: 4, padding: "2px 6px",
          fontSize: 9, fontWeight: 700, color: "rgba(168,85,247,0.9)", letterSpacing: "0.05em",
        }}>
          PARALLEL
        </div>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: textPrimary, margin: "0 0 6px" }}>{name}</p>
        <p style={{ fontSize: 11, color: textSecondary, margin: "0 0 10px", lineHeight: 1.6 }}>{description}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", padding: "2px 7px", borderRadius: 5 }}>
            {nodeCount} nodes
          </span>
          {tags?.map((tag: string) => (
            <span key={tag} style={{
              fontSize: 10, color: "rgba(168,85,247,0.7)",
              background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)",
              padding: "2px 7px", borderRadius: 5,
            }}>
              {tag}
            </span>
          ))}
        </div>
        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              border: "2px solid rgba(168,85,247,0.3)", borderTop: "2px solid rgba(168,85,247,0.8)",
              animation: "spin 0.7s linear infinite",
            }} />
            <span style={{ fontSize: 11, color: "rgba(168,85,247,0.7)" }}>Loading workflow...</span>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function EmptyState({ textMuted }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 180, gap: 10 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Folder size={18} style={{ color: textMuted }} />
      </div>
      <p style={{ color: textMuted, fontSize: 14, margin: 0 }}>Nothing here yet</p>
    </div>
  )
}