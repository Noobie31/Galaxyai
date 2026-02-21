import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export const maxDuration = 60

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const params = JSON.stringify({
      auth: { key: process.env.NEXT_PUBLIC_TRANSLOADIT_KEY },
      steps: { ":original": { robot: "/upload/handle" } },
    })

    const tFormData = new FormData()
    tFormData.append("params", params)
    tFormData.append("file", new Blob([new Uint8Array(buffer)], { type: file.type }), file.name)

    const res = await fetch("https://api2.transloadit.com/assemblies", { method: "POST", body: tFormData })
    const result = await res.json()

    const extractUrl = (r: any): string | null => {
      if (r.uploads?.length > 0) return r.uploads[0].ssl_url || r.uploads[0].url || null
      for (const key of Object.keys(r.results || {})) {
        const items = r.results[key]
        if (items?.length > 0) return items[0].ssl_url || items[0].url || null
      }
      return null
    }

    // Poll assembly until done
    const assemblyUrl = result.assembly_ssl_url || result.assembly_url
    if (!assemblyUrl) return NextResponse.json({ error: "No assembly URL" }, { status: 500 })

    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1500))
      const poll = await (await fetch(assemblyUrl)).json()
      console.log(`Video poll ${i}: ${poll.ok}, uploads: ${poll.uploads?.length}, results keys: ${Object.keys(poll.results || {}).join(",")}`)

      if (poll.ok === "ASSEMBLY_COMPLETED") {
        const url = extractUrl(poll)
        if (url) return NextResponse.json({ url })
        // If no URL in results, the file is in uploads array
        console.log("Full uploads:", JSON.stringify(poll.uploads?.slice(0,2)))
        console.log("Full results:", JSON.stringify(poll.results))
        return NextResponse.json({ error: "Assembly complete but no URL found" }, { status: 500 })
      }
      if (poll.ok === "ASSEMBLY_FAILED") return NextResponse.json({ error: poll.error }, { status: 500 })
    }

    return NextResponse.json({ error: "Upload timed out" }, { status: 500 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

