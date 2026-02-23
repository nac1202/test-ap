"use client";

import { useState } from "react";
import { LocationMap } from "@/components/Map/LocationMap";
import { OfflineRadar } from "@/components/Map/OfflineRadar";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Compass, Map as MapIcon } from "lucide-react";

export default function MapPage() {
    const { isOnline } = useNetworkStatus();
    const [forceRadar, setForceRadar] = useState(false);

    const showRadar = !isOnline || forceRadar;

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <div className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-10 sticky top-16 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {showRadar ? 'オフライン・レーダー' : '共有マップ'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {showRadar ? '大切な人の位置をコンパスで案内します。' : '大切な人の最新位置情報を表示します。'}
                    </p>
                </div>

                <button
                    onClick={() => setForceRadar(!forceRadar)}
                    className={`p-3 rounded-full shadow-sm transition-all transform active:scale-90 ${showRadar
                            ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                        }`}
                    aria-label={showRadar ? "マップに戻る" : "レーダーを起動"}
                >
                    {showRadar ? <MapIcon size={22} /> : <Compass size={22} />}
                </button>
            </div>

            {!isOnline && !forceRadar && (
                <div className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-500 text-xs px-4 py-2.5 text-center border-b border-amber-200 dark:border-amber-800/50 font-medium">
                    現在オフラインのため、通信不要のレーダーモードを使用しています。
                </div>
            )}

            <div className="flex-1 p-3 md:p-4 relative bg-slate-50 dark:bg-slate-900 overflow-hidden">
                {showRadar ? (
                    <div className="h-full w-full max-w-md mx-auto pt-2 pb-6">
                        <OfflineRadar />
                    </div>
                ) : (
                    <LocationMap />
                )}
            </div>
        </div>
    );
}
