"use client";

import { GuideList } from "@/components/Guide/GuideList";
import { Search } from "lucide-react";
import guides from "@/data/disaster_guide.json";
import { GuideItem } from "@/types/guide";
import { useState } from "react";

import { GuideTabs } from "@/components/Guide/GuideTabs";

export default function GuidePage() {
    const [searchQuery, setSearchQuery] = useState("");
    // Cast JSON data to GuideItem[]
    const allGuides = guides as unknown as GuideItem[];

    // Filter for disaster categories only (exclude security, defense, firstaid)
    const disasterGuides = allGuides.filter(g => {
        const excludedCategories = [
            'security', 'fraud', 'cyber', // Security Page
            'defense',                    // Security Page (Defense Tab)
            'firstaid', 'heatstroke'      // First Aid Page
        ];
        return !excludedCategories.includes(g.category);
    });

    return (
        <div className="p-4 pb-20 max-w-md mx-auto">
            <GuideTabs />
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">防災ガイド</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    災害時に役立つ情報をカテゴリ別にまとめています。
                    <br />
                    いざという時のために、事前の確認をおすすめします。
                </p>
            </div>

            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400 dark:text-slate-500" />
                    <input
                        type="text"
                        placeholder="キーワードで検索 (例: 地震, 応急処置)"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <GuideList guides={disasterGuides} searchQuery={searchQuery} />
        </div>
    );
}
