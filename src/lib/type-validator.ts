import { Connection } from "@xyflow/react"

// Which handles accept which output types
const HANDLE_TYPES: Record<string, string[]> = {
  // LLM Node inputs
  system_prompt: ["text"],
  user_message: ["text"],
  images: ["image"],
  // Crop Image inputs
  image_url: ["image"],
  x_percent: ["text", "number"],
  y_percent: ["text", "number"],
  width_percent: ["text", "number"],
  height_percent: ["text", "number"],
  // Extract Frame inputs
  video_url: ["video"],
  timestamp: ["text", "number"],
}

// What type does each node output?
const NODE_OUTPUT_TYPES: Record<string, string> = {
  textNode: "text",
  imageUploadNode: "image",
  videoUploadNode: "video",
  cropImageNode: "image",
  extractFrameNode: "image",
  llmNode: "text",
}

export function validateConnection(connection: Connection, nodes: any[]): boolean {
  const sourceNode = nodes.find((n) => n.id === connection.source)
  const targetHandle = connection.targetHandle

  if (!sourceNode || !targetHandle) return true // allow if we can't validate

  const outputType = NODE_OUTPUT_TYPES[sourceNode.type]
  const acceptedTypes = HANDLE_TYPES[targetHandle]

  if (!outputType || !acceptedTypes) return true // allow unknown

  if (!acceptedTypes.includes(outputType)) {
    console.warn(
      `Type mismatch: ${sourceNode.type} outputs "${outputType}" but ${targetHandle} accepts [${acceptedTypes.join(", ")}]`
    )
    return false
  }

  return true
}

// Cycle detection using DFS
export function hasCycle(
  nodes: any[],
  edges: any[],
  newEdge: { source: string; target: string }
): boolean {
  // Build adjacency list including the new edge
  const adj: Record<string, string[]> = {}
  nodes.forEach((n) => { adj[n.id] = [] })
  edges.forEach((e) => {
    if (adj[e.source]) adj[e.source].push(e.target)
  })
  // Add proposed edge
  if (adj[newEdge.source]) adj[newEdge.source].push(newEdge.target)

  // DFS from newEdge.source — if we can reach newEdge.source again, there's a cycle
  const visited = new Set<string>()
  const stack = [newEdge.target]

  while (stack.length > 0) {
    const current = stack.pop()!
    if (current === newEdge.source) return true
    if (visited.has(current)) continue
    visited.add(current)
      ; (adj[current] || []).forEach((neighbor) => stack.push(neighbor))
  }

  return false
}