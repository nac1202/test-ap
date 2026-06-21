"use client";

import { useState, useEffect } from "react";
import { useDisasterAlerts } from "@/hooks/useDisasterAlerts";
import { AlertTriangle, Info, Bell, AlertOctagon, Thermometer, Droplets, Wind, ChevronDown, ChevronUp } from "lucide-react";
import { WeeklyForecast } from "./WeeklyForecast";
import { HourlyForecast } from "./HourlyForecast";

export function DisasterAlertBanner() {
    const { alerts, forecast, weeklyForecast, locationName, loading, error, refetch } = useDisasterAlerts();
    const [isExpanded, setIsExpanded] = useState(false);

    // 災害アラート（注意報以上）がある場合は自動的に展開して注意を促す
    useEffect(() => {
        if (alerts.length > 0) {
            setIsExpanded(true);
        }
    }, [alerts]);

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

    const toggleExpand = () => setIsExpanded(!isExpanded);

    if (alerts.length === 0) {
        return (
            <div className="bg-teal-50 text-teal-800 text-xs py-2 px-4 shadow flex flex-col gap-1 border-b border-teal-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Info size={14} className="text-teal-600 flex-shrink-0" />
                        <span className="leading-tight font-medium">
                            {locationName}
                        </span>
                        <span className="text-[10px] text-teal-600/80">警報・注意報なし</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={refetch} className="text-[10px] underline text-teal-600">更新</button>
                        {forecast && (
                            <button onClick={toggleExpand} className="flex items-center gap-1 text-teal-700 bg-teal-100/50 hover:bg-teal-100 px-2 py-0.5 rounded-full transition-colors">
                                {isExpanded ? '閉じる' : '天気詳細'}
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* 天気概要（折りたたみ時も常に表示） */}
                {forecast && (
                    <div className="ml-5 flex items-center gap-3 mt-0.5 mb-1">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] bg-teal-600 text-white px-1.5 py-0.5 rounded shadow-sm leading-none">今日</span>
                            <span className="text-xs font-bold text-slate-700 truncate">{forecast.weather}</span>
                        </div>
                        {(forecast.currentTemp !== undefined || forecast.pop || forecast.humidity !== undefined) && (
                            <div className="flex items-center gap-2 text-[10px] text-slate-600 font-medium">
                                {forecast.currentTemp !== undefined && (
                                    <span className="flex items-center gap-0.5"><Thermometer size={12} className="text-red-500" />{forecast.currentTemp}℃</span>
                                )}
                                {forecast.pop !== undefined && forecast.pop !== "" && forecast.pop !== "0" && (
                                    <span className="flex items-center gap-0.5"><Droplets size={12} className="text-blue-500" />{forecast.pop}%</span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 詳細エリア（1時間ごと・週間） */}
                {isExpanded && forecast && (
                    <div className="mt-1 bg-white/70 rounded-lg p-2.5 shadow-sm border border-teal-100 flex flex-col gap-1.5 animate-in slide-in-from-top-2 fade-in duration-200">
                        {forecast.hourly && forecast.hourly.length > 0 && (
                            <div>
                                <HourlyForecast forecasts={forecast.hourly} />
                            </div>
                        )}
                        {weeklyForecast && weeklyForecast.length > 0 && (
                            <WeeklyForecast forecasts={weeklyForecast} />
                        )}
                    </div>
                )}
            </div>
        );
    }

    // --- Alert active mode ---
    // Sort alerts by severity (emergency > warning > advisory)
    const sortedAlerts = [...alerts].sort((a, b) => {
        const severityScores = { emergency: 3, warning: 2, advisory: 1 };
        return severityScores[b.level] - severityScores[a.level];
    });

    const getColorsByLevel = (level: 'emergency' | 'warning' | 'advisory') => {
        switch (level) {
            case 'emergency': return 'bg-purple-600 text-white border-purple-800'; // Special Warning
            case 'warning': return 'bg-red-500 text-white border-red-700';       // Warning
            case 'advisory': return 'bg-yellow-100 text-yellow-800 border-yellow-300'; // Advisory
        }
    };

    const getIconByLevel = (level: 'emergency' | 'warning' | 'advisory') => {
        switch (level) {
            case 'emergency': return <AlertOctagon size={16} />;
            case 'warning': return <AlertTriangle size={16} />;
            case 'advisory': return <Bell size={16} />;
        }
    };

    const highestLevel = sortedAlerts[0].level;
    const bannerClasses = getColorsByLevel(highestLevel);
    const textClasses = highestLevel === 'advisory' ? 'text-yellow-900' : 'text-white';
    const buttonBgClasses = highestLevel === 'advisory' ? 'bg-yellow-200/50 hover:bg-yellow-200 text-yellow-900' : 'bg-black/20 hover:bg-black/30 text-white';

    return (
        <div className={`py-2 px-4 shadow-md flex flex-col gap-2 border-b transition-all duration-300 ${bannerClasses}`}>
            {/* Header row: Location and toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {getIconByLevel(highestLevel)}
                    <span className="text-xs font-bold leading-none">{locationName}</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={refetch} className="text-[10px] underline opacity-80 hover:opacity-100">更新</button>
                    {forecast && (
                        <button onClick={toggleExpand} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-colors ${buttonBgClasses}`}>
                            {isExpanded ? '閉じる' : '天気詳細'}
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Alerts Badges */}
            <div className="flex flex-wrap gap-1">
                {sortedAlerts.map((alert) => (
                    <span
                        key={alert.code}
                        className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${alert.level === 'emergency' ? 'bg-purple-800 text-white' :
                            alert.level === 'warning' ? 'bg-red-700 text-white' :
                                'bg-yellow-200 text-yellow-900 border border-yellow-400'
                            }`}
                    >
                        {alert.label}
                    </span>
                ))}
            </div>

            {/* Weather summary row */}
            {forecast && (
                <div className={`flex items-center gap-3 text-[10px] font-medium opacity-90 ${textClasses}`}>
                    <span className="font-bold">{forecast.weather}</span>
                    {forecast.currentTemp !== undefined && (
                        <span className="flex items-center gap-0.5">
                            <Thermometer size={12} /> {forecast.currentTemp}℃
                        </span>
                    )}
                    {forecast.pop !== undefined && forecast.pop !== "" && forecast.pop !== "0" && (
                        <span className="flex items-center gap-0.5">
                            <Droplets size={12} /> {forecast.pop}%
                        </span>
                    )}
                </div>
            )}

            {/* Detailed Expanded Area */}
            {isExpanded && forecast && (
                <div className="mt-1 pt-2 border-t border-black/10 flex flex-col gap-1.5 animate-in slide-in-from-top-2 fade-in duration-200">
                    {forecast.hourly && forecast.hourly.length > 0 && (
                        <div className="max-w-[calc(100vw-2rem)]">
                            <HourlyForecast forecasts={forecast.hourly} />
                        </div>
                    )}
                    {weeklyForecast && weeklyForecast.length > 0 && (
                        <div className="max-w-[calc(100vw-2rem)]">
                            <WeeklyForecast forecasts={weeklyForecast} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
