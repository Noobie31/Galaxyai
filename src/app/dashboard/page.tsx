import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import DashboardClient from "./DashboardClient"

export default async function DashboardPage() {
    const { userId } = await auth()
    if (!userId) redirect("/sign-in")

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

    // Serialize dates and cast JSON fields to avoid Prisma JsonValue type errors
    const serialized = workflows.map((w) => ({
        id: w.id,
        name: w.name,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
        nodes: (w.nodes ?? []) as any[],
        edges: (w.edges ?? []) as any[],
    }))

    return <DashboardClient workflows={serialized} userId={userId} />
}