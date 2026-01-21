const CACHE_NAME = 'secretary-app-v2';
// Only cache critical assets that we generate or static files. 
// Avoid caching JS modules aggressively in dev mode if possible, but for PWA 'fetch' handler is required.
const ASSETS = [
    '/index.html',
    '/manifest.json',
    '/icon.png',
    '/src/style.css',
    '/src/colors.css',
    '/src/swipe.css'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        }).catch(err => console.log("SW Cache Error ignored for robustness", err))
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
