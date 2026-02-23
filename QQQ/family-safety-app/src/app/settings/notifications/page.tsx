"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Activity, Map, CloudRain, Sun, Waves, BellRing } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { useNotificationSettings, NotificationSettings } from "@/hooks/useNotificationSettings";
import { useEffect, useState } from "react";

const SETTING_ITEMS: {
    id: keyof NotificationSettings;
    label: string;
    desc: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
}[] = [
        {
            id: "earthquake",
            label: "地震情報",
            desc: "設定した地域の地震情報を通知\n※より迅速な緊急速報を知りたい場合は各専用サイトをご使用ください。",
            icon: Activity,
            color: "text-rose-500",
            bgColor: "bg-rose-50 dark:bg-rose-500/10"
        },
        {
            id: "regionalWarning",
            label: "地域別警報",
            desc: "現在地または設定した地域の気象警報を通知",
            icon: Map,
            color: "text-orange-500",
            bgColor: "bg-orange-50 dark:bg-orange-500/10"
        },
        {
            id: "heavyRain",
            label: "大雨危険度通知",
            desc: "グループの居場所の警戒レベル3以上を通知",
            icon: CloudRain,
            color: "text-blue-500",
            bgColor: "bg-blue-50 dark:bg-blue-500/10"
        },
        {
            id: "weather",
            label: "天気",
            desc: "設定された時間に今日の天気を通知",
            icon: Sun,
            color: "text-amber-500",
            bgColor: "bg-amber-50 dark:bg-amber-500/10"
        },
        {
            id: "majorTsunami",
            label: "大津波警報",
            desc: "大津波警報を通知",
            icon: Waves,
            color: "text-red-500",
            bgColor: "bg-red-50 dark:bg-red-500/10"
        },
        {
            id: "tsunami",
            label: "津波警報",
            desc: "津波警報を通知",
            icon: Waves,
            color: "text-cyan-500",
            bgColor: "bg-cyan-50 dark:bg-cyan-500/10"
        },
    ];

export default function NotificationSettingsPage() {
    const router = useRouter();
    const { settings, updateSetting, isLoaded } = useNotificationSettings();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8">
            {/* Custom Header matching the rich theme */}
            <div className="sticky top-16 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-4 flex items-center">
                <button
                    onClick={() => router.back()}
                    className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    aria-label="戻る"
                >
                    <ChevronLeft className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                </button>
                <div className="flex-1 flex items-center justify-center mr-8">
                    <BellRing className="w-5 h-5 mr-2 text-cyan-600 dark:text-cyan-400" />
                    <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">通知設定</h1>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                    {SETTING_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isEnabled = settings[item.id] ?? false;

                        return (
                            <div key={item.id} className="p-4 sm:p-5 flex items-start gap-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/80">
                                <div className={`mt-0.5 p-2.5 rounded-xl ${item.bgColor} shrink-0`}>
                                    <Icon className={`w-5 h-5 ${item.color}`} />
                                </div>
                                <div className="flex-1 min-w-0 pr-4">
                                    <label
                                        htmlFor={`config-${item.id}`}
                                        className="text-base font-bold text-slate-800 dark:text-slate-200 block mb-1 cursor-pointer"
                                    >
                                        {item.label}
                                    </label>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>
                                <div className="shrink-0 flex items-center pt-2">
                                    <Switch
                                        checked={isEnabled}
                                        onChange={(checked) => updateSetting(item.id, checked)}
                                        ariaLabel={`${item.label}の通知を${isEnabled ? 'オフ' : 'オン'}にする`}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="pt-6 px-2 text-center">
                    <p className="text-xs text-slate-400">
                        ※これらの設定は、お使いの端末でのみ有効です。
                    </p>
                </div>
            </div>
        </div>
    );
}
