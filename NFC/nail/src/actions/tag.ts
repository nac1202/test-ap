'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function activateTag(formData: FormData) {
    const session = await auth()
    if (!session?.user?.email) return { error: "認証されていません" }

    const tagCode = formData.get("tagCode") as string
    if (!tagCode) return { error: "タグコードが必要です" }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Fetch Tax & User Profile
            const tag = await tx.tag.findUnique({ where: { tagCode } })
            if (!tag) throw new Error("タグが見つかりません")
            if (tag.status !== "CREATED" && tag.status !== "SHIPPED") {
                throw new Error("このタグは有効化できません")
            }

            const user = await tx.user.findUnique({
                where: { email: session.user?.email! },
                include: { profile: true }
            })

            if (!user?.profile) {
                // Should have profile created before activation? 
                // Or create here? Requirement says "Login -> Create Profile OR Replace".
                // If no profile, we can't link. Return error to UI to force profile creation first.
                throw new Error("プロフィールが必要です")
            }

            const profileId = user.profile.id
            const oldActiveTagId = user.profile.activeTagId

            // 2. Handle Old Tag (Replacement)
            if (oldActiveTagId) {
                // Update old tag
                await tx.tag.update({
                    where: { id: oldActiveTagId },
                    data: {
                        status: "REPLACED",
                        replacedByTagId: tag.id // Link to new tag
                    }
                })

                await tx.tagEvent.create({
                    data: {
                        tagId: oldActiveTagId,
                        event: "REPLACED",
                        note: `Replaced by ${tagCode}`
                    }
                })
            }

            // 3. Update New Tag
            await tx.tag.update({
                where: { id: tag.id },
                data: {
                    status: "ACTIVE",
                    profileId: profileId
                }
            })

            await tx.tagEvent.create({
                data: {
                    tagId: tag.id,
                    event: "ACTIVATED",
                    note: oldActiveTagId ? `Replaced previous tag` : `First activation`
                }
            })

            // 4. Update Profile
            await tx.profile.update({
                where: { id: profileId },
                data: { activeTagId: tag.id }
            })

            return { success: true, handle: user.profile.handle }
        })

        revalidatePath("/app/profile")
        if (result.handle) {
            revalidatePath(`/u/${result.handle}`)
            return { success: true, redirectUrl: `/u/${result.handle}` }
        }
        return { success: true }

    } catch (e) {
        console.error(e)
        return { error: (e as Error).message || "有効化に失敗しました" }
    }
}
