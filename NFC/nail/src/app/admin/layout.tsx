import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    // Basic role check - detailed check can be in middleware or per-page
    if (!session?.user) {
        redirect("/login")
    }

    return (
        <div className="flex min-h-screen bg-[#F5F5F0]">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-[#E5E5E0] hidden md:block fixed h-full z-10">
                <div className="p-6 border-b border-[#E5E5E0]">
                    <h1 className="text-xl font-serif font-bold text-[#5F6F81]">Nail Link <span className="text-[#8D6E63]">System</span></h1>
                    <p className="text-xs text-gray-400 mt-1">Admin Dashboard</p>
                </div>
                <nav className="p-4 space-y-1">
                    <Link href="/admin" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-[#5F6F81] hover:bg-[#FAF9F6] hover:text-[#8D6E63] transition-colors group">
                        <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">📊</span>
                        ダッシュボード
                    </Link>
                    <Link href="/admin/users" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-[#5F6F81] hover:bg-[#FAF9F6] hover:text-[#8D6E63] transition-colors group">
                        <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">👥</span>
                        顧客管理
                    </Link>
                    <Link href="/admin/tags" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-[#5F6F81] hover:bg-[#FAF9F6] hover:text-[#8D6E63] transition-colors group">
                        <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">🏷️</span>
                        タグ管理
                    </Link>
                    <div className="pt-4 mt-4 border-t border-[#E5E5E0]">
                        <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">System</p>
                        <Link href="/" target="_blank" className="flex items-center px-4 py-2 text-xs font-medium rounded-lg text-gray-500 hover:bg-[#FAF9F6] group">
                            <span className="mr-3 opacity-50">↗️</span>
                            公開サイトを開く
                        </Link>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-8">
                {children}
            </main>
        </div>
    )
}
