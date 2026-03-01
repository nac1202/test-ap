import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import ActivateForm from "./ActivateForm"
import Link from 'next/link'

export default async function ActivatePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
    const { code } = await searchParams
    const session = await auth()

    if (!code) return <div className="p-8 text-center">タグコードが必要です</div>

    const tag = await prisma.tag.findUnique({ where: { tagCode: code } })

    // Basic check, though verify logic handles it too
    if (!tag) {
        return <div className="p-8 text-center">タグが見つかりません</div>
    }

    if (tag.status === 'ACTIVE' || tag.status === 'REPLACED' || tag.status === 'DISABLED') {
        return (
            <div className="p-8 text-center">
                <h1 className="text-xl font-bold mb-2">タグは利用できません</h1>
                <p>このタグは既に有効化されているか、無効化されています。</p>
                <Link href="/app/profile" className="text-blue-600 mt-4 block">プロフィールへ戻る</Link>
            </div>
        )
    }

    const user = await prisma.user.findUnique({
        where: { email: session?.user?.email! },
        include: { profile: { include: { tags: true } } }
    })

    if (!user?.profile) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow text-center max-w-md w-full">
                    <h1 className="text-2xl font-bold mb-4">プロフィール作成が必要です</h1>
                    <p className="text-gray-600 mb-6">タグを有効化する前にプロフィールを作成してください。</p>
                    <Link
                        href="/app/profile"
                        className="block w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition"
                    >
                        プロフィール作成
                    </Link>
                </div>
            </div>
        )
    }

    const activeTagId = user.profile.activeTagId
    const activeTag = activeTagId ? await prisma.tag.findUnique({ where: { id: activeTagId } }) : null

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-md mx-auto">
                <h1 className="text-2xl font-bold text-center mb-8">新しいタグを有効化</h1>

                <div className="bg-white p-6 rounded-xl shadow mb-6">
                    <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">New Tag ID</p>
                    <p className="text-2xl font-mono font-bold text-gray-900">{code}</p>
                </div>

                {activeTag ? (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-8">
                        <div className="flex items-start">
                            <span className="text-2xl mr-3">⚠️</span>
                            <div>
                                <h3 className="font-bold text-yellow-800">交換に関する警告</h3>
                                <p className="text-sm text-yellow-700 mt-1">
                                    現在有効なタグがあります (<strong>{activeTag.tagCode}</strong>)。
                                    新しいタグを有効化すると、現在のタグは<strong>無効化され交換</strong>されます（元に戻せません）。
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-8">
                        <p className="text-green-800 flex items-center justify-center font-medium">
                            ✓ プロフィールに紐付ける準備ができました
                        </p>
                    </div>
                )}

                <ActivateForm tagCode={code} isReplacement={!!activeTag} />

                <div className="text-center mt-6">
                    <Link href="/app/profile" className="text-gray-500 text-sm hover:underline">キャンセル</Link>
                </div>
            </div>
        </div>
    )
}
