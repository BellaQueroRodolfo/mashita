// ============================================================
// Español con Маша — Always Fresh Service Worker
// index.html: always network-first (always latest version)
// assets: cached forever (icons, manifest)
// offline: falls back to last cached index.html
// ============================================================

const CACHE = 'masha-assets-v1';

const CACHED_ASSETS = [
  '/mashita/icon-192.png',
  '/mashita/icon-512.png',
  '/mashita/manifest.json',
];

// ---- INSTALL: pre-cache only static assets ----
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(cache){
      return cache.addAll(CACHED_ASSETS).catch(function(){
        return Promise.resolve(); // don't block on 404s
      });
    }).then(function(){
      return self.skipWaiting(); // activate immediately
    })
  );
});

// ---- ACTIVATE: take control of all tabs immediately ----
self.addEventListener('activate', function(e){
  e.waitUntil(self.clients.claim());
});

// ---- FETCH ----
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;

  var url = e.request.url;
  var isLocal = url.startsWith(self.location.origin);
  if(!isLocal) return;

  var isHTML = (
    url.includes('/mashita/index.html') ||
    url.endsWith('/mashita/') ||
    url.endsWith('/mashita')
  );

  if(isHTML){
    // HTML: ALWAYS network first — she gets the latest version every open
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(function(response){
          if(response.ok){
            // Save a copy for offline fallback
            var clone = response.clone();
            caches.open(CACHE).then(function(cache){
              cache.put(e.request, clone);
            });
          }
          return response;
        })
        .catch(function(){
          // Offline: serve last cached version
          return caches.match(e.request).then(function(cached){
            return cached || caches.match('/mashita/index.html');
          });
        })
    );
    return;
  }

  // Static assets: cache first (icons, manifest — never change)
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(response){
        if(response.ok){
          var clone = response.clone();
          caches.open(CACHE).then(function(cache){
            cache.put(e.request, clone);
          });
        }
        return response;
      });
    })
  );
});
