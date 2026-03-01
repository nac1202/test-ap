'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// ==========================================
// User Management Actions (New Phase 9)
// ==========================================

export async function getAdminUsers(query?: string) {
    const session = await auth()
    if (!session?.user) {
        throw new Error("Unauthorized")
    }

    const where: any = {}
    if (query) {
        where.OR = [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { profile: { handle: { contains: query, mode: 'insensitive' } } },
            { profile: { displayName: { contains: query, mode: 'insensitive' } } }
        ]
    }

    const users = await prisma.user.findMany({
        where,
        include: {
            profile: {
                include: {
                    tags: true
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit for safety
    })

    return users
}

export async function deleteUser(userId: string) {
    const session = await auth()
    // In a real app, check for admin role here
    if (!session?.user) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.user.delete({
            where: { id: userId }
        })
        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete user:", error)
        return { error: "Failed to delete user" }
    }
}

// ==========================================
// Tag Management Actions (Restored)
// ==========================================

export async function getTags({ query, status, page = 1 }: { query?: string, status?: string, page?: number }) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const pageSize = 50
    const skip = (page - 1) * pageSize

    const where: any = {}

    if (status && status !== 'ALL') {
        where.status = status
    }

    if (query) {
        where.OR = [
            { tagCode: { contains: query, mode: 'insensitive' } },
            { profile: { handle: { contains: query, mode: 'insensitive' } } },
            { profile: { displayName: { contains: query, mode: 'insensitive' } } }
        ]
    }

    const [tags, total] = await Promise.all([
        prisma.tag.findMany({
            where,
            include: { profile: true },
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize
        }),
        prisma.tag.count({ where })
    ])

    return {
        tags,
        total,
        totalPages: Math.ceil(total / pageSize)
    }
}

export async function generateTags(formData: FormData) {
    const session = await auth()
    if (!session?.user) return { error: "Unauthorized" }

    const count = Number(formData.get("count")) || 10

    try {
        // Simple random tag generation
        const newTags = []
        for (let i = 0; i < count; i++) {
            // Generate a random 8-char string or UUID segment
            const code = 'NFC' + Math.random().toString(36).substring(2, 8).toUpperCase()
            newTags.push({
                tagCode: code,
                status: 'CREATED',
                updatedAt: new Date(),
                createdAt: new Date()
            })
        }

        // SQLite createMany does not support @default(cuid()) so we must create individually
        await Promise.all(
            newTags.map(tag => prisma.tag.create({ data: tag }))
        )

        revalidatePath('/admin/tags')
        revalidatePath('/admin')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to generate tags" }
    }
}

export async function updateTagStatus(formData: FormData) {
    const session = await auth()
    if (!session?.user) return { error: "Unauthorized" }

    const tagCodesInput = formData.get("tagCodes") as string
    const status = formData.get("status") as string
    const note = formData.get("note") as string

    if (!tagCodesInput || !status) return { error: "Missing fields" }

    const tagCodes = tagCodesInput.split(',').map(s => s.trim()).filter(Boolean)

    try {
        await prisma.$transaction(async (tx) => {
            for (const code of tagCodes) {
                const tag = await tx.tag.findUnique({ where: { tagCode: code } })
                if (!tag) continue

                await tx.tag.update({
                    where: { id: tag.id },
                    data: { status }
                })

                await tx.tagEvent.create({
                    data: {
                        tagId: tag.id,
                        event: "STATUS_CHANGE",
                        note: `${status}: ${note}`
                    }
                })
            }
        })

        revalidatePath('/admin/tags')
        revalidatePath('/admin')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to update tags" }
    }
}
