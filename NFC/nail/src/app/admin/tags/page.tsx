import { auth } from "@/auth"
import { getTags } from "@/actions/admin"
import { generateTags, updateTagStatus } from "@/actions/admin"
import Link from 'next/link'
import TagWriterHelp from "@/components/admin/TagWriterHelp"
import TagGeneratorForm from "@/components/admin/TagGeneratorForm"

// Helper to make search params accessible
export default async function AdminTagsPage({ searchParams }: { searchParams: Promise<{ query?: string, status?: string, page?: string }> }) {
    const params = await searchParams
    const query = params.query || ''
    const status = params.status || 'ALL'
    const page = Number(params.page) || 1

    const session = await auth()

    // Fetch tags with server action logic
    const { tags, total, totalPages = 1 } = await getTags({ query, status, page })

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-serif font-bold text-[#5F6F81]">タグ管理</h1>
                <Link href="/admin" className="text-xs text-gray-500 hover:text-[#8D6E63] transition-colors border-b border-gray-300 hover:border-[#8D6E63] pb-0.5">ダッシュボードへ戻る</Link>
            </div>

            {/* Tag Generation Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E5E5E0] mb-8">
                <h2 className="text-sm font-bold text-[#5F6F81] mb-4 uppercase tracking-wider">新規タグ発行 (在庫追加)</h2>
                <TagGeneratorForm />
            </div>

            {/* Batch Update Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E5E5E0] mb-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-100"></div>
                <h2 className="text-sm font-bold text-[#5F6F81] mb-2 uppercase tracking-wider">タグステータス変更 / 無効化</h2>
                <div className="mb-6 text-xs text-gray-500 leading-relaxed">
                    紛失・盗難・不良などでタグを停止する場合に使用します。<br />
                    ステータスを <span className="font-mono bg-gray-100 px-1">DISABLED</span> にすると、そのタグは読み取れなくなります。
                </div>
                <form action={async (formData) => {
                    "use server"
                    await updateTagStatus(formData)
                }} className="flex flex-col md:flex-row gap-4 items-end bg-[#FAFAF9] p-4 rounded-lg border border-dashed border-gray-200">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">タグコード (完全一致)</label>
                        <input type="text" name="tagCodes" placeholder="TEST..." className="bg-white border border-[#E5E5E0] rounded px-3 py-2 w-48 text-sm focus:ring-1 focus:ring-[#8D6E63] outline-none" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">変更後ステータス</label>
                        <select name="status" className="bg-white border border-[#E5E5E0] rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#8D6E63] outline-none" defaultValue="DISABLED">
                            <option value="DISABLED">DISABLED (無効)</option>
                            <option value="ACTIVE">ACTIVE (有効)</option>
                            <option value="CREATED">CREATED (在庫)</option>
                            <option value="SHIPPED">SHIPPED (出荷済)</option>
                        </select>
                    </div>
                    <div className="flex-1 w-full text-left">
                        <label className="block text-xs font-bold text-gray-400 mb-1">理由 (必須)</label>
                        <input type="text" name="note" placeholder="紛失報告あり、など" className="bg-white border border-[#E5E5E0] rounded px-3 py-2 w-full text-sm focus:ring-1 focus:ring-[#8D6E63] outline-none" required />
                    </div>
                    <button type="submit" className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded hover:bg-red-50 transition-colors whitespace-nowrap text-sm font-bold">
                        変更実行
                    </button>
                </form>
            </div>

            {/* Search & Filter */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E5E5E0] mb-8">
                <div className="flex justify-between mb-4 flex-wrap gap-4 items-center">
                    <h2 className="text-sm font-bold text-[#5F6F81] uppercase tracking-wider">タグ検索</h2>
                    <a href="/api/admin/tags/export" className="text-xs bg-white hover:bg-gray-50 px-3 py-2 rounded border border-[#E5E5E0] text-gray-600 transition-colors">
                        CSVエクスポート
                    </a>
                </div>
                <form className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            name="query"
                            defaultValue={query}
                            placeholder="タグコード、ユーザー名、Email..."
                            className="bg-[#F9F9F8] border border-[#E5E5E0] rounded-lg px-4 py-2 w-full text-sm focus:ring-1 focus:ring-[#8D6E63] outline-none"
                        />
                    </div>
                    <div>
                        <select name="status" defaultValue={status} className="bg-[#F9F9F8] border border-[#E5E5E0] rounded-lg px-4 py-2 w-full md:w-auto text-sm focus:ring-1 focus:ring-[#8D6E63] outline-none text-gray-600">
                            <option value="ALL">すべて (ステータス)</option>
                            <option value="CREATED">CREATED (在庫)</option>
                            <option value="SHIPPED">SHIPPED (出荷済)</option>
                            <option value="ACTIVE">ACTIVE (有効)</option>
                            <option value="REPLACED">REPLACED (交換済)</option>
                            <option value="DISABLED">DISABLED (無効)</option>
                        </select>
                    </div>
                    <button type="submit" className="bg-[#5F6F81] text-white px-6 py-2 rounded-lg hover:bg-[#4B5563] transition-colors shadow-sm text-sm font-bold">
                        検索
                    </button>
                    {(query || status !== 'ALL') && (
                        <Link href="/admin/tags" className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center text-sm">
                            クリア
                        </Link>
                    )}
                </form>
            </div>

            {/* Tags Table */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E0] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E5E5E0] bg-[#FAFAF9] flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tag List</span>
                    <span className="text-xs text-gray-400">
                        {total} 件中 {(page - 1) * 50 + 1} - {Math.min(page * 50, total)} 件を表示
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#E5E5E0]">
                        <thead className="bg-[#FAFAF9]">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">タグコード</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">ステータス</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">紐付け先</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">作成日</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">操作</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-[#E5E5E0]">
                            {tags?.map((tag: any) => (
                                <tr key={tag.id} className="hover:bg-[#FAFAF9] transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-600">{tag.tagCode}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-md uppercase tracking-wide
                                        ${tag.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-100' :
                                                tag.status === 'CREATED' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                    tag.status === 'REPLACED' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                                                        tag.status === 'SHIPPED' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                            {tag.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {tag.profile?.handle ? (
                                            <div>
                                                <Link href={`/u/${tag.profile.handle}`} className="text-[#5F6F81] font-bold hover:text-[#8D6E63] hover:underline block transition-colors">
                                                    @{tag.profile.handle}
                                                </Link>
                                                <div className="text-xs text-gray-400 mt-0.5">{tag.profile.displayName}</div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-300 text-sm">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                                        {new Date(tag.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <TagWriterHelp
                                            tagCode={tag.tagCode}
                                            status={tag.status}
                                            handle={tag.profile?.handle}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center py-6 gap-2 bg-[#FAFAF9] border-t border-[#E5E5E0]">
                        {page > 1 && (
                            <Link
                                href={{ query: { query, status, page: page - 1 } }}
                                className="px-3 py-1 bg-white border border-[#E5E5E0] rounded hover:bg-gray-50 text-sm text-gray-600"
                            >
                                前へ
                            </Link>
                        )}
                        <span className="px-3 py-1 bg-[#8D6E63] text-white rounded text-sm font-bold shadow-sm">
                            {page} / {totalPages}
                        </span>
                        {page < totalPages && (
                            <Link
                                href={{ query: { query, status, page: page + 1 } }}
                                className="px-3 py-1 bg-white border border-[#E5E5E0] rounded hover:bg-gray-50 text-sm text-gray-600"
                            >
                                次へ
                            </Link>
                        )}
                    </div>
                )}

                {tags?.length === 0 && (
                    <div className="text-center py-12 text-gray-400 text-sm">
                        条件に一致するタグが見つかりませんでした。
                    </div>
                )}
            </div>
        </div>
    )
}
