"use client";

import { useDisasterAlerts, DisasterAlert } from "@/hooks/useDisasterAlerts";
import { AlertTriangle, Info, Bell, AlertOctagon } from "lucide-react";
import { WeeklyForecast } from "./WeeklyForecast";

export function DisasterAlertBanner() {
    const { alerts, forecast, weeklyForecast, locationName, loading, error, refetch } = useDisasterAlerts();

    if (loading) {
        return (
            <div className="bg-slate-50 text-slate-500 text-xs py-2 px-4 shadow flex items-center justify-between border-b border-slate-200">
                <span>現在地の災害情報を取得中...</span>
            </div>
        );
    }

    if (error || !locationName) {
        return null; // Don't show anything if it fails or there's no location
    }

    if (alerts.length === 0) {
        return (
            <div className="bg-teal-50 text-teal-800 text-xs py-2.5 px-4 shadow flex flex-col gap-1.5 border-b border-teal-100">
                <div className="flex items-center gap-2">
                    <Info size={14} className="text-teal-600 flex-shrink-0" />
                    <span className="leading-tight">
                        <strong>{locationName}</strong>: 現在発表されている気象警報・注意報はありません。
                    </span>
                    <button onClick={refetch} className="ml-auto flex-shrink-0 underline text-[10px] text-teal-600">更新</button>
                </div>
                {forecast && (
                    <div className="flex items-center gap-1.5 ml-5 text-slate-600 font-medium">
                        <span className="text-[10px] bg-white text-teal-700 px-1.5 py-0.5 rounded border border-teal-200">今日の天気</span>
                        <span className="truncate">{forecast.weather}</span>
                    </div>
                )}

                {/* 週間天気予報 */}
                {weeklyForecast && weeklyForecast.length > 0 && (
                    <div className="ml-5 mt-1">
                        <WeeklyForecast forecasts={weeklyForecast} />
                    </div>
                )}
            </div>
        );
    }

    // Sort alerts by severity (emergency > warning > advisory)
    const sortedAlerts = [...alerts].sort((a, b) => {
        const severityScores = { emergency: 3, warning: 2, advisory: 1 };
        return severityScores[b.level] - severityScores[a.level];
    });

    const getColorsByLevel = (level: 'emergency' | 'warning' | 'advisory') => {
        switch (level) {
            case 'emergency':
                return 'bg-purple-600 text-white border-purple-800'; // Special Warning
            case 'warning':
                return 'bg-red-500 text-white border-red-700';       // Warning
            case 'advisory':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300'; // Advisory
        }
    };

    const getIconByLevel = (level: 'emergency' | 'warning' | 'advisory') => {
        switch (level) {
            case 'emergency': return <AlertOctagon size={18} />;
            case 'warning': return <AlertTriangle size={18} />;
            case 'advisory': return <Bell size={18} />;
        }
    };

    // Grab the highest severity alert to determine the banner color
    const highestLevel = sortedAlerts[0].level;
    const bannerClasses = getColorsByLevel(highestLevel);

    return (
        <div className={`py-3 px-4 shadow-md flex items-start gap-3 border-b ${bannerClasses}`}>
            <div className="mt-0.5">
                {getIconByLevel(highestLevel)}
            </div>
            <div className="flex-1">
                <div className="flex items-start justify-between mb-1.5">
                    <div>
                        <span className="text-xs font-bold opacity-90 block">{locationName}の気象情報</span>
                        {forecast && (
                            <span className="text-[11px] opacity-90 block mt-0.5">
                                天気: {forecast.weather}
                            </span>
                        )}
                    </div>
                    <button onClick={refetch} className="text-[10px] underline opacity-80 hover:opacity-100 flex-shrink-0">更新</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {sortedAlerts.map((alert) => (
                        <span
                            key={alert.code}
                            className={`text-sm font-bold px-2 py-0.5 rounded ${alert.level === 'emergency' ? 'bg-purple-800 text-white' :
                                alert.level === 'warning' ? 'bg-red-700 text-white' :
                                    'bg-yellow-200 text-yellow-900 border border-yellow-400'
                                }`}
                        >
                            {alert.label}
                        </span>
                    ))}
                </div>

                {/* 週間天気予報 */}
                {weeklyForecast && weeklyForecast.length > 0 && (
                    <WeeklyForecast forecasts={weeklyForecast} />
                )}
            </div>
        </div>
    );
}
