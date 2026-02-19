"use client";

import { useMemo } from "react";
import { GuideList } from "@/components/Guide/GuideList";
import { SearchInput } from "@/components/Guide/SearchInput";
import guidesData from "@/data/disaster_guide.json";
import { GuideItem } from "@/types/guide";
import { useSearchGuide } from "@/hooks/useSearchGuide";
import { HeartPulse } from "lucide-react";

import { GuideTabs } from "@/components/Guide/GuideTabs";

export default function FirstAidPage() {
    // Cast JSON data to GuideItem[]
    const allGuides = guidesData as unknown as GuideItem[];

    // Filter for firstaid and heatstroke categories
    const firstAidGuides = useMemo(() => {
        const targetCategories = ['firstaid', 'heatstroke'];
        return allGuides.filter(g => targetCategories.includes(g.category));
    }, [allGuides]);

    const { searchTerm, setSearchTerm, filteredGuides } = useSearchGuide(firstAidGuides);

    return (
        <div className="p-4 pb-24 max-w-md mx-auto">
            <GuideTabs />
            <div className="flex items-center mb-6">
                <div className="bg-red-100 p-2 rounded-full mr-3">
                    <HeartPulse className="w-6 h-6 text-red-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">救護ガイド</h1>
                    <p className="text-sm text-gray-500">命を救うための応急手当</p>
                </div>
            </div>

            <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="救護情報を検索..."
            />

            <GuideList guides={filteredGuides} />
        </div>
    );
}
