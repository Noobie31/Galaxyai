"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { useWorkflowStore } from "@/store/workflowStore"
import LeftSidebar from "@/components/sidebar/LeftSidebar"
import RightSidebar from "@/components/sidebar/RightSidebar"
import WorkflowCanvas from "@/components/canvas/WorkflowCanvas"
import { ReactFlowProvider } from "@xyflow/react"

interface Props {
  workflowId: string
  workflowName: string
  initialNodes: any[]
  initialEdges: any[]
}

function WorkflowClientInner({ workflowId, workflowName, initialNodes, initialEdges }: Props) {
  const { setWorkflowId, setWorkflowName, setNodes, setEdges, setIsSaving, setLastSaved } =
    useWorkflowStore()

  const [showHistory, setShowHistory] = useState(false)
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const initialized = useRef(false)

  // Initialize store once on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    setWorkflowId(workflowId)
    setWorkflowName(workflowName)
    setNodes(initialNodes ?? [])
    setEdges(initialEdges ?? [])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveWorkflow = useCallback(async () => {
    const state = useWorkflowStore.getState()
    setIsSaving(true)
    try {
      await fetch(`/api/workflows/${state.workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.workflowName,
          nodes: state.nodes,
          edges: state.edges,
        }),
      })
      setLastSaved(new Date())
    } catch (e) {
      console.error("Auto save failed", e)
    } finally {
      setIsSaving(false)
    }
  }, [setIsSaving, setLastSaved])

  // Ctrl+S save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        saveWorkflow()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [saveWorkflow])

  // Auto-save when nodes/edges/name change
  useEffect(() => {
    let prevNodes = useWorkflowStore.getState().nodes
    let prevEdges = useWorkflowStore.getState().edges
    let prevName = useWorkflowStore.getState().workflowName

    const unsubscribe = useWorkflowStore.subscribe((state) => {
      const changed =
        state.nodes !== prevNodes ||
        state.edges !== prevEdges ||
        state.workflowName !== prevName

      if (!changed) return
      prevNodes = state.nodes
      prevEdges = state.edges
      prevName = state.workflowName

      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = setTimeout(saveWorkflow, 2000)
    })

    return () => {
      unsubscribe()
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [saveWorkflow])

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", background: "#0a0a0a", overflow: "hidden" }}>
      {/* Left sidebar */}
      <LeftSidebar />

      {/* Canvas */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <WorkflowCanvas onHistoryToggle={() => setShowHistory((v) => !v)} />
      </div>

      {/* Right sidebar — shown when history toggled */}
      {showHistory && (
        <RightSidebar
          workflowId={workflowId}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}

export default function WorkflowClient(props: Props) {
  return (
    <ReactFlowProvider>
      <WorkflowClientInner {...props} />
    </ReactFlowProvider>
  )
}