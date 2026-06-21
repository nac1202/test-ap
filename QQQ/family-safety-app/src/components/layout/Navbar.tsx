'use client';

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, LogIn, Settings, HelpCircle } from "lucide-react";
import { useAuth } from "@/components/Auth/AuthProvider";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export function Navbar() {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const [isThemeOpen, setIsThemeOpen] = useState(false);

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-brand-header-from to-brand-header-to dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-md text-white shadow-sm border-b border-white/10 dark:border-slate-700/50 flex items-center justify-between px-4 md:pl-24 z-50 transition-all duration-300">
            <div className="flex flex-col justify-center">
                <div className="flex items-baseline gap-2">
                    <Link href="/" className="text-xl font-bold tracking-wide drop-shadow-sm flex items-center gap-1.5">
                        <span className="font-bold">Kizuna</span>
                        <span className="font-medium opacity-90">Safety</span>
                    </Link>
                    <span className="text-[10px] text-white/90 font-medium hidden sm:inline">防災・安否確認アプリ</span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-wide mt-0.5 leading-tight">
                    防災・安否確認 - 大切な人との<br className="sm:hidden" />キズナをつなぐ
                </span>
            </div>
            <div className="flex items-center gap-1">
                <ThemeSwitcher onOpenChange={setIsThemeOpen} />
                <Link
                    href="/about"
                    className={`p-2 hover:bg-white/10 rounded-full transition-all duration-300 flex items-center justify-center active:scale-90 ${!isThemeOpen && pathname === '/about' ? 'bg-white/20 scale-110 shadow-sm' : ''}`}
                    aria-label="機能紹介（ヘルプ）"
                >
                    <HelpCircle className="w-5 h-5" />
                </Link>
                <Link
                    href="/settings/notifications"
                    className={`p-2 hover:bg-white/10 rounded-full transition-all duration-300 flex items-center justify-center active:scale-90 ${!isThemeOpen && pathname.startsWith('/settings') ? 'bg-white/20 scale-110 shadow-sm' : ''}`}
                    aria-label="通知設定"
                >
                    <Settings className="w-5 h-5" />
                </Link>
                {!loading && (
                    <Link
                        href={user ? "/profile" : "/login"}
                        className={`p-2 hover:bg-white/10 rounded-full transition-all duration-300 flex items-center justify-center active:scale-90 ${!isThemeOpen && (pathname === '/profile' || pathname === '/login') ? 'bg-white/20 scale-110 shadow-sm' : ''}`}
                        aria-label={user ? "プロフィール" : "ログイン"}
                    >
                        {user ? <User className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
                    </Link>
                )}
            </div>
        </header>
    );
}
