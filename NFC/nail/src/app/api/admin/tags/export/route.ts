import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await auth()
    const user = await prisma.user.findUnique({ where: { email: session?.user?.email! } })
    if (user?.role !== 'ADMIN') {
        return new NextResponse("Unauthorized", { status: 403 })
    }

    const tags = await prisma.tag.findMany({
        orderBy: { createdAt: 'desc' },
        include: { profile: true }
    })

    // Basic CSV Construction
    const header = "TagCode,Status,LinkedProfile,CreatedDate\n"
    const rows = tags.map(t => {
        const profile = t.profile?.handle || ''
        return `${t.tagCode},${t.status},${profile},${t.createdAt.toISOString()}`
    }).join("\n")

    const csv = header + rows

    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="tags_export.csv"'
        }
    })
}
