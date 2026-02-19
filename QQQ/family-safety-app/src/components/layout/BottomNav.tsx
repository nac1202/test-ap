"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, BookOpen, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";

const navItems = [
    { href: "/", label: "ホーム", icon: Home },
    { href: "/map", label: "マップ", icon: Map },
    { href: "/guide", label: "安心ガイド", icon: BookOpen },
    { href: "/safety", label: "安否", icon: ShieldCheck },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around z-50 pb-safe shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                            "flex flex-col items-center justify-center w-full h-full transition-colors",
                            isActive ? "text-cyan-600" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <Icon className="w-6 h-6" />
                        <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
