import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  inputs: z.record(z.any()),
})

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 })
  }

  const { nodeType, inputs } = parsed.data

  try {
    if (nodeType === "llmNode") {
      const { tasks } = await import("@trigger.dev/sdk/v3")
      const { llmTask } = await import("@/trigger/llmTask")

      const handle = await tasks.trigger(llmTask.id, {
        model: inputs.model || "gemini-2.0-flash",
        systemPrompt: inputs.system_prompt,
        userMessage: inputs.user_message || inputs.text || "",
        imageUrls: Array.isArray(inputs.images)
          ? inputs.images.filter(Boolean)
          : inputs.images
            ? [inputs.images]
            : [],
      })

      return NextResponse.json({ pending: true, runId: handle.id })
    }

    if (nodeType === "cropImageNode") {
      const { tasks } = await import("@trigger.dev/sdk/v3")
      const { cropImageTask } = await import("@/trigger/cropImageTask")

      const handle = await tasks.trigger(cropImageTask.id, {
        imageUrl: inputs.image_url,
        xPercent: Number(inputs.x_percent ?? 0),
        yPercent: Number(inputs.y_percent ?? 0),
        widthPercent: Number(inputs.width_percent ?? 100),
        heightPercent: Number(inputs.height_percent ?? 100),
      })

      return NextResponse.json({ pending: true, runId: handle.id })
    }

    if (nodeType === "extractFrameNode") {
      const { tasks } = await import("@trigger.dev/sdk/v3")
      const { extractFrameTask } = await import("@/trigger/extractFrameTask")

      const handle = await tasks.trigger(extractFrameTask.id, {
        videoUrl: inputs.video_url,
        timestamp: inputs.timestamp ?? "0",
      })

      return NextResponse.json({ pending: true, runId: handle.id })
    }

    return NextResponse.json({ error: `Unknown node type: ${nodeType}` }, { status: 400 })
  } catch (err: any) {
    console.error("Execute error:", err)
    return NextResponse.json({ error: err.message || "Execution failed" }, { status: 500 })
  }
}