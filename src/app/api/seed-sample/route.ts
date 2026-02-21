import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const nodes = [
    // Branch A - Image
    { id: "upload-image-1", type: "imageUploadNode", position: { x: 80, y: 80 }, data: { label: "Upload Image", status: "idle" } },
    { id: "crop-image-1", type: "cropImageNode", position: { x: 380, y: 80 }, data: { label: "Crop Image", xPercent: 10, yPercent: 10, widthPercent: 80, heightPercent: 80, connectedHandles: ["image_url"], status: "idle" } },
    { id: "text-system-1", type: "textNode", position: { x: 380, y: 320 }, data: { label: "Text", text: "You are a professional marketing copywriter. Generate a compelling one-paragraph product description.", status: "idle" } },
    { id: "text-user-1", type: "textNode", position: { x: 380, y: 500 }, data: { label: "Text", text: "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.", status: "idle" } },
    { id: "llm-1", type: "llmNode", position: { x: 700, y: 240 }, data: { label: "Run Any LLM", model: "gemini-2.5-flash", connectedHandles: ["system_prompt", "user_message", "images"], status: "idle" } },
    // Branch B - Video
    { id: "upload-video-1", type: "videoUploadNode", position: { x: 80, y: 680 }, data: { label: "Upload Video", status: "idle" } },
    { id: "extract-frame-1", type: "extractFrameNode", position: { x: 380, y: 680 }, data: { label: "Extract Frame", timestamp: "50%", connectedHandles: ["video_url"], status: "idle" } },
    // Convergence
    { id: "text-system-2", type: "textNode", position: { x: 700, y: 600 }, data: { label: "Text", text: "You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.", status: "idle" } },
    { id: "llm-2", type: "llmNode", position: { x: 1020, y: 380 }, data: { label: "Run Any LLM", model: "gemini-2.5-flash", connectedHandles: ["system_prompt", "user_message", "images"], status: "idle" } },
  ]

  const edges = [
    // Branch A
    { id: "e1", source: "upload-image-1", sourceHandle: "output", target: "crop-image-1", targetHandle: "image_url", animated: true, style: { stroke: "#a855f7", strokeWidth: 2 } },
    { id: "e2", source: "text-system-1", sourceHandle: "output", target: "llm-1", targetHandle: "system_prompt", animated: true, style: { stroke: "#a855f7", strokeWidth: 2 } },
    { id: "e3", source: "text-user-1", sourceHandle: "output", target: "llm-1", targetHandle: "user_message", animated: true, style: { stroke: "#a855f7", strokeWidth: 2 } },
    { id: "e4", source: "crop-image-1", sourceHandle: "output", target: "llm-1", targetHandle: "images", animated: true, style: { stroke: "#a855f7", strokeWidth: 2 } },
    // Branch B
    { id: "e5", source: "upload-video-1", sourceHandle: "output", target: "extract-frame-1", targetHandle: "video_url", animated: true, style: { stroke: "#a855f7", strokeWidth: 2 } },
    // Convergence
    { id: "e6", source: "text-system-2", sourceHandle: "output", target: "llm-2", targetHandle: "system_prompt", animated: true, style: { stroke: "#a855f7", strokeWidth: 2 } },
    { id: "e7", source: "llm-1", sourceHandle: "output", target: "llm-2", targetHandle: "user_message", animated: true, style: { stroke: "#a855f7", strokeWidth: 2 } },
    { id: "e8", source: "crop-image-1", sourceHandle: "output", target: "llm-2", targetHandle: "images", animated: true, style: { stroke: "#a855f7", strokeWidth: 2 } },
    { id: "e9", source: "extract-frame-1", sourceHandle: "output", target: "llm-2", targetHandle: "images", animated: true, style: { stroke: "#a855f7", strokeWidth: 2 } },
  ]

  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name: "Product Marketing Kit Generator",
      nodes: nodes as any,
      edges: edges as any,
    },
  })

  return NextResponse.json({ id: workflow.id })
}
