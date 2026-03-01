import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            name: "OTP",
            credentials: {
                email: { label: "Email", type: "email" },
                otp: { label: "OTP", type: "text" },
            },
            authorize: async (credentials) => {
                console.log("Authorize called with:", credentials)
                try {
                    const email = credentials.email as string
                    const otp = credentials.otp as string

                    if (!email || !otp) {
                        console.log("Missing email or otp")
                        return null
                    }

                    // 1. Verify OTP
                    let token = null;
                    const isDev = process.env.NODE_ENV !== 'production'

                    if (otp === "000000" && isDev) {
                        console.log("Master OTP used (Dev Only)")
                        // Bypass for dev/MVP
                    } else {
                        token = await prisma.verificationToken.findFirst({
                            where: {
                                identifier: email,
                                token: otp,
                                expires: { gt: new Date() }
                            }
                        })

                        if (!token) {
                            console.log("Invalid OTP token not found")
                            return null
                        }
                    }

                    // 2. Consume OTP (Delete it)
                    if (token) {
                        await prisma.verificationToken.delete({
                            where: { identifier_token: { identifier: email, token: otp } }
                        })
                    }

                    // 3. Find or Create User
                    console.log("Upserting user for email:", email)
                    const user = await prisma.user.upsert({
                        where: { email },
                        update: { emailVerified: new Date() },
                        create: {
                            email,
                            emailVerified: new Date(),
                        }
                    })
                    console.log("User upserted:", user)

                    return user
                } catch (e) {
                    console.error("Authorize error:", e)
                    return null
                }
            },
        }),
    ],
    // Force callbacks to be merged or define here if spread is issue
    callbacks: {
        ...authConfig.callbacks,
    },
    session: { strategy: "jwt" }
})
