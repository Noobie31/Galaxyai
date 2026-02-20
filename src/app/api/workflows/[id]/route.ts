import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
})

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workflow = await prisma.workflow.findUnique({
    where: { id: params.id },
  })

  if (!workflow || workflow.userId !== userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(workflow)
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const data = updateSchema.parse(body)

  const workflow = await prisma.workflow.update({
    where: { id: params.id, userId },
    data: { ...data, updatedAt: new Date() },
  })

  return NextResponse.json(workflow)
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.workflow.delete({
    where: { id: params.id, userId },
  })

  return NextResponse.json({ success: true })
}
