"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, BookOpen, ShieldCheck, Building, MessageSquare } from "lucide-react";
import { clsx } from "clsx";

const navItems = [
    { href: "/", label: "ホーム", icon: Home },
    { href: "/safety", label: "安否", icon: ShieldCheck },
    { href: "/timeline", label: "連絡", icon: MessageSquare },
    { href: "/map", label: "マップ", icon: Map },
    { href: "/shelter", label: "避難所", icon: Building },
    { href: "/guide", label: "ガイド", icon: BookOpen },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 md:top-16 md:bottom-0 md:w-20 md:h-auto md:border-t-0 md:border-r bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50 flex md:flex-col items-center justify-around md:justify-start md:pt-8 md:gap-8 z-50 pb-safe md:pb-0 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] md:shadow-[8px_0_30px_rgba(0,0,0,0.04)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.2)]">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                            "flex flex-col items-center justify-center w-full md:w-auto h-full md:h-auto transition-all duration-300 transform active:scale-90",
                            isActive ? "text-brand-primary drop-shadow-sm scale-110" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:scale-105"
                        )}
                    >
                        <Icon className="w-5 h-5 md:w-7 md:h-7" />
                        <span className="text-[9px] md:text-xs mt-1 md:mt-2 font-medium">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
