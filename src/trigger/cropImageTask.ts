import { task } from "@trigger.dev/sdk/v3"
import ffmpeg from "fluent-ffmpeg"
import ffmpegStatic from "ffmpeg-static"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

// Set ffmpeg path from ffmpeg-static
ffmpeg.setFfmpegPath(ffmpegStatic as string)

// Resolve ffprobe path without importing ffprobe-static directly
// (direct import causes esbuild resolution errors in Trigger.dev builds)
function getFfprobePath(): string {
  // Try require.resolve to find the package path at runtime
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffprobeStatic = require("ffprobe-static")
    if (ffprobeStatic?.path && fs.existsSync(ffprobeStatic.path)) {
      return ffprobeStatic.path
    }
  } catch {
    // ignore
  }

  // Fallback: resolve manually from node_modules
  const platform = process.platform // "linux", "darwin", "win32"
  const arch = process.arch         // "x64", "ia32", "arm64"
  const ext = platform === "win32" ? ".exe" : ""

  const candidates = [
    path.join(process.cwd(), "node_modules", "ffprobe-static", "bin", platform, arch, `ffprobe${ext}`),
    path.join(__dirname, "..", "..", "node_modules", "ffprobe-static", "bin", platform, arch, `ffprobe${ext}`),
    "/usr/bin/ffprobe",
    "/usr/local/bin/ffprobe",
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(
    `ffprobe binary not found for platform=${platform} arch=${arch}. Checked: ${candidates.join(", ")}`
  )
}

// Set ffprobe path at module load time
try {
  const ffprobePath = getFfprobePath()
  ffmpeg.setFfprobePath(ffprobePath)
} catch (e) {
  console.warn("Warning: Could not set ffprobe path:", e)
}

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

function getImageDimensions(
  inputPath: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
      if (err) return reject(new Error(`ffprobe failed: ${err.message}`))
      const stream = metadata.streams?.find(
        (s: any) => s.width && s.height
      )
      if (!stream) return reject(new Error("No video/image stream found in file"))
      resolve({ width: stream.width, height: stream.height })
    })
  })
}

export const cropImageTask = task({
  id: "crop-image-task",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    imageUrl: string
    xPercent: number
    yPercent: number
    widthPercent: number
    heightPercent: number
  }) => {
    if (!payload.imageUrl || payload.imageUrl.trim() === "") {
      throw new Error(
        "image_url is required. Make sure Upload Image node has an image and is connected."
      )
    }

    // Re-set ffprobe path inside the task run (Trigger.dev workers may re-initialize)
    try {
      const ffprobePath = getFfprobePath()
      ffmpeg.setFfprobePath(ffprobePath)
    } catch (e) {
      console.warn("Could not set ffprobe path inside task:", e)
    }

    const tmpDir = os.tmpdir()
    const inputPath = path.join(tmpDir, `input-${Date.now()}.jpg`)
    const outputPath = path.join(tmpDir, `output-${Date.now()}.jpg`)

    // Download image
    const res = await fetch(payload.imageUrl)
    if (!res.ok)
      throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`)

    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(inputPath, buffer)

    // Get dimensions via ffprobe
    const { width, height } = await getImageDimensions(inputPath)

    const x = Math.floor((payload.xPercent / 100) * width)
    const y = Math.floor((payload.yPercent / 100) * height)
    const w = Math.max(1, Math.floor((payload.widthPercent / 100) * width))
    const h = Math.max(1, Math.floor((payload.heightPercent / 100) * height))

    // Crop using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilter(`crop=${w}:${h}:${x}:${y}`)
        .frames(1)
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err: any) => reject(new Error(`ffmpeg crop failed: ${err.message}`)))
        .run()
    })

    const outputBuffer = fs.readFileSync(outputPath)

    // Cleanup temp files
    try { fs.unlinkSync(inputPath) } catch { }
    try { fs.unlinkSync(outputPath) } catch { }

    const url = await uploadToTransloadit(outputBuffer, "cropped.jpg", "image/jpeg")
    return { output: url }
  },
})