import { task, logger } from "@trigger.dev/sdk/v3"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

// Helper: upload a file buffer to Transloadit and poll until complete
async function uploadToTransloadit(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
): Promise<string> {
    const transloaditKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY!

    const params = JSON.stringify({
        auth: { key: transloaditKey },
        steps: {
            ":original": { robot: "/upload/handle" },
        },
    })

    const formData = new FormData()
    formData.append("params", params)
    formData.append(
        "file",
        new Blob([fileBuffer], { type: mimeType }),
        fileName
    )

    const uploadRes = await fetch("https://api2.transloadit.com/assemblies", {
        method: "POST",
        body: formData,
    })

    if (!uploadRes.ok) {
        throw new Error(`Transloadit upload failed: ${uploadRes.statusText}`)
    }

    const uploadResult = await uploadRes.json()
    logger.log("Transloadit initial response", { ok: uploadResult.ok, error: uploadResult.error })

    // Already completed immediately (rare but possible)
    if (uploadResult.ok === "ASSEMBLY_COMPLETED") {
        return extractUrlFromResult(uploadResult)
    }

    if (uploadResult.ok === "ASSEMBLY_FAILED") {
        throw new Error(`Transloadit assembly failed: ${uploadResult.error || "unknown"}`)
    }

    // Poll the assembly until it completes
    const assemblyUrl = uploadResult.assembly_ssl_url || uploadResult.assembly_url
    if (!assemblyUrl) {
        throw new Error("No assembly URL returned from Transloadit")
    }

    const MAX_ATTEMPTS = 30
    const POLL_INTERVAL_MS = 2000

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        await sleep(POLL_INTERVAL_MS)

        const pollRes = await fetch(assemblyUrl)
        if (!pollRes.ok) {
            logger.warn(`Poll attempt ${attempt + 1} returned ${pollRes.status}`)
            continue
        }

        const pollResult = await pollRes.json()
        logger.log(`Poll attempt ${attempt + 1}`, { ok: pollResult.ok })

        if (pollResult.ok === "ASSEMBLY_COMPLETED") {
            return extractUrlFromResult(pollResult)
        }

        if (pollResult.ok === "ASSEMBLY_FAILED") {
            throw new Error(`Transloadit assembly failed: ${pollResult.error || "unknown"}`)
        }

        // Still processing — keep polling
    }

    throw new Error("Transloadit upload timed out after 60 seconds")
}

// Extract the best URL from a completed Transloadit assembly result
function extractUrlFromResult(result: any): string {
    // Try uploads array first (most reliable)
    if (result.uploads?.length > 0) {
        const url = result.uploads[0].ssl_url || result.uploads[0].url
        if (url) return url
    }

    // Try results with :original key
    const originalResults = result.results?.[":original"]
    if (originalResults?.length > 0) {
        const url = originalResults[0].ssl_url || originalResults[0].url
        if (url) return url
    }

    // Try any key in results
    for (const key of Object.keys(result.results || {})) {
        const items = result.results[key]
        if (items?.length > 0) {
            const url = items[0].ssl_url || items[0].url
            if (url) return url
        }
    }

    throw new Error("No URL found in completed Transloadit assembly")
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export const cropImageTask = task({
    id: "crop-image-task",
    maxDuration: 180,
    run: async (payload: {
        imageUrl: string
        xPercent: number
        yPercent: number
        widthPercent: number
        heightPercent: number
    }) => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const ffmpeg = require("fluent-ffmpeg")
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const axios = require("axios")

        logger.log("Starting crop image task", {
            imageUrl: payload.imageUrl,
            xPercent: payload.xPercent,
            yPercent: payload.yPercent,
            widthPercent: payload.widthPercent,
            heightPercent: payload.heightPercent,
        })

        const tmpDir = os.tmpdir()
        const inputPath = path.join(tmpDir, `input_${Date.now()}.jpg`)
        const outputPath = path.join(tmpDir, `output_${Date.now()}.jpg`)

        try {
            // Download source image
            logger.log("Downloading source image...")
            const response = await axios.get(payload.imageUrl, {
                responseType: "arraybuffer",
                timeout: 30000,
            })
            fs.writeFileSync(inputPath, response.data)
            logger.log("Source image downloaded", { size: response.data.byteLength })

            // Probe image dimensions then crop
            await new Promise<void>((resolve, reject) => {
                ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
                    if (err) return reject(new Error(`ffprobe failed: ${err.message}`))

                    const stream = metadata.streams.find(
                        (s: any) => s.codec_type === "video" || s.width
                    )
                    if (!stream) return reject(new Error("No video/image stream found"))

                    const width: number = stream.width
                    const height: number = stream.height

                    logger.log("Image dimensions", { width, height })

                    // Clamp values to valid range
                    const xPct = Math.max(0, Math.min(100, payload.xPercent))
                    const yPct = Math.max(0, Math.min(100, payload.yPercent))
                    const wPct = Math.max(1, Math.min(100, payload.widthPercent))
                    const hPct = Math.max(1, Math.min(100, payload.heightPercent))

                    const cropX = Math.floor((xPct / 100) * width)
                    const cropY = Math.floor((yPct / 100) * height)
                    const cropW = Math.max(1, Math.floor((wPct / 100) * width))
                    const cropH = Math.max(1, Math.floor((hPct / 100) * height))

                    // Ensure crop doesn't exceed image bounds
                    const safeCropW = Math.min(cropW, width - cropX)
                    const safeCropH = Math.min(cropH, height - cropY)

                    logger.log("Crop params", { cropX, cropY, safeCropW, safeCropH })

                    ffmpeg(inputPath)
                        .videoFilter(`crop=${safeCropW}:${safeCropH}:${cropX}:${cropY}`)
                        .output(outputPath)
                        .on("end", () => resolve())
                        .on("error", (e: Error) => reject(new Error(`ffmpeg crop failed: ${e.message}`)))
                        .run()
                })
            })

            logger.log("Crop complete, reading output file...")
            const fileBuffer = fs.readFileSync(outputPath)

            // Upload to Transloadit with proper polling
            logger.log("Uploading cropped image to Transloadit...")
            const url = await uploadToTransloadit(fileBuffer, "cropped.jpg", "image/jpeg")

            logger.log("Upload complete", { url })
            return url
        } finally {
            // Cleanup temp files
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
        }
    },
})