import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnProtected = nextUrl.pathname.startsWith("/app") || nextUrl.pathname.startsWith("/admin")

            if (isOnProtected) {
                if (isLoggedIn) {
                    // Check for Admin Role
                    if (nextUrl.pathname.startsWith("/admin")) {
                        const userRole = (auth?.user as any)?.role
                        if (userRole !== 'ADMIN') {
                            return false // Deny access to non-admins
                        }
                    }
                    return true
                }
                return false // Redirects to login
            }
            return true
        },
        jwt({ token, user }) {
            if (user) {
                token.id = user.id
                // Add role if needed
                if ('role' in user) {
                    token.role = (user as any).role
                }
            }
            return token
        },
        session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string
                session.user.role = (token.role as string) || 'USER'
            }
            return session
        }
    },
    providers: [], // Configured in auth.ts
} satisfies NextAuthConfig
