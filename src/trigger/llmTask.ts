import { task, logger } from "@trigger.dev/sdk/v3"
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
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error("GEMINI_API_KEY not set")

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: payload.model || "gemini-2.5-flash",
      ...(payload.systemPrompt ? { systemInstruction: payload.systemPrompt } : {}),
    })

    const parts: any[] = []

    if (payload.userMessage) {
      parts.push({ text: payload.userMessage })
    }

    if (payload.images && payload.images.length > 0) {
      for (const imageUrl of payload.images) {
        if (!imageUrl) continue
        try {
          const response = await fetch(imageUrl)
          const buffer = await response.arrayBuffer()
          const base64 = Buffer.from(buffer).toString("base64")
          const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg"
          parts.push({ inlineData: { data: base64, mimeType } })
        } catch {
          logger.warn("Failed to fetch image", { imageUrl })
        }
      }
    }

    if (parts.length === 0) throw new Error("No content to send to LLM")

    logger.log("Calling Gemini", { model: payload.model, partsCount: parts.length })
    const result = await model.generateContent(parts)
    const text = result.response.text()
    logger.log("Gemini response received", { length: text.length })

    return text
  },
})
