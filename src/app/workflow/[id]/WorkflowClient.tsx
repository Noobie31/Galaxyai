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

export default function WorkflowClient({ workflowId, workflowName, initialNodes, initialEdges }: Props) {
  const { setWorkflowId, setWorkflowName, setNodes, setEdges, nodes, edges, setIsSaving, setLastSaved } = useWorkflowStore()

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    setWorkflowId(workflowId)
    setWorkflowName(workflowName)
    setNodes(initialNodes || [])
    setEdges(initialEdges || [])
  }, [])

  const saveWorkflow = useCallback(async () => {
    const state = useWorkflowStore.getState()
    setIsSaving(true)
    try {
      await fetch(`/api/workflows/${state.workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: state.workflowName, nodes: state.nodes, edges: state.edges }),
      })
      setLastSaved(new Date())
    } catch (e) {
      console.error("Auto save failed", e)
    } finally {
      setIsSaving(false)
    }
  }, [])

  useEffect(() => {
    if (!initialized.current) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(saveWorkflow, 2000)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [nodes, edges])

  return (
    <ReactFlowProvider>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", background: "#0a0a0a", overflow: "hidden" }}>
        {/* Top navbar - full width, 44px height */}
        <TopNavbar workflowId={workflowId} saveWorkflow={saveWorkflow} />
        {/* Body row - sidebars + canvas */}
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
