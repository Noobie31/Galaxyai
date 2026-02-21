import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { runs } from "@trigger.dev/sdk/v3"

export const maxDuration = 10

export async function GET(req: Request) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const runId = searchParams.get("runId")

    if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 })

    try {
        const run = await runs.retrieve(runId)

        if (run.status === "COMPLETED") {
            return NextResponse.json({ status: "COMPLETED", output: (run.output as any)?.output })
        }

        if (
            run.status === "FAILED" ||
            run.status === "CRASHED" ||
            run.status === "CANCELED" ||
            run.status === "SYSTEM_FAILURE" ||
            run.status === "INTERRUPTED" ||
            run.status === "EXPIRED"
        ) {
            return NextResponse.json({
                status: "FAILED",
                error: `Task ${run.status}`,
            })
        }

        // Still running: QUEUED, EXECUTING, WAITING_FOR_DEPLOY, REATTEMPTING, etc.
        return NextResponse.json({ status: "PENDING" })
    } catch (err: any) {
        console.error("Poll error:", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}