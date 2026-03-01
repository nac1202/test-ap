import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import ProfileForm from "./ProfileForm"
import Link from 'next/link'

export default async function ProfilePage() {
    const session = await auth()
    if (!session?.user?.email) return <div>Access Denied</div>

    // Fetch Full Profile
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            profile: {
                include: { tags: true }
            }
        }
    })

    // Basic stats or tag info
    const activeTag = user?.profile?.tags.find(t => t.id === user.profile?.activeTagId)

    return (
        <div className="min-h-screen bg-[#F5F5F0] py-12 px-4 sm:px-6 lg:px-8 font-sans text-[#5F6F81]">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-serif font-bold text-[#5F6F81]">プロフィール管理</h1>
                    {user?.profile?.handle && (
                        <Link href={`/u/${user.profile.handle}`} target="_blank" className="text-sm text-[#8D6E63] hover:text-[#5F6F81] transition-colors border-b border-[#E5E5E0] hover:border-[#5F6F81] pb-0.5">
                            公開ページを確認する →
                        </Link>
                    )}
                </div>

                <div className="bg-white/80 backdrop-blur-sm px-4 py-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] sm:rounded-xl sm:p-8 border border-white">
                    <h2 className="text-sm font-bold text-[#8D6E63] uppercase tracking-wider mb-6">基本設定</h2>
                    <ProfileForm initialData={user?.profile || {}} />
                </div>

                {/* Active Tag Info */}
                <div className="bg-white px-6 py-6 shadow-sm sm:rounded-xl border border-[#E5E5E0]">
                    <h3 className="text-sm font-bold text-[#5F6F81] mb-3">連携中のNFCタグ</h3>
                    {activeTag ? (
                        <div className="flex items-center gap-4">
                            <div className="bg-[#E8F5E9] text-[#2E7D32] px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                                ACTIVE
                            </div>
                            <p className="text-sm font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded">ID: {activeTag.tagCode}</p>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg flex items-start gap-3">
                            <span className="text-xl">💡</span>
                            <p>有効なタグがありません。<br />新しいタグを購入し、管理者に有効化を依頼してください。</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
