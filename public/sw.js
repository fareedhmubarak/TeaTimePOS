// Version number - Update this when you push new code to trigger auto-updates
// Change this version number whenever you deploy new code to trigger automatic updates
const APP_VERSION = '1.0.9';
const CACHE_NAME = `tea-time-pos-cache-v${APP_VERSION}`;

// NEVER cache these - always fetch from network
const NETWORK_ONLY_PATTERNS = [
  /\.js$/,
  /\.ts$/,
  /\.tsx$/,
  /\.mjs$/,
  /\/@vite\//,
  /\/node_modules\//,
  /supabase\.co/, // Never cache Supabase API calls
  /supabase\.io/,
  /\/api\//,
  /\/rest\/v1\//, // Supabase REST API
  /\/storage\/v1\//, // Supabase Storage
  /\/auth\/v1\//, // Supabase Auth
];

// Cache only static assets (images, icons, manifest)
const CACHEABLE_PATTERNS = [
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.svg$/,
  /\.ico$/,
  /manifest\.json$/,
  /\.woff$/,
  /\.woff2$/,
  /\.ttf$/,
  /\.eot$/,
];

// Event: install
// Fired when the service worker is first installed.
self.addEventListener('install', event => {
  console.log('Service Worker: Installing version', APP_VERSION);
  // Skip waiting to activate immediately - force update
  self.skipWaiting();
  
  // Clear ALL caches immediately on install - don't cache anything
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('Service Worker: Deleting ALL caches on install:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('Service Worker: All caches cleared on install');
      // Don't cache anything during install - we'll use network-only
    })
  );
});

// Event: fetch
// Use NETWORK-ONLY strategy for all app files to prevent stale cache issues
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const requestUrl = event.request.url;
  const requestMethod = event.request.method;
  
  // NEVER cache POST, PUT, DELETE requests (API calls)
  if (requestMethod !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // NEVER cache these - always fetch from network
  const isNetworkOnly = NETWORK_ONLY_PATTERNS.some(pattern => pattern.test(requestUrl)) ||
                        url.pathname === '/' ||
                        url.pathname === '/index.html' ||
                        url.pathname.endsWith('.html');
  
  if (isNetworkOnly) {
    // Always fetch from network, never use cache
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store', // Force no cache
        headers: {
          ...event.request.headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      }).catch(err => {
        console.error('Network fetch failed for:', requestUrl, err);
        throw err; // Don't fallback to cache for critical files
      })
    );
    return;
  }
  
  // For static assets only, use network-first with cache fallback
  const isCacheable = CACHEABLE_PATTERNS.some(pattern => pattern.test(requestUrl));
  
  if (isCacheable) {
    // Network-first strategy: try network first, fallback to cache only if offline
    event.respondWith(
      fetch(event.request, {
        cache: 'no-cache', // Always validate with server
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
        .then(response => {
          // Only cache successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache only for static assets when offline
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For everything else, use network-only
  event.respondWith(
    fetch(event.request, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      }
    }).catch(err => {
      console.error('Fetch failed:', requestUrl, err);
      throw err;
    })
  );
});

// Event: activate
// Fired when a new service worker takes over. Clear ALL old caches aggressively.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating version', APP_VERSION);
  event.waitUntil(
    Promise.all([
      // Delete ALL caches (we'll rebuild only what we need)
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker: Activated and ready - all old caches cleared');
      // Notify all clients about the update
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: APP_VERSION
          });
        });
      });
    })
  );
});

// Listen for messages from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    // Clear all caches when requested
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    event.ports[0].postMessage({ version: APP_VERSION });
  }
});
