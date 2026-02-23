"use client";

import { useMemo, useState } from "react";
import { GuideList } from "@/components/Guide/GuideList";
import { SearchInput } from "@/components/Guide/SearchInput";
import guidesData from "@/data/disaster_guide.json";
import { GuideItem } from "@/types/guide";
import { useSearchGuide } from "@/hooks/useSearchGuide";
import { Shield } from "lucide-react";

import { GuideTabs } from "@/components/Guide/GuideTabs";

export default function SecurityPage() {
    const [activeTab, setActiveTab] = useState<'security' | 'defense'>('security');

    // Cast JSON data to GuideItem[]
    const allGuides = guidesData as unknown as GuideItem[];

    // Filter guides based on active tab
    const filteredGuidesByCategory = useMemo(() => {
        if (activeTab === 'security') {
            const securityCategories = ['security', 'fraud', 'cyber'];
            return allGuides.filter(g => securityCategories.includes(g.category));
        } else {
            return allGuides.filter(g => g.category === 'defense');
        }
    }, [allGuides, activeTab]);

    const { searchTerm, setSearchTerm, filteredGuides } = useSearchGuide(filteredGuidesByCategory);

    return (
        <div className="p-4 pb-24 max-w-md mx-auto">
            <GuideTabs />
            <div className="flex items-center mb-6">
                <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded-full mr-3">
                    <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">防犯・護身ガイド</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {activeTab === 'security' ? '犯罪を未然に防ぐ知識' : '危険から身を守る対処法'}
                    </p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                <button
                    className={`flex-1 py-2 text-center font-medium text-sm transition-colors ${activeTab === 'security'
                        ? 'text-purple-600 border-b-2 border-purple-600 dark:text-purple-400 dark:border-purple-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    onClick={() => setActiveTab('security')}
                >
                    防犯（予防）
                </button>
                <button
                    className={`flex-1 py-2 text-center font-medium text-sm transition-colors ${activeTab === 'defense'
                        ? 'text-purple-600 border-b-2 border-purple-600 dark:text-purple-400 dark:border-purple-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    onClick={() => setActiveTab('defense')}
                >
                    護身（対処）
                </button>
            </div>

            <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={activeTab === 'security' ? "防犯情報を検索..." : "護身術を検索..."}
            />

            <GuideList guides={filteredGuides} />
        </div>
    );
}
