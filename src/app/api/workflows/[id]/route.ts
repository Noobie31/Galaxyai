import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workflow = await prisma.workflow.findFirst({
    where: { id: params.id, userId },
  })

  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(workflow)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const workflow = await prisma.workflow.updateMany({
    where: { id: params.id, userId },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.nodes !== undefined && { nodes: parsed.data.nodes }),
      ...(parsed.data.edges !== undefined && { edges: parsed.data.edges }),
    },
  })

  return NextResponse.json({ success: true, count: workflow.count })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.workflow.deleteMany({
    where: { id: params.id, userId },
  })

  return NextResponse.json({ success: true })
}