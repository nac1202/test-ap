'use client';

import Link from "next/link";
import { User, LogIn, Settings } from "lucide-react";
import { useAuth } from "@/components/Auth/AuthProvider";

export function Navbar() {
    const { user, loading } = useAuth();

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-cyan-600/95 to-blue-600/95 dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-md text-white shadow-sm border-b border-white/10 dark:border-slate-700/50 flex items-center justify-between px-4 z-50 transition-all duration-300">
            <div className="flex items-center gap-2">
                <Link href="/" className="text-xl font-bold tracking-wide drop-shadow-sm">
                    Kizuna Safety
                </Link>
            </div>
            <div className="flex items-center gap-1">
                <Link
                    href="/settings/notifications"
                    className="p-2 hover:bg-white/10 rounded-full transition-all duration-300 flex items-center justify-center active:scale-90"
                    aria-label="通知設定"
                >
                    <Settings className="w-5 h-5" />
                </Link>
                {!loading && (
                    <Link
                        href={user ? "/profile" : "/login"}
                        className="p-2 hover:bg-white/10 rounded-full transition-all duration-300 flex items-center justify-center active:scale-90"
                        aria-label={user ? "プロフィール" : "ログイン"}
                    >
                        {user ? <User className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
                    </Link>
                )}
            </div>
        </header>
    );
}
