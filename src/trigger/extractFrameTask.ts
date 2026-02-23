import { task } from "@trigger.dev/sdk/v3"
import ffmpeg from "fluent-ffmpeg"
import ffmpegStatic from "ffmpeg-static"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

// Only set ffmpeg path — do NOT import ffprobe-static directly
ffmpeg.setFfmpegPath(ffmpegStatic as string)

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

// Get video duration using fluent-ffmpeg's built-in ffprobe
function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
      if (err) return reject(err)
      const duration = metadata?.format?.duration || 10
      resolve(Number(duration))
    })
  })
}

export const extractFrameTask = task({
  id: "extract-frame-task",
  retry: { maxAttempts: 1 },
  run: async (payload: { videoUrl: string; timestamp: string }) => {
    // Validate input
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

    // Download video
    const res = await fetch(payload.videoUrl)
    if (!res.ok) {
      throw new Error(
        `Failed to fetch video from URL: ${res.status} ${res.statusText}`
      )
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(inputPath, buffer)

    // Resolve seek time
    let seekTime = 0
    if (payload.timestamp?.endsWith("%")) {
      const percent = parseFloat(payload.timestamp) / 100
      const duration = await getVideoDuration(inputPath)
      seekTime = duration * percent
    } else {
      seekTime = parseFloat(payload.timestamp) || 0
    }

    // Extract frame
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

    // Cleanup
    try { fs.unlinkSync(inputPath) } catch { }
    try { fs.unlinkSync(outputPath) } catch { }

    const url = await uploadToTransloadit(outputBuffer, "frame.jpg", "image/jpeg")
    return { output: url }
  },
})