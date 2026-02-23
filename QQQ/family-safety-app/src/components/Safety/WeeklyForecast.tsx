import { DailyForecast } from "@/hooks/useDisasterAlerts";
import { Sun, Cloud, CloudRain, Snowflake, CloudLightning, HelpCircle } from "lucide-react";

interface WeeklyForecastProps {
    forecasts: DailyForecast[];
}

// Map JMA weather codes to rich, layered Lucide icons
export function getWeatherIcon(code: string, size: number = 20) {
    if (!code) return <HelpCircle size={size} className="text-slate-300" />;

    const wrapperStyle = { width: size + 8, height: size + 8 };

    // JMA codes: 100s = Sunny, 200s = Cloudy, 300s = Rain, 400s = Snow
    if (code.startsWith('1')) {
        return (
            <div className="relative flex items-center justify-center" style={wrapperStyle}>
                <div className="absolute inset-0 bg-yellow-400/40 blur-[6px] rounded-full animate-pulse scale-75"></div>
                <Sun size={size} className="text-orange-500 relative z-10 drop-shadow-[0_2px_3px_rgba(249,115,22,0.4)]" fill="#FEF08A" strokeWidth={1.5} />
            </div>
        );
    } else if (code.startsWith('2')) {
        return (
            <div className="relative flex items-center justify-center" style={wrapperStyle}>
                <Cloud size={size} className="text-slate-400 relative z-20 drop-shadow-[0_2px_3px_rgba(148,163,184,0.4)]" fill="#F8FAFC" strokeWidth={1.5} />
                <Cloud size={size * 0.7} className="text-slate-300 absolute top-0 -right-1 z-10 opacity-80" fill="#E2E8F0" strokeWidth={1.5} />
            </div>
        );
    } else if (code.startsWith('3')) {
        // Some 300 codes indicate thunderstorms
        if (code === '308' || code === '315' || code === '316' || code === '317' || code === '322' || code === '323' || code === '324' || code === '325') {
            return (
                <div className="relative flex items-center justify-center" style={wrapperStyle}>
                    <div className="absolute inset-0 bg-yellow-400/30 blur-[6px] rounded-full scale-75"></div>
                    <CloudLightning size={size} className="text-indigo-500 relative z-20 drop-shadow-[0_2px_3px_rgba(99,102,241,0.4)]" fill="#E0E7FF" strokeWidth={1.5} />
                </div>
            );
        }
        return (
            <div className="relative flex items-center justify-center" style={wrapperStyle}>
                <CloudRain size={size} className="text-blue-500 relative z-20 drop-shadow-[0_2px_3px_rgba(59,130,246,0.4)]" fill="#DBEAFE" strokeWidth={1.5} />
            </div>
        );
    } else if (code.startsWith('4')) {
        return (
            <div className="relative flex items-center justify-center" style={wrapperStyle}>
                <div className="absolute inset-0 bg-cyan-200/40 blur-[6px] rounded-full scale-75 animate-pulse"></div>
                <Snowflake size={size} className="text-cyan-400 relative z-10 drop-shadow-[0_2px_3px_rgba(34,211,238,0.4)]" strokeWidth={2} />
            </div>
        );
    }

    // Fallback for unknown codes
    return (
        <div className="relative flex items-center justify-center" style={wrapperStyle}>
            <Sun size={size} className="text-slate-300" />
        </div>
    );
}

export function WeeklyForecast({ forecasts }: WeeklyForecastProps) {
    if (!forecasts || forecasts.length === 0) return null;

    return (
        <div className="mt-3 pt-3 border-t border-slate-200/60 overflow-x-auto overflow-y-hidden pb-1 -mx-2 px-2 scrollbar-hide">
            <div className="flex gap-2 min-w-max">
                {forecasts.map((day, idx) => {
                    // For temperatures, handle empty strings or dashes
                    const hasMin = day.minTemp && day.minTemp !== "-";
                    const hasMax = day.maxTemp && day.maxTemp !== "-";

                    return (
                        <div
                            key={idx}
                            className="flex flex-col items-center justify-between bg-white/60 rounded-lg p-2 min-w-[3.5rem] md:min-w-[4rem] shadow-sm border border-slate-100/50"
                        >
                            <span className="text-[10px] font-bold text-slate-600 mb-1">
                                {idx === 0 ? "今日" : day.date}
                            </span>

                            <div className="my-1">
                                {getWeatherIcon(day.weatherCode, 22)}
                            </div>

                            <div className="flex gap-1.5 mt-1 text-[10px] sm:text-xs">
                                <span className="text-red-500 font-bold">{hasMax ? `${day.maxTemp}°` : '-'}</span>
                                <span className="text-blue-500 font-bold">{hasMin ? `${day.minTemp}°` : '-'}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
