"use client";

import { useEffect, useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { useFamilyLocation } from "@/hooks/useFamilyLocation";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export function LocationMap() {
    const { currentLocation, familyLocations } = useFamilyLocation();
    const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);

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
        <div className="h-[70vh] w-full rounded-xl overflow-hidden shadow-lg border border-slate-200">
            <APIProvider apiKey={API_KEY}>
                <Map
                    defaultCenter={center}
                    defaultZoom={15}
                    mapId="DEMO_MAP_ID" // Required for AdvancedMarker
                    className="w-full h-full"
                >
                    {familyLocations.map((user) => (
                        <AdvancedMarker key={user.id} position={{ lat: user.lat, lng: user.lng }}>
                            <Pin
                                background={user.id === 'self' ? '#0891b2' : '#EF4444'}
                                borderColor={'#FFFFFF'}
                                glyphColor={'#FFFFFF'}
                            />
                        </AdvancedMarker>
                    ))}
                </Map>
            </APIProvider>
        </div>
    );
}
