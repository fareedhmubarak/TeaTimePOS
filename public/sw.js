// Version - bump this to trigger auto-updates on deploy
const APP_VERSION = '1.0.13';
const CACHE_NAME = `tea-time-pos-v${APP_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Pre-cache these during install for offline support
const PRECACHE_URLS = [
  OFFLINE_URL,
];

// Bypass patterns - never intercept these requests
const BYPASS_PATTERNS = [
  /supabase\.co/,
  /supabase\.io/,
  /yvtuztmveynsotbmycxv/,
];

// Cache only static assets (images, icons, fonts)
const CACHEABLE_PATTERNS = [
  /\.png(\?.*)?$/,
  /\.jpg(\?.*)?$/,
  /\.jpeg(\?.*)?$/,
  /\.gif(\?.*)?$/,
  /\.svg(\?.*)?$/,
  /\.ico(\?.*)?$/,
  /\.woff2?(\?.*)?$/,
  /\.ttf(\?.*)?$/,
  /\.eot(\?.*)?$/,
];

// Install: pre-cache offline page so Chrome sees offline capability
self.addEventListener('install', event => {
  console.log('[SW] Installing version', APP_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching offline page');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: delete OLD version caches only, keep current
self.addEventListener('activate', event => {
  console.log('[SW] Activating version', APP_VERSION);
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      ))
      .then(() => self.clients.claim())
      .then(() => {
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SW_ACTIVATED', version: APP_VERSION });
          });
        });
      })
  );
});

// Fetch handler
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const requestUrl = event.request.url;

  // 1. Bypass Supabase requests entirely - preserve all headers
  if (BYPASS_PATTERNS.some(p => p.test(requestUrl) || p.test(url.hostname))) {
    return;
  }

  // 2. Skip CORS preflight
  if (event.request.method === 'OPTIONS') {
    return;
  }

  // 3. Non-GET: network only
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // 4. Navigation requests (HTML pages): network-first with offline fallback
  //    This is CRITICAL for PWA installability - Chrome checks this offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // 5. Static assets: network-first with cache fallback
  if (CACHEABLE_PATTERNS.some(p => p.test(requestUrl))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 6. Everything else: network only
  event.respondWith(fetch(event.request));
});

// Listen for messages from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CHECK_UPDATE') {
    event.ports[0].postMessage({ version: APP_VERSION });
  }
});
