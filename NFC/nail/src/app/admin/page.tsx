import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function AdminDashboard() {
    const session = await auth()

    // Role check logic is duplicated in actions/middleware.
    // Ideally middleware handles this protection already.
    // But let's double check or fetch data.

    const userCount = await prisma.user.count()
    const tagCount = await prisma.tag.count()
    const activeTags = await prisma.tag.count({ where: { status: 'ACTIVE' } })

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl font-serif font-bold mb-8 text-[#5F6F81]">管理ダッシュボード</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E5E5E0]">
                    <h3 className="text-[#8D6E63] font-bold uppercase text-xs tracking-wider mb-2">総タグ発行数</h3>
                    <p className="text-3xl font-bold text-[#5F6F81] font-serif">{tagCount}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E5E5E0]">
                    <h3 className="text-green-600 font-bold uppercase text-xs tracking-wider mb-2">稼働中 (ACTIVE)</h3>
                    <p className="text-3xl font-bold text-[#5F6F81] font-serif">{activeTags}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E5E5E0]">
                    <h3 className="text-blue-600 font-bold uppercase text-xs tracking-wider mb-2">在庫 (CREATED)</h3>
                    <p className="text-3xl font-bold text-[#5F6F81] font-serif">{await prisma.tag.count({ where: { status: 'CREATED' } })}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E5E5E0]">
                    <h3 className="text-purple-600 font-bold uppercase text-xs tracking-wider mb-2">出荷済 (SHIPPED)</h3>
                    <p className="text-3xl font-bold text-[#5F6F81] font-serif">{await prisma.tag.count({ where: { status: 'SHIPPED' } })}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E5E5E0] md:col-span-4">
                    <h3 className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-3">要対応 / その他</h3>
                    <div className="flex gap-8">
                        <div className="flex items-baseline gap-2">
                            <span className="text-xs font-bold text-gray-500">DISABLED</span>
                            <span className="text-xl font-bold text-[#5F6F81] font-serif">
                                {await prisma.tag.count({ where: { status: 'DISABLED' } })}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xs font-bold text-gray-500">REPLACED</span>
                            <span className="text-xl font-bold text-[#5F6F81] font-serif">
                                {await prisma.tag.count({ where: { status: 'REPLACED' } })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/admin/tags" className="group bg-white p-8 rounded-xl shadow-sm border border-[#E5E5E0] hover:shadow-md hover:border-[#8D6E63] transition-all flex items-center justify-between">
                    <div>
                        <span className="block text-lg font-bold text-[#5F6F81] group-hover:text-[#8D6E63] transition-colors">タグ管理</span>
                        <span className="text-xs text-gray-400 mt-1 block">新規発行・ステータス変更・書き込み</span>
                    </div>
                    <span className="text-gray-300 group-hover:text-[#8D6E63] transition-colors">→</span>
                </Link>
                {/* Placeholder for Users management */}
                <Link href="/admin/users" className="group bg-white p-8 rounded-xl shadow-sm border border-[#E5E5E0] hover:shadow-md hover:border-[#8D6E63] transition-all flex items-center justify-between">
                    <div>
                        <span className="block text-lg font-bold text-[#5F6F81] group-hover:text-[#8D6E63] transition-colors">ユーザー管理</span>
                        <span className="text-xs text-gray-400 mt-1 block">顧客一覧・検索・編集</span>
                    </div>
                    <span className="text-gray-300 group-hover:text-[#8D6E63] transition-colors">→</span>
                </Link>
            </div>
        </div>
    )
}
