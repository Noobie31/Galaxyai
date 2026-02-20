export interface WorkflowType {
    id: string
    name: string
    userId: string
    nodes: any[]
    edges: any[]
    createdAt: string
    updatedAt: string
}

export interface WorkflowRunType {
    id: string
    workflowId: string
    userId: string
    scope: "full" | "partial" | "single"
    status: "running" | "success" | "failed"
    duration?: number
    createdAt: string
    nodeExecutions: NodeExecutionType[]
}

export interface NodeExecutionType {
    id: string
    runId: string
    nodeId: string
    nodeType: string
    status: "running" | "success" | "failed"
    inputs?: any
    outputs?: any
    error?: string
    duration?: number
    createdAt: string
}