import { useState, useEffect } from 'react';
import { useGeolocation } from 'react-use';

export interface UserLocation {
    id: string;
    name: string;
    lat: number;
    lng: number;
    updatedAt: number;
    status: 'safe' | 'danger' | 'unknown';
}

export function useFamilyLocation() {
    const currentLocation = useGeolocation({
        enableHighAccuracy: false, // GPSがないPC環境等ではfalseの方が取得しやすい場合がある
        timeout: 30000,           // 30秒でタイムアウトさせる
        maximumAge: 300000        // 5分以内のキャッシュがあれば使用する
    });
    const [familyLocations, setFamilyLocations] = useState<UserLocation[]>([]);

    // Mock data for now
    useEffect(() => {
        // In a real app, fetch from backend
        if (currentLocation.latitude && currentLocation.longitude) {
            // eslint-disable-next-line
            setFamilyLocations([
                {
                    id: 'self',
                    name: '自分',
                    lat: currentLocation.latitude,
                    lng: currentLocation.longitude,
                    updatedAt: Date.now(),
                    status: 'safe'
                },
                // Add mock family member
                {
                    id: 'family-1',
                    name: '母',
                    lat: (currentLocation.latitude || 0) + 0.001,
                    lng: (currentLocation.longitude || 0) + 0.001,
                    updatedAt: Date.now(),
                    status: 'unknown'
                }
            ]);
        }
    }, [currentLocation]);

    return {
        currentLocation,
        familyLocations
    };
}
