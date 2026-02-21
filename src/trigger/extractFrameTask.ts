import { task, logger } from "@trigger.dev/sdk/v3"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

async function uploadToTransloadit(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  const params = JSON.stringify({
    auth: { key: process.env.NEXT_PUBLIC_TRANSLOADIT_KEY! },
    steps: { ":original": { robot: "/upload/handle" } },
  })
  const formData = new FormData()
  formData.append("params", params)
  formData.append("file", new Blob([new Uint8Array(fileBuffer)], { type: mimeType }), fileName)

  const res = await fetch("https://api2.transloadit.com/assemblies", { method: "POST", body: formData })
  const result = await res.json()

  const poll = async (url: string): Promise<string> => {
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const pr = await (await fetch(url)).json()
      if (pr.ok === "ASSEMBLY_COMPLETED") {
        if (pr.uploads?.[0]?.ssl_url) return pr.uploads[0].ssl_url
        for (const key of Object.keys(pr.results || {})) {
          if (pr.results[key]?.[0]?.ssl_url) return pr.results[key][0].ssl_url
        }
      }
      if (pr.ok === "ASSEMBLY_FAILED") throw new Error("Upload failed")
    }
    throw new Error("Upload timed out")
  }

  if (result.ok === "ASSEMBLY_COMPLETED") {
    if (result.uploads?.[0]?.ssl_url) return result.uploads[0].ssl_url
  }
  if (result.assembly_ssl_url) return poll(result.assembly_ssl_url)
  throw new Error("No assembly URL")
}

export const extractFrameTask = task({
  id: "extract-frame-task",
  maxDuration: 180,
  run: async (payload: { videoUrl: string; timestamp: string }) => {
    const ffmpeg = require("fluent-ffmpeg")
    const axios = require("axios")

    const tmpDir = os.tmpdir()
    const inputPath = path.join(tmpDir, `video_${Date.now()}.mp4`)
    const outputPath = path.join(tmpDir, `frame_${Date.now()}.jpg`)

    try {
      logger.log("Downloading video...")
      const response = await axios.get(payload.videoUrl, { responseType: "arraybuffer", timeout: 60000 })
      fs.writeFileSync(inputPath, response.data)

      let timeInSeconds = 0
      const ts = String(payload.timestamp || "0").trim()

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

      logger.log("Extracting frame at", { timeInSeconds })

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
      logger.log("Uploading frame to Transloadit...")
      const url = await uploadToTransloadit(fileBuffer, "frame.jpg", "image/jpeg")
      logger.log("Done", { url })
      return url
    } finally {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
    }
  },
})

