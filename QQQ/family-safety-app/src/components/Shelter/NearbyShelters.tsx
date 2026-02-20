"use client";

import { useEffect, useState } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useFamilyLocation } from "@/hooks/useFamilyLocation";
import { Shelter } from "@/types/shelter";
import { MapPin, Plus, Loader2 } from "lucide-react";

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

    const handleSearch = async (query: string) => { // Make async
        setIsLoading(true);
        setSearchStatus("検索中...");
        setNearbyPlaces([]); // Reset previous results

        // 1. Fetch from GSI (Official Data) - Execute in parallel with Google Maps search if possible, 
        // bur for now let's just trigger it.
        let gsiShelters: Omit<Shelter, 'id' | 'createdAt'>[] = [];
        if (currentLocation.latitude && currentLocation.longitude) {
            try {
                gsiShelters = await fetchGSIShelters(currentLocation.latitude, currentLocation.longitude);
                console.log("[Debug] GSI Shelters found:", gsiShelters.length);
            } catch (e) {
                console.error("[Debug] GSI fetch failed:", e);
            }
        }

        // If Google Maps API is not loaded, at least show GSI data
        if (!placesLib) {
            if (gsiShelters.length > 0) {
                // Convert GSI shelters to a format compatible with nearbyPlaces (google.maps.places.PlaceResult)
                // This is a bit tricky since PlaceResult has a specific structure. 
                // We might need to adjust how we display the list to handle both types, 
                // or wrap GSI data into a PlaceResult-like object.
                const mappedGSI = gsiShelters.map(s => ({
                    name: s.name,
                    vicinity: s.address,
                    geometry: {
                        location: new google.maps.LatLng(s.latitude!, s.longitude!)
                    },
                    place_id: `gsi-${s.name}`, // Fake ID
                    icon: "https://maps.google.com/mapfiles/kml/pal2/icon13.png", // Icon for official shelter
                    types: ["gsi_shelter"] // Custom type marker
                })) as unknown as google.maps.places.PlaceResult[];

                setNearbyPlaces(mappedGSI);
                setIsLoading(false);
                setSearchStatus(`国土地理院データ: ${gsiShelters.length}件が見つかりました`);
                return;
            }
            setIsLoading(false);
            setSearchStatus("Google Maps Placesライブラリが読み込まれていません。");
            return;
        }

        // 2. Google Maps Search
        const mapDiv = document.createElement('div');
        const service = new placesLib.PlacesService(mapDiv);

        // キーワードが含まれていない場合、避難所関連のキーワードを付加して検索精度を高める
        let searchQuery = query;
        const keywords = ["避難所", "避難場所", "学校", "公民館", "公園", "広域避難場所", "センター", "会館"];
        const hasKeyword = keywords.some(k => query.includes(k));

        if (!hasKeyword) {
            // 位置情報がない場合は、より広範囲にヒットしやすいキーワードにする
            if (!currentLocation.latitude) {
                searchQuery = query ? `${query} 避難所` : "避難所";
            } else {
                searchQuery = `${query} 避難所 OR 避難場所 OR 学校 OR 公民館 OR "指定緊急避難場所"`;
            }
        }

        const request: google.maps.places.TextSearchRequest = {
            query: searchQuery,
        };

        // Add location bias ONLY if available
        if (currentLocation.latitude && currentLocation.longitude) {
            request.location = new google.maps.LatLng(currentLocation.latitude, currentLocation.longitude);
            request.radius = 5000; // 半径を5kmに拡大
        }

        console.log("[Debug] request:", request);

        service.textSearch(request, (results, status) => {
            console.log("[Debug] status:", status);
            console.log("[Debug] results:", results?.length);

            setIsLoading(false);

            let combinedResults: google.maps.places.PlaceResult[] = [];

            // Convert GSI data to PlaceResult format
            const mappedGSI = gsiShelters.map(s => ({
                name: `【公認】${s.name}`, // Distinct name
                vicinity: s.address || "住所不明",
                geometry: {
                    location: new google.maps.LatLng(s.latitude!, s.longitude!)
                },
                place_id: `gsi-${s.name}-${s.latitude}-${s.longitude}`,
                rating: 5, // Fake high rating for official spots
                user_ratings_total: 0,
                icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png", // Distinct icon if displayed on map
                types: ["gsi_shelter"]
            })) as unknown as google.maps.places.PlaceResult[];

            combinedResults = [...mappedGSI];

            if (status === placesLib.PlacesServiceStatus.OK && results) {
                // Deduplicate: If GSI data exists, try to filter out Google duplicates based on name similarity or distance?
                // For now, simple merge. Maybe put GSI first.
                combinedResults = [...combinedResults, ...results];
            } else {
                console.warn("[Debug] Google Search failed or empty:", status);
            }

            // Sort everything by distance
            if (combinedResults.length > 0 && currentLocation.latitude && currentLocation.longitude) {
                try {
                    const userPos = new google.maps.LatLng(currentLocation.latitude, currentLocation.longitude);
                    combinedResults.sort((a, b) => {
                        if (!a.geometry?.location || !b.geometry?.location) return 0;
                        if (!google.maps.geometry) {
                            console.error("[Debug] google.maps.geometry is missing!");
                            return 0;
                        }
                        const distA = google.maps.geometry.spherical.computeDistanceBetween(userPos, a.geometry.location);
                        const distB = google.maps.geometry.spherical.computeDistanceBetween(userPos, b.geometry.location);
                        return distA - distB;
                    });
                } catch (e) {
                    console.error("[Debug] Sort error:", e);
                }
                setNearbyPlaces(combinedResults);
                setSearchStatus(`${combinedResults.length}件の候補が見つかりました（うち公認データ: ${mappedGSI.length}件）`);
            } else if (mappedGSI.length > 0) {
                setNearbyPlaces(mappedGSI);
                setSearchStatus(`国土地理院データ: ${mappedGSI.length}件が見つかりました`);
            } else {
                // ... Existing retry logic for mobile or empty results ...
                if (request.location && status !== placesLib.PlacesServiceStatus.OK && status !== placesLib.PlacesServiceStatus.ZERO_RESULTS) {
                    // Retry logic here if needed, but since we have GSI data now, maybe less critical?
                    // Let's keep the retry for "Google-only" failure if GSI was also empty.
                    setSearchStatus(`検索エラー: ${status}`);
                } else {
                    setSearchStatus("候補が見つかりませんでした");
                }
            }
        });
    };

    const handleManualSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // 空文字でも検索を許可する（現在地周辺の避難所を自動検索するため）
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
                        <div key={place.place_id} className="border border-slate-100 p-4 rounded-xl flex justify-between items-start bg-white shadow-sm hover:shadow-md hover:border-cyan-200 transition-all">
                            <div className="flex-1 min-w-0 mr-3">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-slate-800 text-sm truncate flex-1">{place.name}</h3>
                                    {distanceStr && (
                                        <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-1 rounded-full ml-2 whitespace-nowrap border border-cyan-100">
                                            {distanceStr}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 flex items-start break-words leading-relaxed">
                                    <MapPin className="w-3.5 h-3.5 mt-0.5 mr-1.5 shrink-0 text-slate-400" />
                                    <span className="line-clamp-2">{place.formatted_address}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => onAdd({
                                    name: place.name || "",
                                    address: place.formatted_address || "",
                                    note: `周辺検索から追加${distanceStr ? ` (距離: ${distanceStr})` : ""}`,
                                    latitude: place.geometry?.location?.lat(),
                                    longitude: place.geometry?.location?.lng(),
                                })}
                                className="p-2.5 bg-cyan-50 text-cyan-600 rounded-full hover:bg-cyan-100 hover:text-cyan-700 shrink-0 transition-colors mt-0.5"
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
    // ... (rest of the component) ...

    return (
        <APIProvider apiKey={API_KEY} libraries={LIBRARIES}>
            <NearbySheltersContent onAdd={onAdd} />
        </APIProvider>
    );
}
