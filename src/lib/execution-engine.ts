import { useExecutionStore } from "@/store/executionStore"
import { useWorkflowStore } from "@/store/workflowStore"

// Non-executable node types — output resolved directly from node data
const PASSTHROUGH_NODES = new Set(["textNode", "imageUploadNode", "videoUploadNode"])

// Topological sort — returns levels for parallel execution
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
        const nextQueue: string[] = []
        queue.forEach((nodeId) => {
            adjList[nodeId].forEach((neighbor) => {
                inDegree[neighbor]--
                if (inDegree[neighbor] === 0) nextQueue.push(neighbor)
            })
        })
        queue = nextQueue
    }

    return levels
}

// ✅ Unwrap output objects so downstream nodes always get a plain value
// cropImageTask returns { output: url }, extractFrameTask returns { output: url }
// llmNode might return { output: text } or { text: "..." }
function unwrapOutput(raw: any): any {
    if (raw === null || raw === undefined) return raw
    if (typeof raw === "string") return raw
    if (typeof raw === "number" || typeof raw === "boolean") return raw
    if (typeof raw === "object") {
        // Most common shape from our tasks: { output: "https://..." }
        if (typeof raw.output === "string") return raw.output
        // LLM might return { text: "..." }
        if (typeof raw.text === "string") return raw.text
        // Some tasks return { url: "..." }
        if (typeof raw.url === "string") return raw.url
    }
    return raw
}

// Get output value from a node (passthrough nodes read directly from data)
function getNodeOutput(nodeId: string, nodes: any[]): any {
    const node = nodes.find((n) => n.id === nodeId)

    if (node?.type === "textNode") return node.data?.text || ""
    if (node?.type === "imageUploadNode") return node.data?.imageUrl || ""
    if (node?.type === "videoUploadNode") return node.data?.videoUrl || ""

    // For executable nodes, get from execution store and unwrap
    const raw = useExecutionStore.getState().nodeStates[nodeId]?.output
    return unwrapOutput(raw)
}

// Resolve all inputs for a node from connected edges + node data defaults
function resolveNodeInputs(nodeId: string, nodes: any[], edges: any[]): Record<string, any> {
    const inputs: Record<string, any> = {}
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return inputs

    const incomingEdges = edges.filter((e) => e.target === nodeId)

    incomingEdges.forEach((edge) => {
        const sourceOutput = getNodeOutput(edge.source, nodes)
        if (sourceOutput !== undefined && sourceOutput !== null && sourceOutput !== "" && edge.targetHandle) {
            if (edge.targetHandle === "images") {
                if (!inputs.images) inputs.images = []
                if (Array.isArray(sourceOutput)) {
                    inputs.images.push(...sourceOutput)
                } else {
                    inputs.images.push(sourceOutput)
                }
            } else {
                inputs[edge.targetHandle] = sourceOutput
            }
        }
    })

    // Fill defaults from node data for unconnected handles
    const nodeData = node.data || {}

    if (node.type === "textNode") inputs.text = nodeData.text
    if (node.type === "imageUploadNode") inputs.image_url = nodeData.imageUrl
    if (node.type === "videoUploadNode") inputs.video_url = nodeData.videoUrl

    if (node.type === "cropImageNode") {
        if (inputs.x_percent === undefined) inputs.x_percent = nodeData.xPercent ?? 0
        if (inputs.y_percent === undefined) inputs.y_percent = nodeData.yPercent ?? 0
        if (inputs.width_percent === undefined) inputs.width_percent = nodeData.widthPercent ?? 100
        if (inputs.height_percent === undefined) inputs.height_percent = nodeData.heightPercent ?? 100
    }

    if (node.type === "extractFrameNode") {
        if (inputs.timestamp === undefined) inputs.timestamp = nodeData.timestamp ?? "0"
    }

    if (node.type === "llmNode") {
        inputs.model = nodeData.model || "gemini-2.5-flash"
        if (!inputs.system_prompt && nodeData.systemPrompt) {
            inputs.system_prompt = nodeData.systemPrompt
        }
        if (!inputs.user_message && nodeData.userMessage) {
            inputs.user_message = nodeData.userMessage
        }
    }

    return inputs
}

// Check if any direct dependency (upstream node) has failed
function hasDependencyFailed(nodeId: string, edges: any[], failedNodes: Set<string>): boolean {
    const incomingEdges = edges.filter((e) => e.target === nodeId)
    return incomingEdges.some((edge) => failedNodes.has(edge.source))
}

// Poll a Trigger.dev run until completion or failure
async function pollRun(
    runId: string,
    nodeId: string,
    timeoutMs = 300000
): Promise<any> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
        await new Promise((r) => setTimeout(r, 2000))

        try {
            const res = await fetch(`/api/execute/poll?runId=${runId}`)
            const data = await res.json()

            if (data.status === "COMPLETED") {
                return data.output
            }

            if (data.status === "FAILED") {
                throw new Error(data.error || "Task failed")
            }

            // PENDING — keep polling
        } catch (err: any) {
            if (err.message && err.message !== "Failed to fetch") throw err
            if (Date.now() - startTime > timeoutMs - 5000) throw err
        }
    }

    throw new Error("Task timed out after 5 minutes")
}

