"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, HeartPulse, Shield } from "lucide-react";
import { clsx } from "clsx";

const tabs = [
    { href: "/guide", label: "防災", icon: BookOpen, color: "text-green-500", activeBg: "bg-green-50", activeBorder: "border-green-500", activeText: "text-green-700" },
    { href: "/firstaid", label: "救護", icon: HeartPulse, color: "text-rose-500", activeBg: "bg-rose-50", activeBorder: "border-rose-500", activeText: "text-rose-700" },
    { href: "/security", label: "防犯", icon: Shield, color: "text-indigo-500", activeBg: "bg-indigo-50", activeBorder: "border-indigo-500", activeText: "text-indigo-700" },
];

export function GuideTabs() {
    const pathname = usePathname();

    return (
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = pathname === tab.href;

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={clsx(
                            "flex items-center space-x-2 px-4 py-3 rounded-xl border transition-all whitespace-nowrap flex-1 justify-center",
                            isActive
                                ? `${tab.activeBg} ${tab.activeBorder} ${tab.activeText} shadow-sm border-b-2 font-bold`
                                : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        <Icon className={clsx("w-5 h-5", isActive ? "" : tab.color)} />
                        <span>{tab.label}</span>
                    </Link>
                );
            })}
        </div>
    );
}
