const CACHE_NAME = 'csv-data-cache-v2'; // Bumped version to force update
const CSV_URL = 'ernaehrung.csv'; 
const FILES_TO_CACHE = [
  './',
  './index.html',
  `./${CSV_URL}`
];

self.addEventListener('install', (event) => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Cache Key App Files (App Shell + CSV)
        return cache.addAll(FILES_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Intercept fetch requests
  // We now check if the URL matches the CSV OR the likely URLs for the app itself
  const url = new URL(event.request.url);
  const isCsv = url.pathname.endsWith(CSV_URL);
  const isAppShell = url.pathname.endsWith('/') || url.pathname.endsWith('index.html');

  if (isCsv || isAppShell) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Cache hit - return response
          if (response) {
            return response;
          }

          // Not in cache? Fetch from network
          const fetchRequest = event.request.clone();

          return fetch(fetchRequest).then(
            (response) => {
              // Check if we received a valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Clone the response
              const responseToCache = response.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });

              return response;
            }
          ).catch(() => {
            // Optional: You could return a fallback here if network fails and no cache exists
            console.log('Network request failed and no cache for:', event.request.url);
          });
        })
    );
  }
});

// Update the cache name to force a refresh manually
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensure the new service worker takes over immediately
  return self.clients.claim();
});