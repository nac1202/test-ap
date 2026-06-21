"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, HeartPulse, Shield, Car } from "lucide-react";
import { clsx } from "clsx";

const tabs = [
    { href: "/guide", label: "防災", icon: BookOpen, color: "text-orange-500", activeBg: "bg-orange-50", activeBorder: "border-orange-500", activeText: "text-orange-700" },
    { href: "/drive", label: "運転", icon: Car, color: "text-blue-500", activeBg: "bg-blue-50", activeBorder: "border-blue-500", activeText: "text-blue-700" },
    { href: "/firstaid", label: "救護", icon: HeartPulse, color: "text-rose-500", activeBg: "bg-rose-50", activeBorder: "border-rose-500", activeText: "text-rose-700" },
    { href: "/security", label: "防犯", icon: Shield, color: "text-indigo-500", activeBg: "bg-indigo-50", activeBorder: "border-indigo-500", activeText: "text-indigo-700" },
];

export function GuideTabs() {
    const pathname = usePathname();

    return (
        <div className="flex gap-1.5 sm:gap-2 mb-6 overflow-x-visible w-full pb-2">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = pathname === tab.href;

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={clsx(
                            "flex items-center justify-center gap-1 px-1 sm:px-3 py-2.5 sm:py-3 rounded-xl border transition-all flex-1",
                            isActive
                                ? `${tab.activeBg} ${tab.activeBorder} ${tab.activeText} shadow-sm border-b-2 font-bold`
                                : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        <Icon className={clsx("w-4 h-4 sm:w-5 sm:h-5 shrink-0", isActive ? "" : tab.color)} />
                        <span className="text-[13px] sm:text-sm font-medium whitespace-nowrap">{tab.label}</span>
                    </Link>
                );
            })}
        </div>
    );
}
