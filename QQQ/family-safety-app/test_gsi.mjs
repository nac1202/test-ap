import https from 'https';

const url = 'https://cyberjapandata.gsi.go.jp/xyz/skhb01/10/909/403.geojson'; // Somewhere in Tokyo

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.features && parsed.features.length > 0) {
                console.log('Sample properties:', parsed.features[0].properties);
            } else {
                console.log('No features found in this tile');
            }
        } catch (e) {
            console.error('Parse error:', e);
        }
    });
}).on('error', err => {
    console.error('Fetch error:', err.message);
});
