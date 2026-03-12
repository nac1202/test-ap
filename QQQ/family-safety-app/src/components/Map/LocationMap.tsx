"use client";

import { useEffect, useState, useMemo } from "react";
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useFamilyLocation } from "@/hooks/useFamilyLocation";
import { useAuth } from "@/components/Auth/AuthProvider";
import { calculateDistance } from "@/utils/geoCalculations";
import { Users, Navigation, User as UserIcon } from "lucide-react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Simple hash function to generate consistent distinct colors for members
function getMemberColor(id: string): string {
    const defaultColors = ['#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#f97316', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % defaultColors.length;
    return defaultColors[index];
}

// Helper to determine status styling for the selected pin
function getStatusStyle(status: string) {
    switch (status) {
        case 'safe':
            return { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700', label: '無事' };
        case 'danger':
            return { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700', label: 'SOS' };
        case 'transit':
            return { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-300 dark:border-yellow-700', label: '移動中' };
        case 'unknown':
        default:
            return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-400', border: 'border-slate-300 dark:border-slate-600', label: '未申告' };
    }
}

function MapBoundsController({ targetId, locations, userId }: { targetId: string, locations: any[], userId?: string }) {
    const map = useMap();
    const coreLib = useMapsLibrary('core');

    useEffect(() => {
        if (!map || !coreLib) return;

        const bounds = new coreLib.LatLngBounds();
        let hasPoints = false;

        const userLoc = locations.find(m => m.id === userId);

        if (targetId === 'all') {
            // Fit all people
            locations.forEach(loc => {
                if (loc.lat !== 0 && loc.lng !== 0) {
                    bounds.extend({ lat: loc.lat, lng: loc.lng });
                    hasPoints = true;
                }
            });
        } else {
            // Fit only user and target
            const targetLoc = locations.find(m => m.id === targetId);
            if (userLoc && userLoc.lat !== 0 && userLoc.lng !== 0) {
                bounds.extend({ lat: userLoc.lat, lng: userLoc.lng });
                hasPoints = true;
            }
            if (targetLoc && targetLoc.lat !== 0 && targetLoc.lng !== 0) {
                bounds.extend({ lat: targetLoc.lat, lng: targetLoc.lng });
                hasPoints = true;
            }
        }

        if (hasPoints) {
            // Depending on the @types/google.maps version, the second argument can be a number or a Padding object.
            // Using a full Padding object to be safe from strict typing errors.
            map.fitBounds(bounds, { top: 80, bottom: 80, left: 80, right: 80 });
        }
    }, [map, coreLib, targetId, locations, userId]);

    return null;
}

export function LocationMap() {
    const { user } = useAuth();
    const { currentLocation, familyLocations } = useFamilyLocation();
    let displayLocations = [...familyLocations];

    const currentUserId = user?.id || 'current-user-fallback';

    // FORCE: Unconditionally ensure the current user is in displayLocations
    if (!displayLocations.find(m => m.id === currentUserId)) {
        displayLocations.push({
            id: currentUserId,
            name: 'あなた',
            lat: currentLocation.latitude || 35.6812,
            lng: currentLocation.longitude || 139.7671,
            updatedAt: Date.now(),
            status: 'safe',
            message: '未更新'
        });
    }

    // FORCE: If there are NO other members, inject the mock members for map testing
    const otherMembers = displayLocations.filter(m => m.id !== currentUserId);
    if (otherMembers.length === 0) {
        // Ensure the dummies aren't already there
        if (!displayLocations.find(m => m.id === 'mock-family-uuid-1')) {

            displayLocations.push({
                id: 'mock-family-uuid-1',
                name: 'テストメンバーA',
                lat: (currentLocation.latitude || 35.6812) + 0.002,
                lng: (currentLocation.longitude || 139.7671) + 0.002,
                updatedAt: Date.now() - 3600000,
                status: 'safe',
                message: 'テスト配置です'
            });
            displayLocations.push({
                id: 'mock-family-uuid-2',
                name: 'テストメンバーB',
                lat: (currentLocation.latitude || 35.6812) - 0.003,
                lng: (currentLocation.longitude || 139.7671) + 0.001,
                updatedAt: Date.now() - 7200000,
                status: 'safe',
                message: '別方向のテスト'
            });
        }
    }

    const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
    const [targetId, setTargetId] = useState<string>('all');

    const targetMember = displayLocations.find(m => m.id === targetId);

    const distanceToTarget = useMemo(() => {
        if (!currentLocation.latitude || !currentLocation.longitude || !targetMember || targetId === 'all') return null;
        if (targetMember.lat === 0 && targetMember.lng === 0) return null;

        return calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            targetMember.lat,
            targetMember.lng
        );
    }, [currentLocation, targetMember, targetId]);

    useEffect(() => {
        if (currentLocation.latitude && currentLocation.longitude && !center) {
            setCenter({ lat: currentLocation.latitude, lng: currentLocation.longitude });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentLocation]);

    if (!API_KEY) {
        return (
            <div className="flex items-center justify-center h-[50vh] bg-slate-50 rounded-lg">
                <div className="text-center p-4">
                    <p className="font-bold text-slate-700">Google Maps APIキーが設定されていません</p>
                    <p className="text-sm text-slate-500 mt-2">.env.localファイルにNEXT_PUBLIC_GOOGLE_MAPS_API_KEYを設定してください。</p>
                    {currentLocation.latitude && (
                        <p className="mt-4 text-xs font-mono">
                            現在地: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude?.toFixed(4)}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (!center) {
        return <div className="h-[50vh] bg-slate-50 flex items-center justify-center text-slate-500">位置情報を取得中...</div>;
    }

    return (
        <div className="h-[70vh] w-full rounded-xl overflow-hidden shadow-lg border border-slate-200 relative">
            <APIProvider apiKey={API_KEY}>

                {/* Floating UI Panel */}
                <div className="absolute bottom-6 left-4 right-4 z-10 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-[0_-8px_30px_rgb(0,0,0,0.12)] border border-slate-100/50 opacity-60 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center gap-2 mb-3 text-slate-700">
                        <Users size={18} className="text-teal-600" />
                        <h3 className="font-bold text-sm">表示ターゲット</h3>
                    </div>

                    <div className="relative">
                        <select
                            value={targetId}
                            onChange={(e) => setTargetId(e.target.value)}
                            className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                        >
                            <option value="all">全員を表示</option>
                            {displayLocations.filter(m => m.id !== currentUserId).map((member) => (
                                <option key={member.id} value={member.id}>
                                    {member.name}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>

                    {targetId !== 'all' && distanceToTarget !== null && (
                        <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                            <div className="text-[10px] text-slate-500 font-bold tracking-wider">直線距離</div>
                            <div className="flex items-center gap-1.5 text-teal-600 font-mono font-bold text-lg">
                                <Navigation size={14} className="opacity-70" />
                                {distanceToTarget > 1000
                                    ? <>{(distanceToTarget / 1000).toFixed(2)} <span className="text-xs">km</span></>
                                    : <>{Math.round(distanceToTarget)} <span className="text-xs">m</span></>}
                            </div>
                        </div>
                    )}
                </div>

                <Map
                    defaultCenter={center}
                    defaultZoom={15}
                    mapId="DEMO_MAP_ID" // Required for AdvancedMarker
                    className="w-full h-full"
                >
                    {displayLocations.map((member) => {
                        const isMe = member.id === currentUserId;
                        const isSelected = targetId === member.id;
                        // Keep 'isMe' on top (100). If 'isSelected', boost other members above non-selected ones (50 vs 10)
                        const zIndex = isMe ? (isSelected ? 150 : 100) : (isSelected ? 50 : 10);

                        // FORCE test members to be safe just in case they are coming from DB empty
                        const effectiveStatus = member.id.includes('mock-') ? 'safe' : (member.status || 'unknown');
                        const statusStyle = getStatusStyle(effectiveStatus);

                        return (
                            <AdvancedMarker key={member.id} position={{ lat: member.lat, lng: member.lng }} zIndex={zIndex}>
                                <div className={`flex flex-col items-center group relative transition-transform duration-300`}>
                                    <div className={`bg-white px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 mb-1 transform transition-transform shadow-[0_2px_10px_rgba(0,0,0,0.15)] flex items-center gap-1.5 border ${isMe ? 'border-blue-500' : (isSelected ? 'border-amber-500 scale-110' : 'border-transparent')} max-w-[200px]`}>
                                        {isMe && <UserIcon size={12} className="text-blue-500 flex-shrink-0" />}
                                        <div className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} shadow-sm font-black tracking-wide whitespace-nowrap`}>
                                            {statusStyle.label}
                                        </div>
                                        <span className="whitespace-nowrap truncate">{isMe ? 'あなた' : member.name}</span>
                                    </div>

                                    {/* Focus Ring for Selected Target: moved to bottom of pin */}
                                    {isSelected && !isMe && (
                                        <div className="absolute top-10 w-16 h-16 bg-amber-500 rounded-full animate-ping opacity-60 -z-10 pointer-events-none blur-[1px]"></div>
                                    )}

                                    {isMe ? (
                                        // Custom GPS-style blue beacon for the current user
                                        <div className="relative flex items-center justify-center w-8 h-8 mt-1 z-20">
                                            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-60"></div>
                                            <div className="absolute inset-1 bg-blue-400 rounded-full opacity-40"></div>
                                            <div className="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg z-10"></div>
                                        </div>
                                    ) : (
                                        // Custom HTML pin for other members (ensures it ALWAYS renders)
                                        <div className="relative flex flex-col items-center mt-1 z-20 transition-transform duration-300 transform origin-bottom hover:scale-110">
                                            {/* Avatar / Circle */}
                                            <div
                                                className={`w-9 h-9 flex items-center justify-center rounded-full shadow-md relative z-10 border-[3px] ${isSelected ? 'border-amber-400 w-10 h-10 shadow-amber-500/50' : 'border-white'}`}
                                                style={{ backgroundColor: getMemberColor(member.id), transition: 'all 0.3s ease' }}
                                            >
                                                <UserIcon size={18} className="text-white relative z-20" strokeWidth={2.5} />
                                            </div>
                                            {/* Pointer triangle */}
                                            <div
                                                className={`w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent -mt-[3px] relative z-0 ${isSelected ? 'border-t-amber-400' : 'border-t-white'}`}
                                                style={{ transition: 'all 0.3s ease' }}
                                            ></div>

                                            {/* Static shadow under the pin */}
                                            <div className="w-4 h-1 bg-black/30 rounded-[100%] blur-[2px] mt-0.5"></div>
                                        </div>
                                    )}
                                </div>
                            </AdvancedMarker>
                        );
                    })}
                    {/* Controller to handle bounds changes based on target selection */}
                    <MapBoundsController targetId={targetId} locations={displayLocations} userId={currentUserId} />
                </Map>
            </APIProvider>
        </div>
    );
}
