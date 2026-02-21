import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export const maxDuration = 30

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file)
      return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const params = JSON.stringify({
      auth: {
        key: process.env.NEXT_PUBLIC_TRANSLOADIT_KEY,
      },
      steps: {
        ":original": {
          robot: "/upload/handle",
        },
      },
    })

    const transloaditFormData = new FormData()
    transloaditFormData.append("params", params)
    transloaditFormData.append(
      "file",
      new Blob([new Uint8Array(buffer)], { type: file.type }),
      file.name
    )

    const res = await fetch("https://api2.transloadit.com/assemblies", {
      method: "POST",
      body: transloaditFormData,
    })

    const result = await res.json()

    // Poll until completed
    if (result.assembly_ssl_url) {
      let attempts = 0
      while (attempts < 20) {
        await new Promise((r) => setTimeout(r, 1500))
        const pollRes = await fetch(result.assembly_ssl_url)
        const pollResult = await pollRes.json()

        if (pollResult.ok === "ASSEMBLY_COMPLETED") {
          // Log all results to find the right key
          console.log("Results keys:", Object.keys(pollResult.results || {}))
          console.log("Uploads:", JSON.stringify(pollResult.uploads))

          // Try uploads array first
          if (pollResult.uploads && pollResult.uploads.length > 0) {
            const url = pollResult.uploads[0].ssl_url || pollResult.uploads[0].url
            if (url) return NextResponse.json({ url })
          }

          // Try results with :original key
          const originalResults = pollResult.results?.[":original"]
          if (originalResults && originalResults.length > 0) {
            const url = originalResults[0].ssl_url || originalResults[0].url
            if (url) return NextResponse.json({ url })
          }

          // Try any key in results
          const allResults = pollResult.results || {}
          for (const key of Object.keys(allResults)) {
            const items = allResults[key]
            if (items && items.length > 0) {
              const url = items[0].ssl_url || items[0].url
              if (url) return NextResponse.json({ url })
            }
          }

          console.log("Full poll result:", JSON.stringify(pollResult).slice(0, 1000))
          return NextResponse.json(
            { error: "No URL in completed assembly" },
            { status: 500 }
          )
        }

        if (pollResult.ok === "ASSEMBLY_FAILED") {
          return NextResponse.json(
            { error: pollResult.error || "Assembly failed" },
            { status: 500 }
          )
        }

        attempts++
      }
    }

    return NextResponse.json(
      { error: "Upload timed out" },
      { status: 500 }
    )
  } catch (err: any) {
    console.error("Upload exception:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

