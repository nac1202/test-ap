"use client";

import { useEffect, useState } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useFamilyLocation } from "@/hooks/useFamilyLocation";
import { Shelter } from "@/types/shelter";
import { MapPin, Plus, Loader2, ShieldCheck } from "lucide-react";
import { fetchGSIShelters } from "@/services/gsiShelterService";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface NearbySheltersProps {
    onAdd: (shelter: Omit<Shelter, 'id' | 'createdAt'>) => void;
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km

    if (d < 1) {
        return `${Math.round(d * 1000)}m`;
    }
    return `${d.toFixed(1)}km`;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

function NearbySheltersContent({ onAdd }: NearbySheltersProps) {
    const placesLib = useMapsLibrary('places');
    const { currentLocation } = useFamilyLocation();
    const [nearbyPlaces, setNearbyPlaces] = useState<google.maps.places.PlaceResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchStatus, setSearchStatus] = useState<string>("");
    const [customQuery, setCustomQuery] = useState("");

    // Timeout handling for location loading
    const [locationTimeout, setLocationTimeout] = useState(false);

    // Auto-search when location becomes available (or fails)
    useEffect(() => {
        const hasLocation = currentLocation.latitude && currentLocation.longitude;
        const hasError = currentLocation.error || locationTimeout;

        if ((hasLocation || hasError) && !nearbyPlaces.length && !isLoading && placesLib) {
            handleSearch("");
        }
    }, [currentLocation, placesLib, locationTimeout]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (!currentLocation.latitude && !currentLocation.error && !locationTimeout) {
            timer = setTimeout(() => {
                setLocationTimeout(true);
            }, 5000); // Reduce timeout to 5 seconds for better UX
        }
        return () => clearTimeout(timer);
    }, [currentLocation, locationTimeout]);

    const handleSearch = async (query: string) => {
        setIsLoading(true);
        setSearchStatus("検索中...");
        setNearbyPlaces([]);

        let gsiShelters: Omit<Shelter, 'id' | 'createdAt'>[] = [];

        // 1. Fetch from GSI (Official Data)
        if (currentLocation.latitude && currentLocation.longitude) {
            try {
                gsiShelters = await fetchGSIShelters(currentLocation.latitude, currentLocation.longitude);
                console.log("[Debug] GSI Shelters found:", gsiShelters.length);
            } catch (e) {
                console.error("[Debug] GSI fetch failed:", e);
            }
        }

        // Prepare GSI results as PlaceResult
        const mappedGSI = gsiShelters.map(s => ({
            name: s.name,
            vicinity: s.address || "住所不明",
            geometry: {
                location: new google.maps.LatLng(s.latitude!, s.longitude!)
            },
            place_id: `gsi-${s.name}-${s.latitude}-${s.longitude}`,
            rating: 5,
            user_ratings_total: 0,
            icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            types: ["gsi_shelter"] // Mark as official
        })) as unknown as google.maps.places.PlaceResult[];

        // If Google Maps API is not loaded, show only GSI data
        if (!placesLib) {
            if (mappedGSI.length > 0) {
                setNearbyPlaces(mappedGSI);
                setIsLoading(false);
                setSearchStatus(`国土地理院データ: ${gsiShelters.length}件が見つかりました`);
            } else {
                setIsLoading(false);
                setSearchStatus("Google Maps Placesライブラリが読み込まれていません。");
            }
            return;
        }

        // 2. Google Maps Search
        const mapDiv = document.createElement('div');
        const service = new placesLib.PlacesService(mapDiv);

        let searchQuery = query;
        const keywords = ["避難所", "避難場所", "学校", "公民館", "公園", "広域避難場所", "センター", "会館"];
        const hasKeyword = keywords.some(k => query.includes(k));

        if (!hasKeyword) {
            if (!currentLocation.latitude) {
                searchQuery = query ? `${query} 避難所` : "避難所";
            } else {
                // Hybrid search query
                searchQuery = `${query} 避難所 OR 避難場所 OR 学校 OR 公民館 OR "指定緊急避難場所"`;
            }
        }

        const request: google.maps.places.TextSearchRequest = {
            query: searchQuery,
        };

        if (currentLocation.latitude && currentLocation.longitude) {
            request.location = new google.maps.LatLng(currentLocation.latitude, currentLocation.longitude);
            request.radius = 5000;
        }

        console.log("[Debug] request:", request);

        service.textSearch(request, (results, status) => {
            console.log("[Debug] status:", status);
            console.log("[Debug] results:", results?.length);

            setIsLoading(false);

            let combinedResults: google.maps.places.PlaceResult[] = [...mappedGSI];

            if (status === placesLib.PlacesServiceStatus.OK && results) {
                // Merge strategies:
                // We want to avoid duplicates. Simple name/distance dedupe?
                // For now, let's just append Google results that are NOT roughly in the same spot as GSI results.

                const gsiLocations = mappedGSI.map(g => ({
                    lat: g.geometry?.location?.lat() || 0,
                    lng: g.geometry?.location?.lng() || 0,
                    name: g.name
                }));

                const uniqueGoogleResults = results.filter(g => {
                    const gLat = g.geometry?.location?.lat() || 0;
                    const gLng = g.geometry?.location?.lng() || 0;

                    // Check if close to any GSI result (within ~50m)
                    const isDuplicate = gsiLocations.some(official => {
                        const d = Math.sqrt(Math.pow(official.lat - gLat, 2) + Math.pow(official.lng - gLng, 2));
                        return d < 0.0005; // Roughly 50m
                    });
                    return !isDuplicate;
                });

                combinedResults = [...combinedResults, ...uniqueGoogleResults];
            } else {
                console.warn("[Debug] Google Search failed or empty:", status);
            }

            // Sort by distance
            if (combinedResults.length > 0 && currentLocation.latitude && currentLocation.longitude) {
                try {
                    const userPos = new google.maps.LatLng(currentLocation.latitude, currentLocation.longitude);
                    combinedResults.sort((a, b) => {
                        if (!a.geometry?.location || !b.geometry?.location) return 0;
                        if (!google.maps.geometry) return 0; // Should be checked earlier
                        const distA = google.maps.geometry.spherical.computeDistanceBetween(userPos, a.geometry.location);
                        const distB = google.maps.geometry.spherical.computeDistanceBetween(userPos, b.geometry.location);
                        return distA - distB;
                    });
                } catch (e) {
                    console.error("[Debug] Sort error:", e);
                }
                setNearbyPlaces(combinedResults);
                const googleCount = combinedResults.length - mappedGSI.length;
                setSearchStatus(`${combinedResults.length}件が見つかりました (公認: ${mappedGSI.length}件, その他: ${googleCount}件)`);
            } else if (mappedGSI.length > 0) {
                setNearbyPlaces(mappedGSI);
                setSearchStatus(`国土地理院データ: ${mappedGSI.length}件が見つかりました`);
            } else {
                if (request.location && status !== placesLib.PlacesServiceStatus.OK && status !== placesLib.PlacesServiceStatus.ZERO_RESULTS) {
                    setSearchStatus(`検索エラー: ${status}`);
                } else {
                    setSearchStatus("候補が見つかりませんでした");
                }
            }
        });
    };

    const handleManualSearch = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearch(customQuery);
    };

    return (
        <div className="space-y-4">
            {/* Search Input Area */}
            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-cyan-100 shadow-sm">
                <form onSubmit={handleManualSearch} className="flex gap-2">
                    <input
                        type="text"
                        value={customQuery}
                        onChange={(e) => setCustomQuery(e.target.value)}
                        placeholder="地名や施設名で検索 (例: 新宿区 避難所)"
                        className="flex-1 p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all placeholder:text-slate-400"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !placesLib}
                        className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm transition-colors"
                    >
                        検索
                    </button>
                </form>
                {!currentLocation.latitude && !currentLocation.error && !locationTimeout && (
                    <p className="text-xs text-cyan-600 mt-2 flex items-center font-medium">
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        現在地を取得中... (手動検索も可能です)
                    </p>
                )}
                {!currentLocation.latitude && !currentLocation.error && locationTimeout && (
                    <p className="text-xs text-slate-500 mt-2">
                        位置情報を取得できませんでした (距離を表示するには位置情報が必要です)
                    </p>
                )}
                {currentLocation.error && (
                    <p className="text-xs text-red-500 mt-2">
                        位置情報を取得できませんでした: {currentLocation.error.message || "ブラウザの設定を確認してください"}
                    </p>
                )}
            </div>

            <p className="text-sm text-slate-600 text-center min-h-[20px] font-medium">{searchStatus}</p>

            {isLoading && (
                <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                </div>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 safe-scrollbar">
                {nearbyPlaces.map((place) => {
                    const isOfficial = place.types?.includes("gsi_shelter");
                    let distanceStr = "";
                    if (currentLocation.latitude && currentLocation.longitude && place.geometry?.location) {
                        distanceStr = calculateDistance(
                            currentLocation.latitude,
                            currentLocation.longitude,
                            place.geometry.location.lat(),
                            place.geometry.location.lng()
                        );
                    }

                    return (
                        <div key={place.place_id} className={`border p-4 rounded-xl flex justify-between items-start shadow-sm hover:shadow-md transition-all ${isOfficial ? "bg-cyan-50/50 border-cyan-200" : "bg-white border-slate-100 hover:border-cyan-100"}`}>
                            <div className="flex-1 min-w-0 mr-3">
                                <div className="flex flex-wrap gap-2 items-center mb-1">
                                    {isOfficial && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-600 text-white shadow-sm shrink-0">
                                            <ShieldCheck className="w-3 h-3 mr-0.5" />
                                            指定避難所
                                        </span>
                                    )}
                                    <h3 className="font-bold text-slate-800 text-sm truncate flex-1">{place.name}</h3>
                                </div>
                                <div className="flex justify-between items-center mb-1">
                                    {distanceStr && (
                                        <span className="text-[10px] font-bold text-cyan-700 bg-cyan-100/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                                            {distanceStr}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 flex items-start break-words leading-relaxed">
                                    <MapPin className="w-3.5 h-3.5 mt-0.5 mr-1.5 shrink-0 text-slate-400" />
                                    <span className="line-clamp-2">{place.formatted_address || place.vicinity}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => onAdd({
                                    name: place.name || "",
                                    address: place.formatted_address || place.vicinity || "",
                                    note: isOfficial ? "【国土地理院公認】指定緊急避難場所/避難所" : `周辺検索から追加${distanceStr ? ` (距離: ${distanceStr})` : ""}`,
                                    latitude: place.geometry?.location?.lat(),
                                    longitude: place.geometry?.location?.lng(),
                                })}
                                className={`p-2.5 rounded-full shrink-0 transition-colors mt-0.5 ${isOfficial ? "bg-cyan-600 text-white hover:bg-cyan-700 shadow-sm" : "bg-cyan-50 text-cyan-600 hover:bg-cyan-100"}`}
                                title="リストに追加"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const LIBRARIES: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ['places', 'geometry'];

export function NearbyShelters({ onAdd }: NearbySheltersProps) {
    return (
        <APIProvider apiKey={API_KEY} libraries={LIBRARIES}>
            <NearbySheltersContent onAdd={onAdd} />
        </APIProvider>
    );
}
