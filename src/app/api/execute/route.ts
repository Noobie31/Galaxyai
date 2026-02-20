import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { z } from "zod"

export const maxDuration = 120

const executeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  inputs: z.record(z.any()),
})

// ── Transloadit: upload buffer and poll until complete ───────────────────────
async function uploadToTransloadit(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const transloaditKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY!

  const params = JSON.stringify({
    auth: { key: transloaditKey },
    steps: { ":original": { robot: "/upload/handle" } },
  })

  const formData = new FormData()
  formData.append("params", params)
  formData.append("file", new Blob([fileBuffer], { type: mimeType }), fileName)

  const uploadRes = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: formData,
  })

  if (!uploadRes.ok) {
    throw new Error(`Transloadit upload failed: ${uploadRes.statusText}`)
  }

  const uploadResult = await uploadRes.json()

  if (uploadResult.ok === "ASSEMBLY_COMPLETED") {
    return extractTransloaditUrl(uploadResult)
  }

  if (uploadResult.ok === "ASSEMBLY_FAILED") {
    throw new Error(`Transloadit failed: ${uploadResult.error}`)
  }

  // Poll for completion
  const assemblyUrl =
    uploadResult.assembly_ssl_url || uploadResult.assembly_url
  if (!assemblyUrl) throw new Error("No Transloadit assembly URL returned")

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000))
    const poll = await fetch(assemblyUrl)
    const result = await poll.json()

    if (result.ok === "ASSEMBLY_COMPLETED") return extractTransloaditUrl(result)
    if (result.ok === "ASSEMBLY_FAILED")
      throw new Error(`Transloadit failed: ${result.error}`)
  }

  throw new Error("Transloadit upload timed out")
}

