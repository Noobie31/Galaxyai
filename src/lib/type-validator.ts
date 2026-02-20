import { Connection } from "@xyflow/react"

const handleTypes: Record<string, Record<string, string>> = {
    textNode: { output: "text" },
    imageUploadNode: { output: "image" },
    videoUploadNode: { output: "video" },
    llmNode: {
        system_prompt: "text",
        user_message: "text",
        images: "image",
        output: "text",
    },
    cropImageNode: {
        image_url: "image",
        x_percent: "text",
        y_percent: "text",
        width_percent: "text",
        height_percent: "text",
        output: "image",
    },
    extractFrameNode: {
        video_url: "video",
        timestamp: "text",
        output: "image",
    },
}

export function validateConnection(connection: Connection, nodes: any[]): boolean {
    const sourceNode = nodes.find((n) => n.id === connection.source)
    const targetNode = nodes.find((n) => n.id === connection.target)

    if (!sourceNode || !targetNode) return false
    if (connection.source === connection.target) return false

    const sourceHandleId = connection.sourceHandle || "output"
    const targetHandleId = connection.targetHandle || "input"

    const sourceTypes = handleTypes[sourceNode.type] || {}
    const targetTypes = handleTypes[targetNode.type] || {}

    const sourceType = sourceTypes[sourceHandleId]
    const targetType = targetTypes[targetHandleId]

    if (!sourceType || !targetType) return true
    if (sourceType === targetType) return true
    if (targetType === "any" || sourceType === "any") return true

    return false
}