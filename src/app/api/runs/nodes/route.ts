import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const bodySchema = z.object({
    runId: z.string(),
    nodeId: z.string(),
    nodeType: z.string(),
    status: z.string(),
    inputs: z.any().optional(),
    outputs: z.any().optional(),
    error: z.string().nullable().optional(),
    duration: z.number().nullable().optional(),
})

export async function POST(req: Request) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 })
    }

    const { runId, nodeId, nodeType, status, inputs, outputs, error, duration } = parsed.data

    try {
        const nodeExecution = await prisma.nodeExecution.create({
            data: {
                runId,
                nodeId,
                nodeType,
                status,
                inputs: inputs ?? {},
                outputs: outputs ?? null,
                error: error ?? null,
                duration: duration ?? null,
            },
        })

        return NextResponse.json(nodeExecution)
    } catch (err: any) {
        console.error("Save node execution error:", err)
        return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 })
    }
}

export async function GET(req: Request) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const runId = searchParams.get("runId")

    if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 })

    const nodeExecutions = await prisma.nodeExecution.findMany({
        where: { runId },
        orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(nodeExecutions)
}