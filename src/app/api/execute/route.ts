import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { z } from "zod"

export const maxDuration = 120

const executeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  inputs: z.record(z.any()),
})

async function uploadToTransloadit(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  const params = JSON.stringify({
    auth: { key: process.env.NEXT_PUBLIC_TRANSLOADIT_KEY },
    steps: { ":original": { robot: "/upload/handle" } },
  })

  const formData = new FormData()
  formData.append("params", params)
  formData.append("file", new Blob([new Uint8Array(fileBuffer)], { type: mimeType }), fileName)

  const res = await fetch("https://api2.transloadit.com/assemblies", { method: "POST", body: formData })
  const result = await res.json()

  const extractUrl = (r: any): string | null => {
    if (r.uploads?.length > 0) return r.uploads[0].ssl_url || r.uploads[0].url || null
    for (const key of Object.keys(r.results || {})) {
      if (r.results[key]?.[0]?.ssl_url) return r.results[key][0].ssl_url
    }
    return null
  }

  if (result.ok === "ASSEMBLY_COMPLETED") {
    const url = extractUrl(result)
    if (url) return url
  }

  if (result.assembly_ssl_url) {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      const poll = await (await fetch(result.assembly_ssl_url)).json()
      if (poll.ok === "ASSEMBLY_COMPLETED") {
        const url = extractUrl(poll)
        if (url) return url
        throw new Error("No URL in completed assembly")
      }
      if (poll.ok === "ASSEMBLY_FAILED") throw new Error("Assembly failed")
    }
  }

  throw new Error("Upload timed out")
}

function getFfmpeg() {
  const fluentFfmpeg = require("fluent-ffmpeg")
  
  // Try multiple ffmpeg paths
  const possiblePaths = [
    "ffmpeg", // system PATH
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe",
  ]

  // Try ffmpeg-static but get the actual module path not the bundled one
  try {
    const staticPath = require.resolve("ffmpeg-static")
    const actualPath = staticPath.replace(/\\/g, "\\").replace(".next\\server\\vendor-chunks\\ffmpeg.exe", "node_modules\\ffmpeg-static\\ffmpeg.exe")
    const fs = require("fs")
    if (fs.existsSync(actualPath)) {
      fluentFfmpeg.setFfmpegPath(actualPath)
      console.log("Using ffmpeg from node_modules:", actualPath)
      return fluentFfmpeg
    }
  } catch (e) {}

  // Try node_modules directly
  try {
    const path = require("path")
    const fs = require("fs")
    const nmPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe")
    if (fs.existsSync(nmPath)) {
      fluentFfmpeg.setFfmpegPath(nmPath)
      console.log("Using ffmpeg from node_modules direct:", nmPath)
      return fluentFfmpeg
    }
  } catch (e) {}

  // Use system ffmpeg
  console.log("Using system ffmpeg")
  return fluentFfmpeg
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { nodeType, inputs } = executeSchema.parse(body)

  try {
    switch (nodeType) {
      case "textNode":
        return NextResponse.json({ output: inputs.text || "" })

      case "imageUploadNode":
        return NextResponse.json({ output: inputs.imageUrl || "" })

      case "videoUploadNode":
        return NextResponse.json({ output: inputs.videoUrl || "" })

      case "llmNode": {
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) throw new Error("GEMINI_API_KEY not set")

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({
          model: inputs.model || "gemini-2.5-flash",
          ...(inputs.system_prompt ? { systemInstruction: inputs.system_prompt } : {}),
        })

        const parts: any[] = []
        if (inputs.user_message) parts.push({ text: inputs.user_message })

        if (inputs.images?.length > 0) {
          for (const imageUrl of inputs.images) {
            if (!imageUrl) continue
            try {
              const res = await fetch(imageUrl)
              if (!res.ok) continue
              const buffer = await res.arrayBuffer()
              const base64 = Buffer.from(buffer).toString("base64")
              const mimeType = res.headers.get("content-type")?.split(";")[0] || "image/jpeg"
              parts.push({ inlineData: { data: base64, mimeType } })
            } catch { console.warn("Failed to fetch image:", imageUrl) }
          }
        }

        if (parts.length === 0) return NextResponse.json({ error: "No content to send" }, { status: 400 })

        const result = await model.generateContent(parts)
        return NextResponse.json({ output: result.response.text() })
      }

      case "cropImageNode": {
        if (!inputs.image_url) return NextResponse.json({ error: "No image URL" }, { status: 400 })

        const ffmpeg = getFfmpeg()
        const axios = require("axios")
        const fs = require("fs")
        const path = require("path")
        const os = require("os")

        const tmpDir = os.tmpdir()
        const inputPath = path.join(tmpDir, `input_${Date.now()}.jpg`)
        const outputPath = path.join(tmpDir, `output_${Date.now()}.jpg`)

        try {
          const response = await axios.get(inputs.image_url, { responseType: "arraybuffer", timeout: 30000 })
          fs.writeFileSync(inputPath, response.data)

          await new Promise<void>((resolve, reject) => {
            ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
              if (err) return reject(new Error(`ffprobe failed: ${err.message}`))
              const stream = metadata.streams.find((s: any) => s.width)
              if (!stream) return reject(new Error("No image stream"))

              const { width, height } = stream
              const cropX = Math.floor((Math.max(0, Math.min(100, Number(inputs.x_percent) || 0)) / 100) * width)
              const cropY = Math.floor((Math.max(0, Math.min(100, Number(inputs.y_percent) || 0)) / 100) * height)
              const cropW = Math.min(Math.floor((Math.max(1, Math.min(100, Number(inputs.width_percent) || 100)) / 100) * width), width - cropX)
              const cropH = Math.min(Math.floor((Math.max(1, Math.min(100, Number(inputs.height_percent) || 100)) / 100) * height), height - cropY)

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

      case "extractFrameNode": {
        if (!inputs.video_url) return NextResponse.json({ error: "No video URL" }, { status: 400 })

        const ffmpeg = getFfmpeg()
        const axios = require("axios")
        const fs = require("fs")
        const path = require("path")
        const os = require("os")

        const tmpDir = os.tmpdir()
        const inputPath = path.join(tmpDir, `video_${Date.now()}.mp4`)
        const outputPath = path.join(tmpDir, `frame_${Date.now()}.jpg`)

        try {
          const response = await axios.get(inputs.video_url, { responseType: "arraybuffer", timeout: 60000 })
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
        return NextResponse.json({ error: `Unknown node type: ${nodeType}` }, { status: 400 })
    }
  } catch (err: any) {
    console.error("Execute error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

