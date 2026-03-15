// Narayana Organic Dairy — Service Worker v2.0
// v2: switched static assets to network-first so file updates always reach clients immediately
const CACHE_NAME = 'narayana-dairy-v2';
const API_CACHE  = 'narayana-api-v2';

// ── Install: skip waiting immediately so new SW activates fast ───────────────
self.addEventListener('install', (event) => {
    console.log('[SW v2] Installing...');
    self.skipWaiting();
});

// ── Activate: delete ALL old caches ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
    console.log('[SW v2] Activating – clearing old caches...');
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(k => {
                if (k !== CACHE_NAME && k !== API_CACHE) {
                    console.log('[SW v2] Deleting old cache:', k);
                    return caches.delete(k);
                }
            }))
        ).then(() => self.clients.claim())
    );
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // Never cache auth endpoints
    if (url.pathname.startsWith('/api/auth')) return;

    // API calls: network-first, fall back to cache for offline
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstStrategy(event.request, API_CACHE));
        return;
    }

    // Static assets: NETWORK-FIRST so updated files are always served fresh
    // Falls back to cache only when fully offline
    event.respondWith(networkFirstStrategy(event.request, CACHE_NAME));
});

async function networkFirstStrategy(request, cacheName) {
    try {
        const networkResponse = await fetch(request.clone());
        if (networkResponse.ok) {
            // Update cache with fresh response
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (err) {
        // Offline fallback — try cache
        const cached = await caches.match(request);
        if (cached) {
            console.log('[SW v2] Offline – serving from cache:', request.url);
            return cached;
        }
        // Nothing in cache either
        const isApi = new URL(request.url).pathname.startsWith('/api/');
        return new Response(
            isApi
                ? JSON.stringify({ error: 'Offline – no cached data' })
                : '<p>Offline – page not available.</p>',
            {
                status: 503,
                headers: { 'Content-Type': isApi ? 'application/json' : 'text/html' }
            }
        );
    }
}

// ── Message handler ───────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
