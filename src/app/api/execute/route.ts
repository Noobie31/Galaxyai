import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { tasks } from "@trigger.dev/sdk/v3"
import type { cropImageTask } from "@/trigger/cropImageTask"
import type { extractFrameTask } from "@/trigger/extractFrameTask"
import type { llmTask } from "@/trigger/llmTask"

export const maxDuration = 60

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { nodeType, inputs } = body

  try {
    // ─── LLM Node — via Trigger.dev (non-negotiable per assignment) ───
    if (nodeType === "llmNode") {
      const handle = await tasks.trigger<typeof llmTask>("llm-task", {
        model: inputs.model || "gemini-2.0-flash",
        systemPrompt: inputs.system_prompt || "",
        userMessage: inputs.user_message || "",
        imageUrls: Array.isArray(inputs.images)
          ? inputs.images.filter(Boolean)
          : inputs.images
            ? [inputs.images]
            : [],
      })
      // Return runId so client can poll — avoids Vercel 60s timeout
      return NextResponse.json({ runId: handle.id, pending: true })
    }

    // ─── Crop Image — via Trigger.dev ───
    if (nodeType === "cropImageNode") {
      const handle = await tasks.trigger<typeof cropImageTask>("crop-image-task", {
        imageUrl: inputs.image_url,
        xPercent: parseFloat(inputs.x_percent) || 0,
        yPercent: parseFloat(inputs.y_percent) || 0,
        widthPercent: parseFloat(inputs.width_percent) || 100,
        heightPercent: parseFloat(inputs.height_percent) || 100,
      })
      return NextResponse.json({ runId: handle.id, pending: true })
    }

    // ─── Extract Frame — via Trigger.dev ───
    if (nodeType === "extractFrameNode") {
      const handle = await tasks.trigger<typeof extractFrameTask>("extract-frame-task", {
        videoUrl: inputs.video_url,
        timestamp: inputs.timestamp || "0",
      })
      return NextResponse.json({ runId: handle.id, pending: true })
    }

    // ─── Text / Upload nodes — no execution needed, output comes from node data ───
    if (
      nodeType === "textNode" ||
      nodeType === "imageUploadNode" ||
      nodeType === "videoUploadNode"
    ) {
      return NextResponse.json({ output: inputs.text || inputs.image_url || inputs.video_url || "" })
    }

    return NextResponse.json({ error: "Unknown node type" }, { status: 400 })
  } catch (err: any) {
    console.error("Execute error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}