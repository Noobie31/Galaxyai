import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const maxDuration = 120

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
  const assemblyUrl = result.assembly_ssl_url || result.assembly_url
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    const poll = await (await fetch(assemblyUrl)).json()
    if (poll.ok === "ASSEMBLY_COMPLETED") {
      if (poll.uploads?.length > 0) return poll.uploads[0].ssl_url || poll.uploads[0].url
      for (const key of Object.keys(poll.results || {})) {
        if (poll.results[key]?.length > 0) return poll.results[key][0].ssl_url || poll.results[key][0].url
      }
    }
    if (poll.ok === "ASSEMBLY_FAILED") throw new Error(poll.error)
  }
  throw new Error("Upload timed out")
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { nodeType, inputs } = body

  try {
    // LLM Node - runs via Gemini API
    if (nodeType === "llmNode") {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
      const model = genAI.getGenerativeModel({ model: inputs.model || "gemini-2.5-flash" })
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

    // Crop Image Node - runs via FFmpeg
    if (nodeType === "cropImageNode") {
      const ffmpeg = require("fluent-ffmpeg")
      const fs = require("fs")
      const path = require("path")
      const os = require("os")

      const res = await fetch(inputs.image_url)
      const buffer = Buffer.from(await res.arrayBuffer())
      const tmpDir = os.tmpdir()
      const inputPath = path.join(tmpDir, `input-${Date.now()}.jpg`)
      const outputPath = path.join(tmpDir, `output-${Date.now()}.jpg`)
      fs.writeFileSync(inputPath, buffer)

      await new Promise<void>((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
          if (err) return reject(err)
          const { width, height } = metadata.streams[0]
          const x = Math.floor((parseFloat(inputs.x_percent) / 100) * width)
          const y = Math.floor((parseFloat(inputs.y_percent) / 100) * height)
          const w = Math.floor((parseFloat(inputs.width_percent) / 100) * width)
          const h = Math.floor((parseFloat(inputs.height_percent) / 100) * height)
          ffmpeg(inputPath)
            .videoFilter(`crop=${w}:${h}:${x}:${y}`)
            .frames(1)
            .output(outputPath)
            .on("end", () => resolve())
            .on("error", reject)
            .run()
        })
      })

      const outputBuffer = fs.readFileSync(outputPath)
      fs.unlinkSync(inputPath)
      fs.unlinkSync(outputPath)
      const url = await uploadToTransloadit(outputBuffer, "cropped.jpg", "image/jpeg")
      return NextResponse.json({ output: url })
    }

    // Extract Frame Node - runs via FFmpeg
    if (nodeType === "extractFrameNode") {
      const ffmpeg = require("fluent-ffmpeg")
      const fs = require("fs")
      const path = require("path")
      const os = require("os")

      const res = await fetch(inputs.video_url)
      const buffer = Buffer.from(await res.arrayBuffer())
      const tmpDir = os.tmpdir()
      const inputPath = path.join(tmpDir, `input-${Date.now()}.mp4`)
      const outputPath = path.join(tmpDir, `frame-${Date.now()}.jpg`)
      fs.writeFileSync(inputPath, buffer)

      let seekTime = 0
      if (inputs.timestamp?.endsWith("%")) {
        const percent = parseFloat(inputs.timestamp) / 100
        await new Promise<void>((resolve, reject) => {
          ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
            if (err) return reject(err)
            seekTime = (metadata.format.duration || 10) * percent
            resolve()
          })
        })
      } else {
        seekTime = parseFloat(inputs.timestamp) || 0
      }

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .seekInput(seekTime)
          .frames(1)
          .output(outputPath)
          .on("end", () => resolve())
          .on("error", reject)
          .run()
      })

      const outputBuffer = fs.readFileSync(outputPath)
      fs.unlinkSync(inputPath)
      fs.unlinkSync(outputPath)
      const url = await uploadToTransloadit(outputBuffer, "frame.jpg", "image/jpeg")
      return NextResponse.json({ output: url })
    }

    return NextResponse.json({ error: "Unknown node type" }, { status: 400 })
  } catch (err: any) {
    console.error("Execute error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
