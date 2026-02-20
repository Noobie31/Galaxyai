import { task } from "@trigger.dev/sdk/v3"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

export const extractFrameTask = task({
  id: "extract-frame-task",
  maxDuration: 120,
  run: async (payload: {
    videoUrl: string
    timestamp: string
  }) => {
    const ffmpeg = require("fluent-ffmpeg")
    const axios = require("axios")

    const tmpDir = os.tmpdir()
    const inputPath = path.join(tmpDir, `video_${Date.now()}.mp4`)
    const outputPath = path.join(tmpDir, `frame_${Date.now()}.jpg`)

    const response = await axios.get(payload.videoUrl, { responseType: "arraybuffer" })
    fs.writeFileSync(inputPath, response.data)

    let timeInSeconds = 0

    if (payload.timestamp.includes("%")) {
      const percent = parseFloat(payload.timestamp) / 100
      await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
          if (err) return reject(err)
          const duration = metadata.format.duration || 0
          timeInSeconds = duration * percent
          resolve(null)
        })
      })
    } else {
      timeInSeconds = parseFloat(payload.timestamp) || 0
    }

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(timeInSeconds)
        .frames(1)
        .output(outputPath)
        .on("end", resolve)
        .on("error", reject)
        .run()
    })

    const fileBuffer = fs.readFileSync(outputPath)

    fs.unlinkSync(inputPath)
    fs.unlinkSync(outputPath)

    const transloaditKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY!
    const params = JSON.stringify({
      auth: { key: transloaditKey },
      steps: {
        upload: { robot: "/upload/handle" },
      },
    })

    const formData = new FormData()
    formData.append("params", params)
    formData.append(
      "file",
      new Blob([fileBuffer], { type: "image/jpeg" }),
      "frame.jpg"
    )

    const uploadRes = await fetch("https://api2.transloadit.com/assemblies", {
      method: "POST",
      body: formData,
    })

    const uploadResult = await uploadRes.json()
    const url = uploadResult.results?.upload?.[0]?.ssl_url

    if (!url) throw new Error("Failed to upload frame")

    return url
  },
})
