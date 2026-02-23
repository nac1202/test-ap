
const lat = 35.842;
const lon = 139.871;

function latLonToTile(lat, lon, z) {
    const x = Math.floor((lon + 180) / 360 * Math.pow(2, z));
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
    return { x, y };
}

const targetLayers = ["skhb04"]; // Earthquake (most common)

async function testFetch() {
    console.log("Starting multi-zoom fetch for Earthquake layer...");

    // Test Z=12 to Z=16
    for (let z = 12; z <= 16; z++) {
        const { x, y } = latLonToTile(lat, lon, z);
        console.log(`\nTesting Zoom ${z} (Center Tile: ${x}/${y})`);

        // Check center and neighbors (3x3)
        let found = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const tx = x + dx;
                const ty = y + dy;
                const url = `https://cyberjapandata.gsi.go.jp/xyz/skhb04/${z}/${tx}/${ty}.geojson`;
                try {
                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        console.log(`  [${z}/${tx}/${ty}] OK: ${data.features.length} features`);
                        if (data.features.length > 0) {
                            console.log(`    Sample: ${data.features[0].properties.name}`);
                        }
                        found++;
                    } else {
                        // console.log(`  [${z}/${tx}/${ty}] ${res.status}`);
                    }
                } catch (e) {
                    console.error(`  Fetch error: ${e.message}`);
                }
            }
        }
        if (found === 0) console.log(`  No tiles found at Z=${z} (All 404)`);
    }
}

testFetch();
