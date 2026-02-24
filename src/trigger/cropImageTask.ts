import { task } from "@trigger.dev/sdk/v3"
import ffmpeg from "fluent-ffmpeg"
import ffmpegStatic from "ffmpeg-static"
import ffprobeStatic from "ffprobe-static"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

ffmpeg.setFfmpegPath(ffmpegStatic as string)
ffmpeg.setFfprobePath(ffprobeStatic.path)

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
      if (err) return reject(err)
      const stream = metadata.streams?.find(
        (s: any) => s.width && s.height
      )
      if (!stream) return reject(new Error("No video/image stream found"))
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

    const tmpDir = os.tmpdir()
    const inputPath = path.join(tmpDir, `input-${Date.now()}.jpg`)
    const outputPath = path.join(tmpDir, `output-${Date.now()}.jpg`)

    const res = await fetch(payload.imageUrl)
    if (!res.ok)
      throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`)

    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(inputPath, buffer)

    const { width, height } = await getImageDimensions(inputPath)

    const x = Math.floor((payload.xPercent / 100) * width)
    const y = Math.floor((payload.yPercent / 100) * height)
    const w = Math.max(1, Math.floor((payload.widthPercent / 100) * width))
    const h = Math.max(1, Math.floor((payload.heightPercent / 100) * height))

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilter(`crop=${w}:${h}:${x}:${y}`)
        .frames(1)
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run()
    })

    const outputBuffer = fs.readFileSync(outputPath)

    try { fs.unlinkSync(inputPath) } catch { }
    try { fs.unlinkSync(outputPath) } catch { }

    const url = await uploadToTransloadit(outputBuffer, "cropped.jpg", "image/jpeg")
    return { output: url }
  },
})