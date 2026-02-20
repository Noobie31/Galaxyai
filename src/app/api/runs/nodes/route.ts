import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
    const { userId } = await auth()
    if (!userId)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { runId, nodeId, nodeType, status, inputs, outputs, error, duration } = body

    const nodeExecution = await prisma.nodeExecution.create({
        data: { runId, nodeId, nodeType, status, inputs, outputs, error, duration },
    })

    return NextResponse.json(nodeExecution)
}