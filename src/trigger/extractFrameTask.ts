import { task } from "@trigger.dev/sdk/v3"
import ffmpeg from "fluent-ffmpeg"
import ffmpegStatic from "ffmpeg-static"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

ffmpeg.setFfmpegPath(ffmpegStatic as string)
// ✅ No module-level ffprobe setup — was crashing on Windows dev with "binary not found"

async function uploadToTransloadit(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const params = JSON.stringify({
    auth: { key: process.env.NEXT_PUBLIC_TRANSLOADIT_KEY },
    steps: { ":original": { robot: "/upload/handle" } },
  })
  const formData = new FormData()
  formData.append("params", params)
  formData.append(
    "file",
    new Blob([new Uint8Array(fileBuffer)], { type: mimeType }),
    fileName
  )

  const res = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: formData,
  })
  const result = await res.json()
  const assemblyUrl = result.assembly_ssl_url || result.assembly_url

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    const poll = await (await fetch(assemblyUrl)).json()
    if (poll.ok === "ASSEMBLY_COMPLETED") {
      if (poll.uploads?.length > 0)
        return poll.uploads[0].ssl_url || poll.uploads[0].url
      for (const key of Object.keys(poll.results || {})) {
        if (poll.results[key]?.length > 0)
          return poll.results[key][0].ssl_url || poll.results[key][0].url
      }
    }
    if (poll.ok === "ASSEMBLY_FAILED") throw new Error(poll.error)
  }
  throw new Error("Upload timed out")
}

// ✅ Parse duration from ffmpeg stderr — works with ONLY ffmpeg, no ffprobe needed
// ffmpeg always prints "Duration: HH:MM:SS.ss" when reading any media file
function getVideoDurationFfmpegOnly(inputPath: string): Promise<number> {
  return new Promise((resolve) => {
    let durationSeconds = 10 // safe default if parsing fails
    const args = ["-i", inputPath, "-f", "null", "-"]
    const { spawn } = require("child_process")
    const proc = spawn(ffmpegStatic as string, args, { stdio: ["ignore", "ignore", "pipe"] })

    proc.stderr.on("data", (chunk: Buffer) => {
      const line = chunk.toString()
      const match = line.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
      if (match) {
        const h = parseInt(match[1])
        const m = parseInt(match[2])
        const s = parseFloat(match[3])
        durationSeconds = h * 3600 + m * 60 + s
      }
    })

    proc.on("close", () => resolve(durationSeconds))
    proc.on("error", () => resolve(durationSeconds))
  })
}

export const extractFrameTask = task({
  id: "extract-frame-task",
  retry: { maxAttempts: 1 },
  run: async (payload: { videoUrl: string; timestamp: string }) => {
    if (
      !payload.videoUrl ||
      typeof payload.videoUrl !== "string" ||
      payload.videoUrl.trim() === ""
    ) {
      throw new Error(
        "video_url is required but was empty or missing. Make sure the Upload Video node has a video uploaded and is connected."
      )
    }

    try {
      new URL(payload.videoUrl)
    } catch {
      throw new Error(
        `Invalid video_url: "${payload.videoUrl}" is not a valid URL.`
      )
    }

    const tmpDir = os.tmpdir()
    const inputPath = path.join(tmpDir, `input-${Date.now()}.mp4`)
    const outputPath = path.join(tmpDir, `frame-${Date.now()}.jpg`)

    const res = await fetch(payload.videoUrl)
    if (!res.ok) {
      throw new Error(
        `Failed to fetch video from URL: ${res.status} ${res.statusText}`
      )
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(inputPath, buffer)

    let seekTime = 0

    if (payload.timestamp?.endsWith("%")) {
      // ✅ Use ffmpeg stderr parsing — no ffprobe binary needed at all
      const percent = parseFloat(payload.timestamp) / 100
      const duration = await getVideoDurationFfmpegOnly(inputPath)
      seekTime = duration * percent
    } else {
      seekTime = parseFloat(payload.timestamp) || 0
    }

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(seekTime)
        .frames(1)
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err: any) =>
          reject(new Error(`ffmpeg frame extraction failed: ${err.message}`))
        )
        .run()
    })

    const outputBuffer = fs.readFileSync(outputPath)

    try { fs.unlinkSync(inputPath) } catch { }
    try { fs.unlinkSync(outputPath) } catch { }

    const url = await uploadToTransloadit(outputBuffer, "frame.jpg", "image/jpeg")
    return { output: url }
  },
})