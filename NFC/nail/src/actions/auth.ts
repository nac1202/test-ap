'use server'

import { signIn } from "@/auth"
import { prisma } from "@/lib/prisma"
import { randomInt } from "crypto"
import { redirect } from "next/navigation"
import { Resend } from 'resend'
import { VerificationEmail } from '@/emails/VerificationEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOtp(formData: FormData) {
    try {
        const email = formData.get("email") as string
        if (!email) return { error: "Email is required" }

        // 1. Rate Limit: Check if OTP sent recently (60s)
        const recentToken = await prisma.verificationToken.findFirst({
            where: { identifier: email },
            orderBy: { expires: 'desc' }
        })

        if (recentToken) {
            const createdApprox = recentToken.expires.getTime() - (10 * 60 * 1000)
            const now = Date.now()
            if (now - createdApprox < 60 * 1000) {
                return { error: "少し時間を置いてから再送してください (60s)" }
            }
        }

        const otp = randomInt(100000, 999999).toString()
        const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 min

        // Clean up old
        await prisma.verificationToken.deleteMany({
            where: { identifier: email }
        })

        // Create new
        await prisma.verificationToken.create({
            data: {
                identifier: email,
                token: otp,
                expires
            }
        })

        // "Send" email
        if (process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY) {
            console.log(`\n\n[DEV OTP] For: ${email} -> CODE: ${otp}\n\n`)
            console.log("※ RESEND_API_KEY が設定されていないため、コンソールに出力しました。")
        } else {
            console.log(`[PROD API Call] OTP email initiating to ${email}`)
            const { data, error } = await resend.emails.send({
                from: process.env.EMAIL_FROM || 'Nail Link <onboarding@resend.dev>',
                to: [email],
                subject: '【Nail Link】ログイン認証コード',
                react: VerificationEmail({ validationCode: otp }) as React.ReactElement,
            })

            if (error) {
                console.error("Resend API Error:", error)
                return { error: `メールの送信に失敗しました: ${error.message}` }
            }
            console.log("Email sent successfully:", data)
        }

        return { success: true }
    } catch (e: any) {
        console.error("Send OTP Error (Top Level):", e)
        return { error: `[SERVER ERROR]: ${e?.message || 'Failed to send OTP'}` }
    }
}

export async function loginWithOtp(formData: FormData) {
    try {
        const email = formData.get("email") as string
        const otp = formData.get("otp") as string

        if (!email || !otp) return { error: "Missing fields" }

        // 2. Lockout Check
        const attempt = await prisma.loginAttempt.findUnique({
            where: { identifier: email }
        })

        if (attempt) {
            const LOCKOUT_THRESHOLD = 5
            const LOCKOUT_DURATION = 10 * 60 * 1000

            if (attempt.count >= LOCKOUT_THRESHOLD) {
                const timeSinceLast = Date.now() - attempt.lastAttempt.getTime()
                if (timeSinceLast < LOCKOUT_DURATION) {
                    const remaining = Math.ceil((LOCKOUT_DURATION - timeSinceLast) / 60000)
                    return { error: `アカウントは一時的にロックされています。${remaining}分後に試してください。` }
                } else {
                    await prisma.loginAttempt.update({
                        where: { identifier: email },
                        data: { count: 0 }
                    })
                }
            }
        }

        await signIn("credentials", {
            email,
            otp,
            redirectTo: "/app/profile"
        })

    } catch (error: any) {
        if (error?.message?.includes("NEXT_REDIRECT")) {
            throw error; // Let Next.js handle the redirect
        }

        if (error?.message?.includes("CredentialsSignin")) {
            const email = formData.get("email") as string
            if (email) {
                // Failed Login: Increment count
                await prisma.loginAttempt.upsert({
                    where: { identifier: email },
                    update: {
                        count: { increment: 1 },
                        lastAttempt: new Date()
                    },
                    create: {
                        identifier: email,
                        count: 1,
                        lastAttempt: new Date()
                    }
                })
            }
            return { error: "無効なコードです" }
        }

        console.error("Login OTP Error (Top Level):", error)
        return { error: `[SERVER ERROR]: ${error?.message || 'Failed to login'}` }
    }
}
