import { task } from "@trigger.dev/sdk/v3"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

export const cropImageTask = task({
    id: "crop-image-task",
    maxDuration: 120,
    run: async (payload: {
        imageUrl: string
        xPercent: number
        yPercent: number
        widthPercent: number
        heightPercent: number
    }) => {
        const ffmpeg = require("fluent-ffmpeg")
        const axios = require("axios")

        const tmpDir = os.tmpdir()
        const inputPath = path.join(tmpDir, `input_${Date.now()}.jpg`)
        const outputPath = path.join(tmpDir, `output_${Date.now()}.jpg`)

        const response = await axios.get(payload.imageUrl, { responseType: "arraybuffer" })
        fs.writeFileSync(inputPath, response.data)

        await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
                if (err) return reject(err)
                const width = metadata.streams[0].width
                const height = metadata.streams[0].height

                const cropX = Math.floor((payload.xPercent / 100) * width)
                const cropY = Math.floor((payload.yPercent / 100) * height)
                const cropW = Math.floor((payload.widthPercent / 100) * width)
                const cropH = Math.floor((payload.heightPercent / 100) * height)

                ffmpeg(inputPath)
                    .videoFilter(`crop=${cropW}:${cropH}:${cropX}:${cropY}`)
                    .output(outputPath)
                    .on("end", resolve)
                    .on("error", reject)
                    .run()
            })
        })

        const fileBuffer = fs.readFileSync(outputPath)
        const base64 = fileBuffer.toString("base64")

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
            new Blob([new Uint8Array(fileBuffer)], { type: "image/jpeg" }),
            "cropped.jpg"
        )

        const uploadRes = await fetch("https://api2.transloadit.com/assemblies", {
            method: "POST",
            body: formData,
        })

        const uploadResult = await uploadRes.json()
        const url = uploadResult.results?.upload?.[0]?.ssl_url

        if (!url) throw new Error("Failed to upload cropped image")

        return url
    },
})

