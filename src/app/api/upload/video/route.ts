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
      new Blob([buffer], { type: file.type }),
      file.name
    )

    const res = await fetch("https://api2.transloadit.com/assemblies", {
      method: "POST",
      body: transloaditFormData,
    })

    const result = await res.json()
    console.log("Transloadit video response:", result.ok, result.error)

    if (result.ok === "ASSEMBLY_COMPLETED") {
      const uploadedFile = result.results?.[":original"]?.[0]
      if (uploadedFile?.ssl_url) {
        return NextResponse.json({ url: uploadedFile.ssl_url })
      }
    }

    if (result.assembly_ssl_url) {
      let attempts = 0
      while (attempts < 20) {
        await new Promise((r) => setTimeout(r, 2000))
        const pollRes = await fetch(result.assembly_ssl_url)
        const pollResult = await pollRes.json()
        console.log("Poll attempt", attempts, "status:", pollResult.ok)
        if (pollResult.ok === "ASSEMBLY_COMPLETED") {
          const uploadedFile = pollResult.results?.[":original"]?.[0]
          if (uploadedFile?.ssl_url) {
            return NextResponse.json({ url: uploadedFile.ssl_url })
          }
        }
        if (pollResult.ok === "ASSEMBLY_FAILED") {
          return NextResponse.json(
            { error: "Assembly failed", details: pollResult.error },
            { status: 500 }
          )
        }
        attempts++
      }
    }

    return NextResponse.json(
      { error: "Upload failed", details: result.error },
      { status: 500 }
    )
  } catch (err: any) {
    console.error("Upload exception:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
