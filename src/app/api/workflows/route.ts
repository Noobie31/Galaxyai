import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
    name: z.string().default("untitled"),
})

export async function GET() {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const workflows = await prisma.workflow.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json(workflows)
}

export async function POST(req: Request) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { name } = createSchema.parse(body)

    const workflow = await prisma.workflow.create({
        data: { userId, name, nodes: [], edges: [] },
    })

    return NextResponse.json(workflow)
}

