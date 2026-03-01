'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
    const session = await auth()
    if (!session?.user?.email) return { error: "認証されていません" }

    const displayName = formData.get("displayName") as string
    const handle = formData.get("handle") as string
    const bio = formData.get("bio") as string
    const avatarUrl = formData.get("avatarUrl") as string
    const linksJson = formData.get("linksJson") as string

    const theme = formData.get("theme") as string || 'STANDARD'
    console.log('[updateProfile] Updating theme to:', theme)

    // Basic validation
    if (!handle) return { error: "ハンドルは必須です" }

    // Check handle uniqueness if changed?
    // upsert will fail if handle unique constraint violated on different user
    // For MVP we just try/catch

    try {
        // We need user ID. 
        // Our auth.ts session callback ensures session.user.id is set.
        const userId = session.user.id

        await prisma.profile.upsert({
            where: { userId },
            update: { displayName, handle, bio, avatarUrl, linksJson, theme },
            create: {
                userId,
                displayName,
                handle,
                bio,
                avatarUrl,
                linksJson,
                theme
            }
        })

        revalidatePath("/app/profile")
        revalidatePath(`/u/${handle}`)
        return { success: true }
    } catch (e) {
        console.error(e)
        // Check for unique constraint violation code P2002
        if ((e as any).code === 'P2002') {
            return { error: "そのハンドルは既に使用されています" }
        }
        return { error: "プロフィールの更新に失敗しました" }
    }
}
