const c = { name: "Shinjuku", lat: 35.6895, lon: 139.6917 };
async function test() {
    for (const layer of ['skhb01', 'skhb04']) {
        for (let z = 10; z <= 17; z++) {
            const x = Math.floor((c.lon + 180) / 360 * Math.pow(2, z));
            const y = Math.floor((1 - Math.log(Math.tan(c.lat * Math.PI / 180) + 1 / Math.cos(c.lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
            const url = `https://cyberjapandata.gsi.go.jp/xyz/${layer}/${z}/${x}/${y}.geojson`;
            try {
                const r = await fetch(url);
                if (r.ok) {
                    const j = await r.json();
                    console.log(`SUCCESS: layer=${layer} z=${z} url=${url} features=${j.features?.length}`);
                }
            } catch (e) { }
        }
    }
}
test();
