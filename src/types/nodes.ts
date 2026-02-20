export type HandleType = "text" | "image" | "video" | "any"

export type NodeType =
    | "textNode"
    | "imageUploadNode"
    | "videoUploadNode"
    | "llmNode"
    | "cropImageNode"
    | "extractFrameNode"

export type NodeStatus = "idle" | "running" | "success" | "failed"

export interface BaseNodeData {
    label: string
    status: NodeStatus
    error?: string
}

export interface TextNodeData extends BaseNodeData {
    text: string
}

export interface ImageUploadNodeData extends BaseNodeData {
    imageUrl?: string
    fileName?: string
}

export interface VideoUploadNodeData extends BaseNodeData {
    videoUrl?: string
    fileName?: string
}

export interface LLMNodeData extends BaseNodeData {
    model: string
    result?: string
    systemPrompt?: string
    userMessage?: string
}

export interface CropImageNodeData extends BaseNodeData {
    xPercent: number
    yPercent: number
    widthPercent: number
    heightPercent: number
    outputUrl?: string
    connectedHandles: string[]
}

export interface ExtractFrameNodeData extends BaseNodeData {
    timestamp: string
    outputUrl?: string
    connectedHandles: string[]
}