import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { tasks, runs } from "@trigger.dev/sdk/v3"
import type { cropImageTask } from "@/trigger/cropImageTask"
import type { extractFrameTask } from "@/trigger/extractFrameTask"

export const maxDuration = 120

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { nodeType, inputs } = body

  try {
    // LLM Node - runs via Gemini API directly
    if (nodeType === "llmNode") {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
      const model = genAI.getGenerativeModel({ model: inputs.model || "gemini-2.0-flash" })
      const parts: any[] = []
      if (inputs.images?.length) {
        for (const url of inputs.images) {
          const res = await fetch(url)
          const buffer = await res.arrayBuffer()
          const base64 = Buffer.from(buffer).toString("base64")
          const mimeType = res.headers.get("content-type") || "image/jpeg"
          parts.push({ inlineData: { data: base64, mimeType } })
        }
      }
      parts.push({ text: inputs.user_message || "" })
      const request: any = { contents: [{ role: "user", parts }] }
      if (inputs.system_prompt) {
        request.systemInstruction = { parts: [{ text: inputs.system_prompt }] }
      }
      const result = await model.generateContent(request)
      return NextResponse.json({ output: result.response.text() })
    }

    // Crop Image - trigger Trigger.dev task and poll for result
    if (nodeType === "cropImageNode") {
      const handle = await tasks.trigger<typeof cropImageTask>("crop-image-task", {
        imageUrl: inputs.image_url,
        xPercent: parseFloat(inputs.x_percent) || 0,
        yPercent: parseFloat(inputs.y_percent) || 0,
        widthPercent: parseFloat(inputs.width_percent) || 100,
        heightPercent: parseFloat(inputs.height_percent) || 100,
      })

      // Poll for completion (max 90 seconds)
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 1500))
        const run = await runs.retrieve(handle.id)
        if (run.status === "COMPLETED") {
          return NextResponse.json({ output: (run.output as any)?.output })
        }
        if (run.status === "FAILED" || run.status === "CRASHED" || run.status === "CANCELED") {
          throw new Error(`Task ${run.status}: ${JSON.stringify(run.output)}`)
        }
      }
      throw new Error("Task timed out")
    }

    // Extract Frame - trigger Trigger.dev task and poll for result
    if (nodeType === "extractFrameNode") {
      const handle = await tasks.trigger<typeof extractFrameTask>("extract-frame-task", {
        videoUrl: inputs.video_url,
        timestamp: inputs.timestamp || "0",
      })

      // Poll for completion (max 90 seconds)
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 1500))
        const run = await runs.retrieve(handle.id)
        if (run.status === "COMPLETED") {
          return NextResponse.json({ output: (run.output as any)?.output })
        }
        if (run.status === "FAILED" || run.status === "CRASHED" || run.status === "CANCELED") {
          throw new Error(`Task ${run.status}: ${JSON.stringify(run.output)}`)
        }
      }
      throw new Error("Task timed out")
    }

    return NextResponse.json({ error: "Unknown node type" }, { status: 400 })
  } catch (err: any) {
    console.error("Execute error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
