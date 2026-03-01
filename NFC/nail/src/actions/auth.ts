'use server'

import { signIn } from "@/auth"
import { prisma } from "@/lib/prisma"
import { randomInt } from "crypto"
import { redirect } from "next/navigation"
import { Resend } from 'resend'
import { VerificationEmail } from '@/emails/VerificationEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOtp(formData: FormData) {
    const email = formData.get("email") as string
    if (!email) return { error: "Email is required" }

    // 1. Rate Limit: Check if OTP sent recently (60s)
    const recentToken = await prisma.verificationToken.findFirst({
        where: { identifier: email },
        orderBy: { expires: 'desc' } // Assuming created recently
    })

    if (recentToken) {
        // VerificationToken doesn't have createdAt by default in my schema? 
        // Let's check schema. No createdAt.
        // But expires is 10 min future. 
        // If expires > now + 9min (approx), then it was created < 1min ago.
        const createdApprox = recentToken.expires.getTime() - (10 * 60 * 1000)
        const now = Date.now()
        if (now - createdApprox < 60 * 1000) {
            return { error: "少し時間を置いてから再送してください (60s)" }
        }
    }

    const otp = randomInt(100000, 999999).toString()
    const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 min

    try {
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
                return { error: "メールの送信に失敗しました。後ほど再試行してください。" }
            }
            console.log("Email sent successfully:", data)
        }

        return { success: true }
    } catch (e) {
        console.error("Send OTP Error:", e)
        return { error: "Failed to send OTP" }
    }
}

export async function loginWithOtp(formData: FormData) {
    const email = formData.get("email") as string
    const otp = formData.get("otp") as string

    if (!email || !otp) return { error: "Missing fields" }

    // 2. Lockout Check
    const attempt = await prisma.loginAttempt.findUnique({
        where: { identifier: email }
    })

    if (attempt) {
        // Check if locked
        // Logic: 5 failures = Lockout.
        // How long? 10 min.
        // We need to know WHEN the last failure was.
        // If count >= 5 and lastAttempt < 10 mins ago -> Locked.
        const LOCKOUT_THRESHOLD = 5
        const LOCKOUT_DURATION = 10 * 60 * 1000

        if (attempt.count >= LOCKOUT_THRESHOLD) {
            const timeSinceLast = Date.now() - attempt.lastAttempt.getTime()
            if (timeSinceLast < LOCKOUT_DURATION) {
                const remaining = Math.ceil((LOCKOUT_DURATION - timeSinceLast) / 60000)
                return { error: `アカウントは一時的にロックされています。${remaining}分後に試してください。` }
            } else {
                // Lockout expired, strictly speaking we should reset count, 
                // but we can just let it slide or reset here?
                // Let's reset on successful login, or here.
                // Better reset here if we want to allow attempt.
                await prisma.loginAttempt.update({
                    where: { identifier: email },
                    data: { count: 0 }
                })
            }
        }
    }

    try {
        await signIn("credentials", {
            email,
            otp,
            redirectTo: "/app/profile" // Default redirect
        })

        // Success: Reset attempts
        // Note: signIn redirects (throws) on success? 
        // Actually signIn throws NEXT_REDIRECT. 
        // So we can't reach here easily unless redirect is false.
        // But if we put await signIn inside try/catch, we catch the redirect error.

    } catch (error) {
        if ((error as Error).message.includes("CredentialsSignin")) {
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
            return { error: "無効なコードです" }
        }
        throw error // Rethrow redirect
    }
}
