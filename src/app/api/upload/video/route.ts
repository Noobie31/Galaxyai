import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export const maxDuration = 60

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
      auth: { key: process.env.NEXT_PUBLIC_TRANSLOADIT_KEY },
      steps: { ":original": { robot: "/upload/handle" } },
    })

    const transloaditFormData = new FormData()
    transloaditFormData.append("params", params)
    transloaditFormData.append("file", new Blob([buffer], { type: file.type }), file.name)

    const res = await fetch("https://api2.transloadit.com/assemblies", {
      method: "POST",
      body: transloaditFormData,
    })

    const result = await res.json()
    console.log("Transloadit video initial:", result.ok)

    const extractUrl = (r: any): string | null => {
      if (r.uploads?.length > 0) {
        return r.uploads[0].ssl_url || r.uploads[0].url || null
      }
      for (const key of Object.keys(r.results || {})) {
        if (r.results[key]?.[0]?.ssl_url) return r.results[key][0].ssl_url
        if (r.results[key]?.[0]?.url) return r.results[key][0].url
      }
      return null
    }

    if (result.ok === "ASSEMBLY_COMPLETED") {
      const url = extractUrl(result)
      if (url) return NextResponse.json({ url })
    }

    if (result.assembly_ssl_url) {
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        const pollRes = await fetch(result.assembly_ssl_url)
        const pollResult = await pollRes.json()
        console.log("Video poll", i, pollResult.ok)

        if (pollResult.ok === "ASSEMBLY_COMPLETED") {
          const url = extractUrl(pollResult)
          if (url) return NextResponse.json({ url })
          console.log("Completed but no URL, uploads:", JSON.stringify(pollResult.uploads))
          console.log("Results keys:", Object.keys(pollResult.results || {}))
          return NextResponse.json({ error: "No URL in completed assembly" }, { status: 500 })
        }

        if (pollResult.ok === "ASSEMBLY_FAILED") {
          return NextResponse.json({ error: pollResult.error || "Assembly failed" }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ error: "Upload timed out" }, { status: 500 })
  } catch (err: any) {
    console.error("Video upload error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