function extractTransloaditUrl(result: any): string {
  if (result.uploads?.length > 0) {
    const url = result.uploads[0].ssl_url || result.uploads[0].url
    if (url) return url
  }
  const orig = result.results?.[":original"]
  if (orig?.length > 0) {
    const url = orig[0].ssl_url || orig[0].url
    if (url) return url
  }
  for (const key of Object.keys(result.results || {})) {
    const items = result.results[key]
    if (items?.length > 0) {
      const url = items[0].ssl_url || items[0].url
      if (url) return url
    }
  }
  throw new Error("No URL in Transloadit response")
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { nodeType, inputs } = executeSchema.parse(body)

  try {
    switch (nodeType) {
      // ── Pass-through nodes ──────────────────────────────────────────────
      case "textNode":
        return NextResponse.json({ output: inputs.text || "" })

      case "imageUploadNode":
        return NextResponse.json({ output: inputs.imageUrl || "" })

      case "videoUploadNode":
        return NextResponse.json({ output: inputs.videoUrl || "" })

      // ── LLM via Google Gemini directly ──────────────────────────────────
      case "llmNode": {
        const { GoogleGenerativeAI } = await import("@google/generative-ai")

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) throw new Error("GEMINI_API_KEY not set")

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({
          model: inputs.model || "gemini-1.5-flash",
          ...(inputs.system_prompt
            ? { systemInstruction: inputs.system_prompt }
            : {}),
        })

        const parts: any[] = []

        if (inputs.user_message) {
          parts.push({ text: inputs.user_message })
        }

        // Attach images
        if (inputs.images?.length > 0) {
          for (const imageUrl of inputs.images) {
            if (!imageUrl) continue
            try {
              const res = await fetch(imageUrl)
              if (!res.ok) continue
              const buffer = await res.arrayBuffer()
              const base64 = Buffer.from(buffer).toString("base64")
              const mimeType =
                res.headers.get("content-type")?.split(";")[0] || "image/jpeg"
              parts.push({ inlineData: { data: base64, mimeType } })
            } catch {
              console.warn("Failed to fetch image:", imageUrl)
            }
          }
        }

        if (parts.length === 0) {
          return NextResponse.json(
            { error: "No content to send to LLM" },
            { status: 400 }
          )
        }

        const result = await model.generateContent(parts)
        const text = result.response.text()
        return NextResponse.json({ output: text })
      }

      // ── Crop Image via FFmpeg directly ──────────────────────────────────
      case "cropImageNode": {
        if (!inputs.image_url) {
          return NextResponse.json(
            { error: "No image URL provided" },
            { status: 400 }
          )
        }

        const ffmpeg = require("fluent-ffmpeg")
        const axios = require("axios")
        const fs = require("fs")
        const path = require("path")
        const os = require("os")

        const tmpDir = os.tmpdir()
        const inputPath = path.join(tmpDir, `input_${Date.now()}.jpg`)
        const outputPath = path.join(tmpDir, `output_${Date.now()}.jpg`)

        try {
          const response = await axios.get(inputs.image_url, {
            responseType: "arraybuffer",
            timeout: 30000,
          })
          fs.writeFileSync(inputPath, response.data)

          await new Promise<void>((resolve, reject) => {
            ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
              if (err) return reject(new Error(`ffprobe failed: ${err.message}`))

              const stream = metadata.streams.find(
                (s: any) => s.codec_type === "video" || s.width
              )
              if (!stream) return reject(new Error("No image stream found"))

              const { width, height } = stream

              const xPct = Math.max(0, Math.min(100, Number(inputs.x_percent) || 0))
              const yPct = Math.max(0, Math.min(100, Number(inputs.y_percent) || 0))
              const wPct = Math.max(1, Math.min(100, Number(inputs.width_percent) || 100))
              const hPct = Math.max(1, Math.min(100, Number(inputs.height_percent) || 100))

              const cropX = Math.floor((xPct / 100) * width)
              const cropY = Math.floor((yPct / 100) * height)
              const cropW = Math.min(Math.floor((wPct / 100) * width), width - cropX)
              const cropH = Math.min(Math.floor((hPct / 100) * height), height - cropY)

              ffmpeg(inputPath)
                .videoFilter(`crop=${cropW}:${cropH}:${cropX}:${cropY}`)
                .output(outputPath)
                .on("end", () => resolve())
                .on("error", (e: Error) => reject(new Error(`ffmpeg failed: ${e.message}`)))
                .run()
            })
          })

          const fileBuffer = fs.readFileSync(outputPath)
          const url = await uploadToTransloadit(fileBuffer, "cropped.jpg", "image/jpeg")
          return NextResponse.json({ output: url })
        } finally {
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
        }
      }

      // ── Extract Frame via FFmpeg directly ───────────────────────────────
      case "extractFrameNode": {
        if (!inputs.video_url) {
          return NextResponse.json(
            { error: "No video URL provided" },
            { status: 400 }
          )
        }

        const ffmpeg = require("fluent-ffmpeg")
        const axios = require("axios")
        const fs = require("fs")
        const path = require("path")
        const os = require("os")

        const tmpDir = os.tmpdir()
        const inputPath = path.join(tmpDir, `video_${Date.now()}.mp4`)
        const outputPath = path.join(tmpDir, `frame_${Date.now()}.jpg`)

        try {
          const response = await axios.get(inputs.video_url, {
            responseType: "arraybuffer",
            timeout: 60000,
          })
          fs.writeFileSync(inputPath, response.data)

          let timeInSeconds = 0
          const ts = String(inputs.timestamp || "0").trim()

          if (ts.endsWith("%")) {
            const percent = parseFloat(ts) / 100
            timeInSeconds = await new Promise<number>((resolve, reject) => {
              ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
                if (err) return reject(new Error(`ffprobe failed: ${err.message}`))
                resolve((metadata.format.duration || 0) * percent)
              })
            })
          } else {
            timeInSeconds = parseFloat(ts) || 0
          }

          await new Promise<void>((resolve, reject) => {
            ffmpeg(inputPath)
              .seekInput(timeInSeconds)
              .frames(1)
              .output(outputPath)
              .on("end", () => resolve())
              .on("error", (e: Error) => reject(new Error(`ffmpeg failed: ${e.message}`)))
              .run()
          })

          const fileBuffer = fs.readFileSync(outputPath)
          const url = await uploadToTransloadit(fileBuffer, "frame.jpg", "image/jpeg")
          return NextResponse.json({ output: url })
        } finally {
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
        }
      }

      default:
        return NextResponse.json(
          { error: `Unknown node type: ${nodeType}` },
          { status: 400 }
        )
    }
  } catch (err: any) {
    console.error(`[execute] nodeType=${nodeType} error:`, err)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}