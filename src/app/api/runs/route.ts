import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
    const { userId } = await auth()
    if (!userId)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const workflowId = searchParams.get("workflowId")

    if (!workflowId)
        return NextResponse.json({ error: "workflowId required" }, { status: 400 })

    const runs = await prisma.workflowRun.findMany({
        where: { workflowId, userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { nodeExecutions: true },
    })

    return NextResponse.json(runs)
}

export async function POST(req: Request) {
    const { userId } = await auth()
    if (!userId)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { workflowId, scope, status } = body

    const run = await prisma.workflowRun.create({
        data: { workflowId, userId, scope, status },
        include: { nodeExecutions: true },
    })

    return NextResponse.json(run)
}