import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { nodes, edges, workflowId, scope } = body

    if (!nodes || !edges || !workflowId) {
      return NextResponse.json({ error: "nodes, edges and workflowId are required" }, { status: 400 })
    }

    const { tasks } = await import("@trigger.dev/sdk/v3")
    const { workflowOrchestratorTask } = await import("@/trigger/workflowOrchestrator")

    // Trigger ONE orchestrator task — it manages all child tasks internally
    const handle = await tasks.trigger(workflowOrchestratorTask.id, {
      nodes,
      edges,
      workflowId,
      scope: scope || "full",
    })

    return NextResponse.json({ runId: handle.id })
  } catch (err: any) {
    console.error("Orchestrate error:", err)
    return NextResponse.json({ error: err.message || "Failed to start orchestrator" }, { status: 500 })
  }
}