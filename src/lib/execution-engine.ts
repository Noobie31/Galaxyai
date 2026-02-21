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

// Get output value from a node (passthrough nodes read directly from data)
function getNodeOutput(nodeId: string, nodes: any[]): any {
    const node = nodes.find((n) => n.id === nodeId)

    if (node?.type === "textNode") return node.data?.text || ""
    if (node?.type === "imageUploadNode") return node.data?.imageUrl || ""
    if (node?.type === "videoUploadNode") return node.data?.videoUrl || ""

    // For executable nodes, get from execution store
    return useExecutionStore.getState().nodeStates[nodeId]?.output
}

// Resolve all inputs for a node from connected edges + node data defaults
function resolveNodeInputs(nodeId: string, nodes: any[], edges: any[]): Record<string, any> {
    const inputs: Record<string, any> = {}
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return inputs

    const incomingEdges = edges.filter((e) => e.target === nodeId)

    incomingEdges.forEach((edge) => {
        const sourceOutput = getNodeOutput(edge.source, nodes)
        if (sourceOutput !== undefined && sourceOutput !== null && edge.targetHandle) {
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
        inputs.model = nodeData.model || "gemini-2.0-flash"
        // Fill manual text inputs only if handle not connected
        if (!inputs.system_prompt && nodeData.systemPrompt) {
            inputs.system_prompt = nodeData.systemPrompt
        }
        if (!inputs.user_message && nodeData.userMessage) {
            inputs.user_message = nodeData.userMessage
        }
    }

    return inputs
}

// Poll a Trigger.dev run until completion or failure
async function pollRun(
    runId: string,
    nodeId: string,
    timeoutMs = 300000 // 5 minutes
): Promise<any> {
    const { setNodeStatus, setNodeOutput, setNodeError } = useExecutionStore.getState()
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
            // Network error — retry
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
    const { setNodeStatus, setNodeOutput, setNodeError, setNodeStartTime, setNodeDuration } =
        useExecutionStore.getState()

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
            // Trigger.dev task triggered — poll for result
            output = await pollRun(result.runId, nodeId)
        } else {
            // Direct result (shouldn't happen with new route but handle gracefully)
            output = result.output
        }

        const duration =
            Date.now() - (useExecutionStore.getState().nodeStates[nodeId]?.startTime || Date.now())
        setNodeDuration(nodeId, duration)
        setNodeStatus(nodeId, "success")
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

    try {
        const levels = topologicalSort(nodes, edges)

        for (const level of levels) {
            // Execute all nodes in this level in parallel
            await Promise.all(
                level.map(async (nodeId) => {
                    const node = nodes.find((n) => n.id === nodeId)
                    if (!node) return

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
    const { setIsRunning, resetNodeStates } = useExecutionStore.getState()
    resetNodeStates()

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

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