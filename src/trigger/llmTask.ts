import { task } from "@trigger.dev/sdk/v3"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const llmTask = task({
  id: "llm-task",
  retry: { maxAttempts: 1 },
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
        try {
          const res = await fetch(url)
          const buffer = await res.arrayBuffer()
          const base64 = Buffer.from(buffer).toString("base64")
          const mimeType = res.headers.get("content-type") || "image/jpeg"
          parts.push({ inlineData: { data: base64, mimeType } })
        } catch (imgErr) {
          console.warn(`Failed to fetch image: ${url}`, imgErr)
          // Continue without the image rather than crashing the whole task
        }
      }
    }

    parts.push({ text: payload.userMessage })

    const request: any = { contents: [{ role: "user", parts }] }
    if (payload.systemPrompt) {
      request.systemInstruction = { parts: [{ text: payload.systemPrompt }] }
    }

    try {
      const result = await model.generateContent(request)
      const text = result.response.text()
      return { output: text }
    } catch (err: any) {
      const msg = err?.message ?? String(err)
      const status = err?.status ?? err?.statusCode ?? 0

      // Surface a clean, readable error message
      if (status === 429 || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        throw new Error(
          "Gemini API quota exceeded. Add billing at https://ai.dev or switch to a different model."
        )
      }
      if (status === 401 || status === 403) {
        throw new Error("Gemini API key is invalid or missing. Check your GEMINI_API_KEY env variable.")
      }
      // Re-throw original for other errors
      throw err
    }
  },
})