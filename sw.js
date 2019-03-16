const CACHE_NAME = 'piano-cache-v1';
const urlsToCache = [
  '/piano/',
  '/piano/app.js',
  '/piano/index.html',
  '/piano/style.css',
  '/piano/C4.mp3',
];

self.addEventListener('install', (event) => {
  // Perform install steps
  event.waitUntil(
      caches.open(CACHE_NAME)
          .then((cache) => {
            console.log('Opened cache');
            return cache.addAll(urlsToCache);
          })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
      caches.match(event.request)
          .then(function(response) {
                // Cache hit - return response
                if (response) {
                  return response;
                }
                return fetch(event.request);
              }
          )
  );
});