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

    // Auto-search when location becomes available for the first time


    // Timeout handling for location loading
    const [locationTimeout, setLocationTimeout] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (!currentLocation.latitude && !currentLocation.error && !locationTimeout) {
            timer = setTimeout(() => {
                setLocationTimeout(true);
            }, 10000); // 10 seconds timeout for UI feedback
        }
        return () => clearTimeout(timer);
    }, [currentLocation, locationTimeout]);

    const handleSearch = (query: string) => {
        console.log("handleSearch called with:", query); // Debug
        if (!placesLib) {
            console.error("placesLib is not loaded!"); // Debug
            return;
        }

        setIsLoading(true);
        setSearchStatus("検索中...");

        const mapDiv = document.createElement('div');
        const service = new placesLib.PlacesService(mapDiv);

        // キーワードが含まれていない場合、避難所関連のキーワードを付加して検索精度を高める
        let searchQuery = query;
        const keywords = ["避難所", "学校", "公民館", "公園", "広域避難場所", "センター", "会館"];
        const hasKeyword = keywords.some(k => query.includes(k));

        if (!hasKeyword) {
            searchQuery = `${query} 避難所 学校 公民館`;
        }

        const request: google.maps.places.TextSearchRequest = {
            query: searchQuery,
        };

        // Add location bias if available
        if (currentLocation.latitude && currentLocation.longitude) {
            request.location = new google.maps.LatLng(currentLocation.latitude, currentLocation.longitude);
            request.radius = 3000;
        }

        console.log("Sending TextSearch request:", request); // Debug

        service.textSearch(request, (results, status) => {
            console.log("TextSearch response status:", status); // Debug
            console.log("TextSearch results:", results); // Debug

            setIsLoading(false);
            if (status === placesLib.PlacesServiceStatus.OK && results) {
                // Sort by distance if current location is available
                if (currentLocation.latitude && currentLocation.longitude) {
                    const sortedResults = [...results].sort((a, b) => {
                        // Ensure geometry and location exist before computing distance
                        if (!a.geometry?.location || !b.geometry?.location) return 0;

                        const distA = google.maps.geometry.spherical.computeDistanceBetween(
                            new google.maps.LatLng(currentLocation.latitude!, currentLocation.longitude!),
                            a.geometry!.location!
                        );
                        const distB = google.maps.geometry.spherical.computeDistanceBetween(
                            new google.maps.LatLng(currentLocation.latitude!, currentLocation.longitude!),
                            b.geometry!.location!
                        );
                        return distA - distB;
                    });
                    setNearbyPlaces(sortedResults);
                } else {
                    setNearbyPlaces(results);
                }
                setSearchStatus(`${results.length}件の候補が見つかりました`);
            } else {
                console.error("TextSearch failed:", status); // Debug
                if (query !== searchQuery) {
                    // もしキーワード付加で失敗した場合、元のクエリで再検索（念のため）
                    const originalRequest: google.maps.places.TextSearchRequest = { query: query };
                    if (currentLocation.latitude && currentLocation.longitude) {
                        originalRequest.location = new google.maps.LatLng(currentLocation.latitude, currentLocation.longitude);
                        originalRequest.radius = 3000;
                    }
                    service.textSearch(originalRequest, (retryResults, retryStatus) => {
                        console.log("Retry TextSearch status:", retryStatus); // Debug
                        if (retryStatus === placesLib.PlacesServiceStatus.OK && retryResults) {
                            setNearbyPlaces(retryResults);
                            setSearchStatus(`${retryResults.length}件の候補が見つかりました`);
                        } else {
                            setSearchStatus("候補が見つかりませんでした");
                        }
                    });
                } else {
                    setSearchStatus("候補が見つかりませんでした");
                }
            }
        });
    };

    const handleManualSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (customQuery.trim()) {
            handleSearch(customQuery);
        }
    };

    return (
        <div className="space-y-4">
            {/* Search Input Area */}
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

const LIBRARIES: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ['places'];

export function NearbyShelters({ onAdd }: NearbySheltersProps) {
    // ... (rest of the component) ...

    return (
        <APIProvider apiKey={API_KEY} libraries={LIBRARIES}>
            <NearbySheltersContent onAdd={onAdd} />
        </APIProvider>
    );
}
