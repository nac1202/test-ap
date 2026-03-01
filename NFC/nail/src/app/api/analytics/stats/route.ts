import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const profile = await prisma.profile.findUnique({
            where: { userId: session.user.id }
        })

        if (!profile) {
            return new NextResponse("Profile not found", { status: 404 })
        }

        // 過去7日間の日付配列を生成（YYYY-MM-DD）
        const dates = Array.from({ length: 7 }, (_, i) => {
            const d = new Date()
            d.setDate(d.getDate() - (6 - i))
            return d.toISOString().split('T')[0]
        })

        // 各日付のアクセス数を集計
        // ※SQLiteでは日付関数が扱いにくいため、シンプルにコード側で集計するか、
        // 範囲指定で全取得してループでカウントします（トラフィックが少ない想定）。
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        sevenDaysAgo.setHours(0, 0, 0, 0)

        const views = await prisma.profileView.findMany({
            where: {
                profileId: profile.id,
                createdAt: {
                    gte: sevenDaysAgo
                }
            },
            select: {
                createdAt: true
            }
        })

        // 日付ごとのカウントマップを作成
        const viewsCountMap: Record<string, number> = {}
        views.forEach(v => {
            // ローカルタイムゾーンに合わせた日付文字列を取得
            const dateStr = new Date(v.createdAt.getTime() - (v.createdAt.getTimezoneOffset() * 60000))
                .toISOString()
                .split('T')[0]

            viewsCountMap[dateStr] = (viewsCountMap[dateStr] || 0) + 1
        })

        // グラフ用に整形した配列を作成
        const stats = dates.map(date => ({
            date: date.substring(5).replace('-', '/'), // "MM/DD"
            views: viewsCountMap[date] || 0
        }))

        return NextResponse.json(stats)
    } catch (error) {
        console.error("Failed to fetch analytics stats:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
