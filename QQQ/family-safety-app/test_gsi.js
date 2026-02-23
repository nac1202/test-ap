
// Native fetch is available in Node 18+
// Misato City Coordinates (Approx center based on user report)
const lat = 35.842;
const lon = 139.871;
const ZOOM = 15;

function latLonToTile(lat, lon, z) {
    const x = Math.floor((lon + 180) / 360 * Math.pow(2, z));
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
    return { x, y };
}

const { x, y } = latLonToTile(lat, lon, ZOOM);
console.log(`Coordinates: ${lat}, ${lon} -> Tile Z:${ZOOM} X:${x} Y:${y}`);

const layers = [
    "skhb01", // Flood
    "skhb02", // Landslide
    "skhb03", // Storm Surge
    "skhb04", // Earthquake
    "skhb05", // Tsunami
    "skhb06", // Fire
    "skhb07", // Inland Flood
    "skhb08"  // Volcano
];

async function testFetch() {
    console.log("Starting fetch...");
    for (const layer of layers) {
        const url = `https://cyberjapandata.gsi.go.jp/xyz/${layer}/${ZOOM}/${x}/${y}.geojson`;
        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                console.log(`[${layer}] Found: ${data.features.length} features`);
                if (data.features.length > 0) {
                    data.features.slice(0, 3).forEach(f => {
                        console.log(` - ${f.properties.name} (${f.properties.address})`);
                    });
                }
            } else {
                console.log(`[${layer}] Status: ${res.status}`);
            }
        } catch (e) {
            console.error(`[${layer}] Fetch failed:`, e.message);
        }
    }
}

testFetch();
