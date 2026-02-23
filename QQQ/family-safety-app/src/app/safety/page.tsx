"use client";

import { StatusForm } from "@/components/Safety/StatusForm";
import { DisasterAlertBanner } from "@/components/Safety/DisasterAlertBanner";
import { useFamilyLocation } from "@/hooks/useFamilyLocation";
import { CheckCircle, AlertTriangle, HelpCircle, MapPin, Loader2 } from "lucide-react";

function getRelativeTimeString(time: number): string {
    const deltaSeconds = Math.round((time - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat("ja", { numeric: "auto" });

    const absSeconds = Math.abs(deltaSeconds);
    if (absSeconds < 60) return rtf.format(deltaSeconds, 'second');
    if (absSeconds < 3600) return rtf.format(Math.round(deltaSeconds / 60), 'minute');
    if (absSeconds < 86400) return rtf.format(Math.round(deltaSeconds / 3600), 'hour');
    if (absSeconds < 86400 * 7) return rtf.format(Math.round(deltaSeconds / 86400), 'day');
    if (absSeconds < 86400 * 30) return rtf.format(Math.round(deltaSeconds / (86400 * 7)), 'week');
    if (absSeconds < 86400 * 365) return rtf.format(Math.round(deltaSeconds / (86400 * 30)), 'month');
    return rtf.format(Math.round(deltaSeconds / (86400 * 365)), 'year');
}

export default function SafetyPage() {
    const { familyLocations, loading } = useFamilyLocation();

    return (
        <div className="pb-24">
            {/* Realtime Disaster Alerts Banner */}
            <DisasterAlertBanner />

            <div className="p-4 max-w-md mx-auto">
                <h1 className="text-xl font-bold mb-4 text-slate-800">安否確認</h1>
                <p className="text-gray-600 mb-6 font-medium">
                    現在の状況を大切な人に共有しましょう。
                </p>

                <StatusForm />

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold mb-4 text-slate-800 border-b pb-2">メンバーのステータス</h2>

                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                        </div>
                    ) : familyLocations.length === 0 ? (
                        <div className="space-y-4">
                            <p className="text-gray-500 text-center py-4">
                                まだメンバーのステータス情報はありません。
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {familyLocations.map((member) => (
                                <div key={member.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-slate-800 text-base">{member.name}</h3>
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
                                            style={{
                                                backgroundColor: member.status === 'safe' ? '#f0fdf4' : member.status === 'danger' ? '#fef2f2' : '#fefce8',
                                                borderColor: member.status === 'safe' ? '#bbf7d0' : member.status === 'danger' ? '#fecaca' : '#fef08a',
                                                color: member.status === 'safe' ? '#15803d' : member.status === 'danger' ? '#b91c1c' : '#a16207'
                                            }}
                                        >
                                            {member.status === 'safe' && <CheckCircle className="w-3.5 h-3.5" />}
                                            {member.status === 'danger' && <AlertTriangle className="w-3.5 h-3.5" />}
                                            {member.status === 'unknown' && <HelpCircle className="w-3.5 h-3.5" />}
                                            <span>
                                                {member.status === 'safe' ? '無事' : member.status === 'danger' ? 'SOS' : '不明・移動中'}
                                            </span>
                                        </div>
                                    </div>

                                    {member.message && (
                                        <p className="text-sm text-slate-700 bg-slate-50 p-2.5 rounded-lg mb-3 border border-slate-100">
                                            {member.message}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span>
                                                {member.lat && member.lng ? '位置情報あり' : '位置情報なし'}
                                            </span>
                                        </div>
                                        <span>
                                            {getRelativeTimeString(member.updatedAt)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
