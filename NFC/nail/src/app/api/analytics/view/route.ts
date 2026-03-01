import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { handle } = body

        if (!handle) {
            return NextResponse.json({ error: "Handle is required" }, { status: 400 })
        }

        // 1. プロフィールの存在確認
        const profile = await prisma.profile.findUnique({
            where: { handle }
        })

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 })
        }

        // 2. 閲覧ログの追加
        await prisma.profileView.create({
            data: {
                profileId: profile.id
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to track view:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
