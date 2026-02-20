import { useExecutionStore } from "@/store/executionStore"
import { useWorkflowStore } from "@/store/workflowStore"

// Topological sort for DAG execution order
function topologicalSort(nodes: any[], edges: any[]): string[][] {
    const inDegree: Record<string, number> = {}
    const adjList: Record<string, string[]> = {}
    const nodeIds = nodes.map((n) => n.id)

    nodeIds.forEach((id) => {
        inDegree[id] = 0
        adjList[id] = []
    })

    edges.forEach((edge) => {
        adjList[edge.source].push(edge.target)
        inDegree[edge.target]++
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

// Get output value from a node
function getNodeOutput(nodeId: string, nodes: any[]): any {
    const executionState = useExecutionStore.getState()
    const cached = executionState.nodeStates[nodeId]?.output

    // For text nodes, always read fresh from node data
    const node = nodes.find((n) => n.id === nodeId)
    if (node?.type === "textNode") {
        return node.data?.text || ""
    }
    if (node?.type === "imageUploadNode") {
        return node.data?.imageUrl || ""
    }
    if (node?.type === "videoUploadNode") {
        return node.data?.videoUrl || ""
    }

    return cached
}

// Resolve inputs for a node based on connected edges
function resolveNodeInputs(nodeId: string, nodes: any[], edges: any[]): Record<string, any> {
    const inputs: Record<string, any> = {}
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return inputs

    const incomingEdges = edges.filter((e) => e.target === nodeId)

    incomingEdges.forEach((edge) => {
        const sourceOutput = getNodeOutput(edge.source, nodes)  // pass nodes here
        if (sourceOutput !== undefined && edge.targetHandle) {
            if (edge.targetHandle === "images") {
                if (!inputs.images) inputs.images = []
                inputs.images.push(sourceOutput)
            } else {
                inputs[edge.targetHandle] = sourceOutput
            }
        }
    })

    const nodeData = node.data || {}
    if (node.type === "textNode") {
        inputs.text = nodeData.text
    }
    if (node.type === "cropImageNode") {
        if (!inputs.x_percent) inputs.x_percent = nodeData.xPercent ?? 0
        if (!inputs.y_percent) inputs.y_percent = nodeData.yPercent ?? 0
        if (!inputs.width_percent) inputs.width_percent = nodeData.widthPercent ?? 100
        if (!inputs.height_percent) inputs.height_percent = nodeData.heightPercent ?? 100
    }
    if (node.type === "extractFrameNode") {
        if (!inputs.timestamp) inputs.timestamp = nodeData.timestamp ?? "0"
    }
    if (node.type === "llmNode") {
        inputs.model = nodeData.model || "gemini-2.5-flash"
    }

    return inputs
}

// Execute a single node via API
async function executeNode(
    nodeId: string,
    nodeType: string,
    inputs: Record<string, any>
): Promise<any> {
    const { setNodeStatus, setNodeOutput, setNodeError, setNodeStartTime, setNodeDuration } =
        useExecutionStore.getState()

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

        const duration = Date.now() - (useExecutionStore.getState().nodeStates[nodeId]?.startTime || Date.now())
        setNodeDuration(nodeId, duration)
        setNodeStatus(nodeId, "success")
        setNodeOutput(nodeId, result.output)

        return result.output
    } catch (err: any) {
        const duration = Date.now() - (useExecutionStore.getState().nodeStates[nodeId]?.startTime || Date.now())
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

        // Save node executions
        await Promise.all(
            nodeResults.map((nr) =>
                fetch("/api/runs/nodes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ runId: run.id, ...nr }),
                })
            )
        )
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
                            outputs: output,
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
            { nodeId, nodeType: node.type, status: "success", inputs, outputs: output, duration: Date.now() - startTime },
        ])
    } catch (err: any) {
        await saveRun(workflowId, "single", "failed", Date.now() - startTime, [
            { nodeId, nodeType: node.type, status: "failed", inputs, error: err.message, duration: Date.now() - startTime },
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