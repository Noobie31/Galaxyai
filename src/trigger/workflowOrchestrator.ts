import { task } from "@trigger.dev/sdk/v3"
import { llmTask } from "./llmTask"
import { cropImageTask } from "./cropImageTask"
import { extractFrameTask } from "./extractFrameTask"

const PASSTHROUGH_NODES = new Set(["textNode", "imageUploadNode", "videoUploadNode"])

function topologicalSort(nodes: any[], edges: any[]): string[][] {
  const inDegree: Record<string, number> = {}
  const adjList: Record<string, string[]> = {}
  const nodeIds = nodes.map((n) => n.id)

  nodeIds.forEach((id) => {
    inDegree[id] = 0
    adjList[id] = []
  })
  edges.forEach((edge) => {
    if (adjList[edge.source]) adjList[edge.source].push(edge.target)
    if (inDegree[edge.target] !== undefined) inDegree[edge.target]++
  })

  const levels: string[][] = []
  let queue = nodeIds.filter((id) => inDegree[id] === 0)

  while (queue.length > 0) {
    levels.push([...queue])
    const next: string[] = []
    queue.forEach((id) => {
      adjList[id].forEach((neighbor) => {
        if (--inDegree[neighbor] === 0) next.push(neighbor)
      })
    })
    queue = next
  }
  return levels
}

function unwrapOutput(raw: any): any {
  if (raw == null || typeof raw !== "object") return raw
  if (typeof raw.output === "string") return raw.output
  if (typeof raw.text === "string") return raw.text
  if (typeof raw.url === "string") return raw.url
  return raw
}

function resolveInputs(
  nodeId: string,
  nodes: any[],
  edges: any[],
  nodeOutputs: Record<string, any>
): Record<string, any> {
  const inputs: Record<string, any> = {}
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return inputs

  edges
    .filter((e) => e.target === nodeId)
    .forEach((edge) => {
      const val = nodeOutputs[edge.source]
      if (val == null || val === "") return
      if (edge.targetHandle === "images") {
        if (!inputs.images) inputs.images = []
        Array.isArray(val) ? inputs.images.push(...val) : inputs.images.push(val)
      } else if (edge.targetHandle) {
        inputs[edge.targetHandle] = val
      }
    })

  const d = node.data || {}
  if (node.type === "cropImageNode") {
    if (inputs.x_percent === undefined) inputs.x_percent = d.xPercent ?? 0
    if (inputs.y_percent === undefined) inputs.y_percent = d.yPercent ?? 0
    if (inputs.width_percent === undefined) inputs.width_percent = d.widthPercent ?? 100
    if (inputs.height_percent === undefined) inputs.height_percent = d.heightPercent ?? 100
  }
  if (node.type === "extractFrameNode") {
    if (inputs.timestamp === undefined) inputs.timestamp = d.timestamp ?? "0"
  }
  if (node.type === "llmNode") {
    inputs.model = d.model || "gemini-2.5-flash"
    if (!inputs.system_prompt && d.systemPrompt) inputs.system_prompt = d.systemPrompt
    if (!inputs.user_message && d.userMessage) inputs.user_message = d.userMessage
  }
  return inputs
}

export const workflowOrchestratorTask = task({
  id: "workflow-orchestrator",
  maxDuration: 300,

  run: async (payload: {
    nodes: any[]
    edges: any[]
    workflowId: string
    scope: string
  }) => {
    const { nodes, edges } = payload
    const nodeOutputs: Record<string, any> = {}
    const nodeResults: any[] = []
    const failedNodes = new Set<string>()

    // Seed passthrough node outputs from node data
    for (const node of nodes) {
      if (node.type === "textNode")        nodeOutputs[node.id] = node.data?.text      || ""
      if (node.type === "imageUploadNode") nodeOutputs[node.id] = node.data?.imageUrl  || ""
      if (node.type === "videoUploadNode") nodeOutputs[node.id] = node.data?.videoUrl  || ""
    }

    const levels = topologicalSort(nodes, edges)

    for (const level of levels) {
      const executableIds = level.filter((id) => {
        const node = nodes.find((n) => n.id === id)
        return node && !PASSTHROUGH_NODES.has(node.type)
      })

      if (executableIds.length === 0) continue

      // Run all nodes in this level in parallel using Promise.all + triggerAndWait
      await Promise.all(
        executableIds.map(async (nodeId) => {
          const node = nodes.find((n) => n.id === nodeId)!

          const depFailed = edges
            .filter((e) => e.target === nodeId)
            .some((e) => failedNodes.has(e.source))

          if (depFailed) {
            failedNodes.add(nodeId)
            nodeResults.push({
              nodeId,
              nodeType: node.type,
              status: "failed",
              inputs: {},
              error: "Skipped: upstream dependency failed",
              duration: 0,
            })
            return
          }

          const inputs = resolveInputs(nodeId, nodes, edges, nodeOutputs)

          try {
            let result: any

            if (node.type === "llmNode") {
              result = await llmTask.triggerAndWait({
                model: inputs.model || "gemini-2.5-flash",
                systemPrompt: inputs.system_prompt,
                userMessage: inputs.user_message || "",
                imageUrls: Array.isArray(inputs.images)
                  ? inputs.images.filter(Boolean)
                  : inputs.images
                  ? [inputs.images]
                  : [],
              })
            } else if (node.type === "cropImageNode") {
              result = await cropImageTask.triggerAndWait({
                imageUrl: inputs.image_url,
                xPercent: Number(inputs.x_percent ?? 0),
                yPercent: Number(inputs.y_percent ?? 0),
                widthPercent: Number(inputs.width_percent ?? 100),
                heightPercent: Number(inputs.height_percent ?? 100),
              })
            } else if (node.type === "extractFrameNode") {
              result = await extractFrameTask.triggerAndWait({
                videoUrl: inputs.video_url,
                timestamp: inputs.timestamp ?? "0",
              })
            } else {
              return
            }

            if (result.ok) {
              const output = unwrapOutput((result as any).output)
              nodeOutputs[nodeId] = output
              nodeResults.push({
                nodeId,
                nodeType: node.type,
                status: "success",
                inputs,
                outputs: { output },
              })
            } else {
              failedNodes.add(nodeId)
              nodeResults.push({
                nodeId,
                nodeType: node.type,
                status: "failed",
                inputs,
                error: (result as any).error?.message || "Child task failed",
              })
            }
          } catch (err: any) {
            failedNodes.add(nodeId)
            nodeResults.push({
              nodeId,
              nodeType: node.type,
              status: "failed",
              inputs,
              error: err.message || "Unknown error",
            })
          }
        })
      )
    }

    return {
      status: failedNodes.size > 0 ? "failed" : "success",
      nodeResults,
    }
  },
})