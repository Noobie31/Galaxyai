import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import WorkflowClient from "./WorkflowClient"

export default async function WorkflowPage({
  params,
}: {
  params: { id: string }
}) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const workflow = await prisma.workflow.findUnique({
    where: { id: params.id },
  })

  if (!workflow || workflow.userId !== userId) redirect("/dashboard")

  return (
    <WorkflowClient
      workflowId={workflow.id}
      workflowName={workflow.name}
      initialNodes={workflow.nodes as any[]}
      initialEdges={workflow.edges as any[]}
    />
  )
}
