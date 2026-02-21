import { task } from "@trigger.dev/sdk/v3"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const llmTask = task({
  id: "llm-task",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    model: string
    systemPrompt?: string
    userMessage: string
    imageUrls?: string[]
  }) => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: payload.model || "gemini-2.5-flash" })

    const parts: any[] = []

    if (payload.imageUrls?.length) {
      for (const url of payload.imageUrls) {
        const res = await fetch(url)
        const buffer = await res.arrayBuffer()
        const base64 = Buffer.from(buffer).toString("base64")
        const mimeType = res.headers.get("content-type") || "image/jpeg"
        parts.push({ inlineData: { data: base64, mimeType } })
      }
    }

    parts.push({ text: payload.userMessage })

    const request: any = { contents: [{ role: "user", parts }] }
    if (payload.systemPrompt) {
      request.systemInstruction = { parts: [{ text: payload.systemPrompt }] }
    }

    const result = await model.generateContent(request)
    const text = result.response.text()
    return { output: text }
  },
})
