import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const runId = searchParams.get("runId")

    if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 })

    try {
        const { runs } = await import("@trigger.dev/sdk/v3")
        const run = await runs.retrieve(runId)

        if (run.status === "COMPLETED") {
            return NextResponse.json({
                status: "COMPLETED",
                output: run.output,
            })
        }

        if (
            run.status === "FAILED" ||
            run.status === "CANCELED" ||
            run.status === "CRASHED" ||
            run.status === "SYSTEM_FAILURE" ||
            run.status === "TIMED_OUT" ||
            run.status === "EXPIRED"
        ) {
            const errorMsg =
                (run as any)?.error?.message ||
                (run as any)?.error ||
                `Task ${run.status.toLowerCase()}`

            return NextResponse.json({ status: "FAILED", error: String(errorMsg) })
        }

        // Still running (QUEUED, EXECUTING, WAITING_FOR_DEPLOY, etc.)
        return NextResponse.json({ status: "PENDING" })
    } catch (err: any) {
        console.error("Poll error:", err)
        return NextResponse.json({ error: err.message || "Poll failed" }, { status: 500 })
    }
}