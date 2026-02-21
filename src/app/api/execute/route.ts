import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { tasks } from "@trigger.dev/sdk/v3"
import type { llmTask } from "@/trigger/llmTask"
import type { cropImageTask } from "@/trigger/cropImageTask"
import type { extractFrameTask } from "@/trigger/extractFrameTask"

export const maxDuration = 300

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { nodeType, inputs } = body

  try {
    if (nodeType === "llmNode") {
      const handle = await tasks.triggerAndWait<typeof llmTask>("llm-task", {
        model: inputs.model || "gemini-2.5-flash",
        systemPrompt: inputs.system_prompt,
        userMessage: inputs.user_message || "",
        imageUrls: inputs.images || [],
      })
      if (handle.ok) return NextResponse.json({ output: handle.output.output })
      throw new Error("LLM task failed")
    }

    if (nodeType === "cropImageNode") {
      const handle = await tasks.triggerAndWait<typeof cropImageTask>("crop-image-task", {
        imageUrl: inputs.image_url,
        xPercent: parseFloat(inputs.x_percent) || 0,
        yPercent: parseFloat(inputs.y_percent) || 0,
        widthPercent: parseFloat(inputs.width_percent) || 100,
        heightPercent: parseFloat(inputs.height_percent) || 100,
      })
      if (handle.ok) return NextResponse.json({ output: handle.output.output })
      throw new Error("Crop task failed")
    }

    if (nodeType === "extractFrameNode") {
      const handle = await tasks.triggerAndWait<typeof extractFrameTask>("extract-frame-task", {
        videoUrl: inputs.video_url,
        timestamp: inputs.timestamp || "0",
      })
      if (handle.ok) return NextResponse.json({ output: handle.output.output })
      throw new Error("Extract frame task failed")
    }

    return NextResponse.json({ error: "Unknown node type" }, { status: 400 })
  } catch (err: any) {
    console.error("Execute error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