// Execute a single node via API + poll if needed
async function executeNode(
    nodeId: string,
    nodeType: string,
    inputs: Record<string, any>
): Promise<any> {
    const {
        setNodeStatus,
        setNodeOutput,
        setNodeError,
        setNodeStartTime,
        setNodeDuration,
    } = useExecutionStore.getState()

    // Passthrough nodes don't need API execution
    if (PASSTHROUGH_NODES.has(nodeType)) {
        setNodeStatus(nodeId, "success")
        const output = inputs.text || inputs.image_url || inputs.video_url || ""
        setNodeOutput(nodeId, output)
        return output
    }

    setNodeStatus(nodeId, "running")
    setNodeStartTime(nodeId, Date.now())

    try {
        const res = await fetch("/api/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nodeId, nodeType, inputs }),
        })

        const result = await res.json()

        if (!res.ok || result.error) {
            throw new Error(result.error || "Execution failed")
        }

        let output: any

        if (result.pending && result.runId) {
            output = await pollRun(result.runId, nodeId)
        } else {
            output = result.output
        }

        const duration =
            Date.now() - (useExecutionStore.getState().nodeStates[nodeId]?.startTime || Date.now())
        setNodeDuration(nodeId, duration)
        setNodeStatus(nodeId, "success")
        // ✅ Store raw output as-is (node component does its own unwrapping for display)
        setNodeOutput(nodeId, output)

        return output
    } catch (err: any) {
        const duration =
            Date.now() - (useExecutionStore.getState().nodeStates[nodeId]?.startTime || Date.now())
        setNodeDuration(nodeId, duration)
        setNodeStatus(nodeId, "failed")
        setNodeError(nodeId, err.message || "Unknown error")
        throw err
    }
}

// Save run to database
async function saveRun(
    workflowId: string,
    scope: string,
    status: string,
    duration: number,
    nodeResults: any[]
) {
    try {
        const res = await fetch("/api/runs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workflowId, scope, status, duration }),
        })
        const run = await res.json()

        if (run.id && nodeResults.length > 0) {
            await Promise.all(
                nodeResults.map((nr) =>
                    fetch("/api/runs/nodes", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ runId: run.id, ...nr }),
                    })
                )
            )
        }
    } catch (e) {
        console.error("Failed to save run", e)
    }
}

// Run full workflow
export async function runWorkflow(
    workflowId: string,
    nodes: any[],
    edges: any[],
    scope: "full" | "partial" | "single"
) {
    const { setIsRunning, resetNodeStates } = useExecutionStore.getState()

    setIsRunning(true)
    resetNodeStates()

    const startTime = Date.now()
    const nodeResults: any[] = []
    let overallStatus = "success"
    const failedNodes = new Set<string>()

    try {
        const levels = topologicalSort(nodes, edges)

        for (const level of levels) {
            await Promise.all(
                level.map(async (nodeId) => {
                    const node = nodes.find((n) => n.id === nodeId)
                    if (!node) return

                    if (hasDependencyFailed(nodeId, edges, failedNodes)) {
                        failedNodes.add(nodeId)
                        useExecutionStore.getState().setNodeStatus(nodeId, "failed")
                        useExecutionStore.getState().setNodeError(nodeId, "Skipped: upstream dependency failed")
                        overallStatus = "failed"
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

                    const inputs = resolveNodeInputs(nodeId, nodes, edges)
                    const nodeStart = Date.now()

                    try {
                        const output = await executeNode(nodeId, node.type, inputs)
                        nodeResults.push({
                            nodeId,
                            nodeType: node.type,
                            status: "success",
                            inputs,
                            outputs: { output },
                            duration: Date.now() - nodeStart,
                        })
                    } catch (err: any) {
                        overallStatus = "failed"
                        failedNodes.add(nodeId)
                        nodeResults.push({
                            nodeId,
                            nodeType: node.type,
                            status: "failed",
                            inputs,
                            error: err.message,
                            duration: Date.now() - nodeStart,
                        })
                    }
                })
            )
        }
    } finally {
        const totalDuration = Date.now() - startTime
        setIsRunning(false)
        await saveRun(workflowId, scope, overallStatus, totalDuration, nodeResults)
    }
}

// Run a single node only
export async function runSingleNode(
    workflowId: string,
    nodeId: string,
    nodes: any[],
    edges: any[]
) {
    const { setIsRunning, setNodeStatus, setNodeError, setNodeOutput } = useExecutionStore.getState()

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    // Only reset THIS node's state, not all nodes
    setNodeStatus(nodeId, "idle")
    setNodeError(nodeId, "")
    setNodeOutput(nodeId, undefined)

    setIsRunning(true)
    const startTime = Date.now()
    const inputs = resolveNodeInputs(nodeId, nodes, edges)

    try {
        const output = await executeNode(nodeId, node.type, inputs)
        await saveRun(workflowId, "single", "success", Date.now() - startTime, [
            {
                nodeId,
                nodeType: node.type,
                status: "success",
                inputs,
                outputs: { output },
                duration: Date.now() - startTime,
            },
        ])
    } catch (err: any) {
        await saveRun(workflowId, "single", "failed", Date.now() - startTime, [
            {
                nodeId,
                nodeType: node.type,
                status: "failed",
                inputs,
                error: err.message,
                duration: Date.now() - startTime,
            },
        ])
    } finally {
        useExecutionStore.getState().setIsRunning(false)
    }
}

// Run selected nodes only
export async function runSelectedNodes(
    workflowId: string,
    selectedNodeIds: string[],
    nodes: any[],
    edges: any[]
) {
    const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id))
    const selectedEdges = edges.filter(
        (e) => selectedNodeIds.includes(e.source) && selectedNodeIds.includes(e.target)
    )
    await runWorkflow(workflowId, selectedNodes, selectedEdges, "partial")
}