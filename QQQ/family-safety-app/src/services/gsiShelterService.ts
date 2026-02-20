
import { Shelter } from "@/types/shelter";

// GSI Tile Base URL
const BASE_URL = "https://cyberjapandata.gsi.go.jp/xyz";

// Layer IDs for different disaster types
const LAYERS = {
    FLOOD: "skhb01",       // 洪水
    EARTHQUAKE: "skhb04",  // 地震
    TSUNAMI: "skhb05",     // 津波
} as const;

// Zoom level for fetching tiles (Z=15 is approx 1km scale)
const ZOOM_LEVEL = 15;

interface GSIFeature {
    type: "Feature";
    properties: {
        name: string;
        address: string;
        [key: string]: any;
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

    // Determine tile range (3x3 grid to cover surroundings)
    const tiles = [];
    // 3x3 grid covers roughly 3km x 3km area at Z=15
    for (let x = centerX - 1; x <= centerX + 1; x++) {
        for (let y = centerY - 1; y <= centerY + 1; y++) {
            tiles.push({ x, y, z: ZOOM_LEVEL });
        }
    }

    // Using a map to avoid duplicates if same shelter appears in multiple disaster layers
    const shelterMap = new Map<string, Omit<Shelter, 'id' | 'createdAt'>>();

    // Fetch from multiple layers
    const targetLayers = [LAYERS.EARTHQUAKE, LAYERS.FLOOD];

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
            const [lon, lat] = feature.geometry.coordinates;

            // Generate a unique key to deduplicate
            const key = `${name}-${lat.toFixed(6)}-${lon.toFixed(6)}`;

            if (!shelterMap.has(key)) {
                shelterMap.set(key, {
                    name: name,
                    address: address, // GSI address often contains full address
                    latitude: lat,
                    longitude: lon,
                    note: "【国土地理院データ】指定緊急避難場所"
                });
            }
        }
    }

    return Array.from(shelterMap.values());
}
