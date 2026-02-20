"use client"

import { useEffect, useCallback, useRef } from "react"
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

export default function WorkflowClient({
  workflowId,
  workflowName,
  initialNodes,
  initialEdges,
}: Props) {
  const {
    setWorkflowId,
    setWorkflowName,
    setNodes,
    setEdges,
    nodes,
    edges,
    setIsSaving,
    setLastSaved,
  } = useWorkflowStore()

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
  }, [])

  useEffect(() => {
    if (!initialized.current) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      saveWorkflow()
    }, 2000)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [nodes, edges])

  return (
    <ReactFlowProvider>
      <div className="flex h-screen w-screen bg-[#0a0a0a] text-white overflow-hidden">
        <LeftSidebar />
        <div className="flex-1 relative overflow-hidden">
          <WorkflowCanvas />
        </div>
        <RightSidebar workflowId={workflowId} />
      </div>
    </ReactFlowProvider>
  )
}
