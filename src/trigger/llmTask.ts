import { task } from "@trigger.dev/sdk/v3"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const llmTask = task({
  id: "llm-task",
  maxDuration: 120,
  run: async (payload: {
    model: string
    systemPrompt?: string
    userMessage: string
    images?: string[]
  }) => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: payload.model })

    const parts: any[] = []

    if (payload.systemPrompt) {
      parts.push({ text: `System: ${payload.systemPrompt}\n\n` })
    }

    parts.push({ text: payload.userMessage })

    if (payload.images && payload.images.length > 0) {
      for (const imageUrl of payload.images) {
        if (!imageUrl) continue
        const response = await fetch(imageUrl)
        const buffer = await response.arrayBuffer()
        const base64 = Buffer.from(buffer).toString("base64")
        const mimeType = response.headers.get("content-type") || "image/jpeg"
        parts.push({
          inlineData: { data: base64, mimeType },
        })
      }
    }

    const result = await model.generateContent(parts)
    const text = result.response.text()

    return text
  },
})
