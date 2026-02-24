import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
    name: z.string().default("Untitled"),
    nodes: z.array(z.any()).default([]),
    edges: z.array(z.any()).default([]),
})

export async function GET() {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const workflows = await prisma.workflow.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true,
            nodes: true,
            edges: true,
        },
    })

    return NextResponse.json(workflows)
}

export async function POST(req: Request) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const workflow = await prisma.workflow.create({
        data: {
            userId,
            name: parsed.data.name,
            nodes: parsed.data.nodes,
            edges: parsed.data.edges,
        },
    })

    return NextResponse.json(workflow)
}