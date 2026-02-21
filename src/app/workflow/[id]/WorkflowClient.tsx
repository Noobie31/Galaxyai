"use client"

import { useEffect, useCallback, useRef } from "react"
import { useWorkflowStore } from "@/store/workflowStore"
import LeftSidebar from "@/components/sidebar/LeftSidebar"
import RightSidebar from "@/components/sidebar/RightSidebar"
import WorkflowCanvas from "@/components/canvas/WorkflowCanvas"
import TopNavbar from "@/components/canvas/TopNavbar"
import { ReactFlowProvider } from "@xyflow/react"

interface Props {
  workflowId: string
  workflowName: string
  initialNodes: any[]
  initialEdges: any[]
}

export default function WorkflowClient({
  workflowId,
  workflowName,
  initialNodes,
  initialEdges,
}: Props) {
  const { setWorkflowId, setWorkflowName, setNodes, setEdges, setIsSaving, setLastSaved } =
    useWorkflowStore()

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const initialized = useRef(false)

  // Initialize store with server data once
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    setWorkflowId(workflowId)
    setWorkflowName(workflowName)
    setNodes(initialNodes || [])
    setEdges(initialEdges || [])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveWorkflow = useCallback(async () => {
    // Always read fresh from store — avoids stale closure bug
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

  // Auto-save on node/edge changes — subscribe to store directly to avoid stale values
  useEffect(() => {
    if (!initialized.current) return

    // Subscribe to store changes for auto-save
    const unsubscribe = useWorkflowStore.subscribe(() => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = setTimeout(saveWorkflow, 2000)
    })

    return () => {
      unsubscribe()
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [saveWorkflow])

  return (
    <ReactFlowProvider>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          width: "100vw",
          background: "#0a0a0a",
          overflow: "hidden",
        }}
      >
        <TopNavbar workflowId={workflowId} saveWorkflow={saveWorkflow} />
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <LeftSidebar />
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <WorkflowCanvas />
          </div>
          <RightSidebar workflowId={workflowId} />
        </div>
      </div>
    </ReactFlowProvider>
  )
}