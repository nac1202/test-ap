import { getAdminUsers } from "@/actions/admin"
import Link from "next/link"
import { PlatformIcon } from "@/components/PlatformIcon"
import { THEMES } from "@/lib/themes"

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>
}) {
    const { q } = await searchParams
    const users = await getAdminUsers(q)

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-[#5F6F81]">顧客管理</h1>
                    <p className="text-sm text-gray-400 mt-1">登録ユーザーの一覧と編集</p>
                </div>
                <div className="flex gap-4">
                    <form className="relative">
                        <input
                            type="search"
                            name="q"
                            defaultValue={q}
                            placeholder="名前、IDで検索..."
                            className="pl-10 pr-4 py-2 border border-[#E5E5E0] rounded-lg text-sm focus:outline-none focus:border-[#8D6E63] w-64"
                        />
                        <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
                    </form>
                    <Link href="/admin/tags" className="bg-[#8D6E63] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-[#795E56] transition-colors">
                        + タグ発行へ
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E0] overflow-hidden">
                <table className="min-w-full divide-y divide-[#E5E5E0]">
                    <thead className="bg-[#FAF9F6]">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Theme</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">NFC Tag</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#E5E5E0]">
                        {users.map((user) => {
                            const profile = user.profile
                            const tags = profile?.tags || []
                            const theme = THEMES.find(t => t.id === profile?.theme)
                            const activeTag = tags.find((t: any) => t.status === 'ACTIVE')

                            return (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                {profile?.avatarUrl ? (
                                                    <img className="h-10 w-10 rounded-full object-cover border border-gray-200" src={profile.avatarUrl} alt="" />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold">
                                                        {profile?.displayName?.[0] || user.name?.[0] || "?"}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-bold text-[#5F6F81]">{profile?.displayName || user.name || "No Name"}</div>
                                                <div className="text-xs text-gray-400">@{profile?.handle || "no-handle"}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {theme ? (
                                            <div className="flex items-center">
                                                <span className={`w-3 h-3 rounded-full mr-2 border border-black/10 ${theme.color.split(' ')[0]}`}></span>
                                                <span className="text-sm text-gray-600">{theme.label}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {activeTag ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        ) : tags.length > 0 ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                {tags.length} Tags
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-50 text-red-300">
                                                None
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-3">
                                            <Link href={`/u/${profile?.handle}`} target="_blank" className="text-indigo-400 hover:text-indigo-600">
                                                View
                                            </Link>
                                            <span className="text-gray-300">|</span>
                                            {/* In a real app we would have an admin-edit page, for now we don't have one so maybe just link to public profile or settings if we could impersonate */}
                                            {/* For now, just a placeholder or link to the tag writer pre-filled? */}
                                            <Link href={`/admin/tags?userId=${user.id}`} className="text-[#8D6E63] hover:text-[#5F6F81]">
                                                Issue Tag
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                    ユーザーが見つかりません
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
