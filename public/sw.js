// Version number - Update this when you push new code to trigger auto-updates
// Change this version number whenever you deploy new code to trigger automatic updates
const APP_VERSION = '1.0.7';
const CACHE_NAME = `tea-time-pos-cache-v${APP_VERSION}`;
// Add the main application shell files to the cache list.
// The service worker will automatically cache other requests (like to the CDN) as they are made.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/sw.js'
];

// Event: install
// Fired when the service worker is first installed.
self.addEventListener('install', event => {
  console.log('Service Worker: Installing version', APP_VERSION);
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache:', CACHE_NAME);
        // Use addAll but don't fail if some files fail to cache
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
              return null; // Continue even if individual files fail
            })
          )
        ).then(() => {
          console.log('Service Worker: Cache populated (some files may have failed)');
        });
      })
      .catch(err => {
        console.error('Service Worker: Cache install failed', err);
        // Don't prevent installation if cache fails
        throw err;
      })
  );
});

// Event: fetch
// Fired for every network request. This is where we implement our caching strategy.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip caching for development files and JavaScript/TypeScript modules
  // This ensures code changes are immediately visible without hard refresh
  if (url.hostname === 'localhost' || 
      url.hostname === '127.0.0.1' ||
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.ts') ||
      url.pathname.endsWith('.tsx') ||
      url.pathname.includes('/@vite/') ||
      url.pathname.includes('/node_modules/')) {
    // Always fetch from network for development files
    event.respondWith(fetch(event.request));
    return;
  }

  // We are using a "cache falling back to network" strategy.
  // This is ideal for an offline-first experience.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If we have a response in the cache, return it immediately.
        if (response) {
          return response;
        }

        // If it's not in the cache, we need to fetch it from the network.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response to cache.
            // We don't want to cache errors (non-200 status). Opaque responses (from CDNs) are fine.
            if (!response || (response.status !== 200 && response.type !== 'opaque')) {
              return response;
            }

            // Clone the response because it's a stream that can only be consumed once.
            // We need one for the cache and one for the browser.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(err => {
          // This will happen if the network request fails (e.g., user is offline).
          // Since the request wasn't in the cache, the fetch will fail.
          // A more advanced implementation could return a custom offline page here.
          console.error('Fetch failed; user may be offline:', err);
          throw err;
        });
      })
      .catch(err => {
        // If cache match fails, fetch from network
        console.error('Cache match failed, fetching from network:', err);
        return fetch(event.request);
      })
  );
});

// Event: activate
// Fired when a new service worker takes over. This is where we clean up old caches.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating version', APP_VERSION);
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheName.includes(CACHE_NAME)) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker: Activated and ready');
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
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    event.ports[0].postMessage({ version: APP_VERSION });
  }
});

