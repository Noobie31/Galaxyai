import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import DashboardClient from "./DashboardClient"

export default async function DashboardPage() {
    const { userId } = await auth()
    if (!userId) redirect("/sign-in")

    const workflows = await prisma.workflow.findMany({
        where: { userId: userId! },
        orderBy: { updatedAt: "desc" },
    })

    const serialized = workflows.map((w) => ({
        ...w,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
    }))

    return <DashboardClient workflows={serialized} userId={userId!} />
}