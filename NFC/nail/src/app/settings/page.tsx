import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ProfileForm from "@/components/ProfileForm"
import AnalyticsDashboard from "@/components/AnalyticsDashboard"

export default async function SettingsPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login")
    }

    const profile = await prisma.profile.findUnique({
        where: { userId: session.user.id }
    })

    // Prepare initial data. 
    // Even if profile is null (shouldn't be for valid user usually, but safety check), 
    // we pass nulls/defaults.
    // If we auto-create profile on user creation, profile should exist.
    // If not, we might need to handle the "create" case here implicitly by passing empty values.

    const initialData = {
        displayName: profile?.displayName || "",
        handle: profile?.handle || "",
        bio: profile?.bio || "",
        avatarUrl: profile?.avatarUrl || "",
        linksJson: profile?.linksJson || "[]"
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full mx-auto space-y-8 bg-white p-8 rounded-xl shadow-lg">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        プロフィール設定
                    </h2>
                </div>

                <ProfileForm initialData={initialData} />
            </div>

            <div className="max-w-md w-full mx-auto mt-8">
                <AnalyticsDashboard />
            </div>
        </div>
    )
}
