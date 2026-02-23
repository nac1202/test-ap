
import { Shelter } from "@/types/shelter";

// GSI Tile Base URL
const BASE_URL = "https://cyberjapandata.gsi.go.jp/xyz";

// Layer IDs for different disaster types
const LAYERS = {
    FLOOD: "skhb01",       // 洪水 (disaster1)
    LANDSLIDE: "skhb02",   // 崖崩れ、土石流及び地滑り (disaster2)
    STORM_SURGE: "skhb03", // 高潮 (disaster3)
    EARTHQUAKE: "skhb04",  // 地震 (disaster4)
    TSUNAMI: "skhb05",     // 津波 (disaster5)
    FIRE: "skhb06",        // 大規模な火事 (disaster6)
    INLAND_FLOOD: "skhb07",// 内水氾濫 (disaster7)
    VOLCANO: "skhb08",     // 火山現象 (disaster8)
} as const;

// Zoom level for fetching tiles (Z=10 is the level provided by GSI for skhb)
const ZOOM_LEVEL = 10;

interface GSIFeature {
    type: "Feature";
    properties: {
        name: string;
        address: string;
        [key: string]: unknown;
    };
    geometry: {
        type: "Point";
        coordinates: [number, number]; // [lon, lat]
    };
}

interface GSIGeoJSON {
    type: "FeatureCollection";
    features: GSIFeature[];
}

/**
 * Haversine distance in km
 */
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Parse GSI disaster flags from feature properties
 */
function parseDisasterFlags(properties: any): string[] {
    const disasters: string[] = [];
    if (properties.disaster1 === 1 || properties.disaster1 === '1') disasters.push('flood');
    if (properties.disaster2 === 1 || properties.disaster2 === '1') disasters.push('landslide');
    if (properties.disaster3 === 1 || properties.disaster3 === '1') disasters.push('storm_surge');
    if (properties.disaster4 === 1 || properties.disaster4 === '1') disasters.push('earthquake');
    if (properties.disaster5 === 1 || properties.disaster5 === '1') disasters.push('tsunami');
    if (properties.disaster6 === 1 || properties.disaster6 === '1') disasters.push('fire');
    if (properties.disaster7 === 1 || properties.disaster7 === '1') disasters.push('inland_flood');
    if (properties.disaster8 === 1 || properties.disaster8 === '1') disasters.push('volcano');
    return disasters;
}

/**
 * Infer if a shelter is indoor or outdoor based on common facility names in Japan
 */
function determineFacilityType(name: string): 'indoor' | 'outdoor' {
    const outdoorKeywords = ['公園', '広場', '緑地', '河川敷', '運動場', 'グラウンド', '空き地', '駐車場', '遊園地', 'キャンプ場', 'ゴルフ場', '陸上競技場', '堤防', '野球場', '海岸', '砂浜'];

    // Check if the name contains any outdoor keywords
    for (const keyword of outdoorKeywords) {
        if (name.includes(keyword)) {
            // Some things like "公園事務所" (Park Office) are indoor, but generally "公園" is outdoor.
            // Let's do a basic assumption.
            return 'outdoor';
        }
    }

    // If it's not explicitly outdoor, we assume it's an indoor facility (school, community center, etc.)
    return 'indoor';
}

/**
 * Convert Lat/Lon to Tile Coordinates (Z, X, Y)
 */
function latLonToTile(lat: number, lon: number, z: number): { x: number, y: number } {
    const x = Math.floor((lon + 180) / 360 * Math.pow(2, z));
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
    return { x, y };
}

/**
 * Fetch shelter data from GSI Tiles for a specific location and radius
 * For simplicity, we fetch a 3x3 grid of tiles around the center tile at Z=15.
 */
// Return type matches Shelter interface structure (flat lat/lon, note)
export async function fetchGSIShelters(lat: number, lon: number): Promise<Omit<Shelter, 'id' | 'createdAt'>[]> {
    const { x: centerX, y: centerY } = latLonToTile(lat, lon, ZOOM_LEVEL);

    // Determine tile range. At Z=10, one tile is ~30kmx30km.
    // To save mobile bandwidth (tiles can be 1-5MB each), we only fetch the center tile.
    const tiles = [
        { x: centerX, y: centerY, z: ZOOM_LEVEL }
    ];

    // Using a map to avoid duplicates if same shelter appears in multiple disaster layers
    const shelterMap = new Map<string, Omit<Shelter, 'id' | 'createdAt'>>();

    // Fetch from all relevant disaster layers to ensure we find shelters specialized for any type
    const targetLayers = Object.values(LAYERS);

    // Fetch tiles in parallel for better performance
    const fetchPromises = [];
    for (const layer of targetLayers) {
        for (const tile of tiles) {
            fetchPromises.push(
                fetch(`${BASE_URL}/${layer}/${tile.z}/${tile.x}/${tile.y}.geojson`)
                    .then(res => {
                        if (!res.ok) return null;
                        return res.json() as Promise<GSIGeoJSON>;
                    })
                    .catch(e => {
                        console.warn(`Failed to fetch GSI tile: ${layer}/${tile.z}/${tile.x}/${tile.y}`, e);
                        return null;
                    })
            );
        }
    }

    const results = await Promise.all(fetchPromises);

    for (const data of results) {
        if (!data || !data.features) continue;

        for (const feature of data.features) {
            const name = feature.properties.name;
            const address = feature.properties.address;
            const [featureLon, featureLat] = feature.geometry.coordinates;

            // Filter out shelters that are too far away (e.g. > 3km) to match the UI description
            const dist = getDistanceKm(lat, lon, featureLat, featureLon);
            if (dist > 3) continue;

            // Generate a unique key to deduplicate
            const key = `${name}-${featureLat.toFixed(6)}-${featureLon.toFixed(6)}`;

            const newDisasters = parseDisasterFlags(feature.properties);
            const facilityType = determineFacilityType(name);

            if (!shelterMap.has(key)) {
                shelterMap.set(key, {
                    name: name,
                    address: address, // GSI address often contains full address
                    latitude: featureLat,
                    longitude: featureLon,
                    supportedDisasters: newDisasters,
                    facilityType: facilityType,
                    note: "【国土地理院データ】指定緊急避難場所"
                });
            } else {
                // Merge disaster flags if shelter exists in multiple layers with partial properties
                const existing = shelterMap.get(key)!;
                if (existing.supportedDisasters) {
                    const merged = new Set([...existing.supportedDisasters, ...newDisasters]);
                    existing.supportedDisasters = Array.from(merged);
                } else {
                    existing.supportedDisasters = newDisasters;
                }
            }
        }
    }

    return Array.from(shelterMap.values());
}
