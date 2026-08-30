const CACHE = 'random-route-v14';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './airports.json',
  './countries.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Eigene Code-/Markup-Dateien: network-first, damit ein Update auf GitHub
// Pages sofort beim nächsten Laden ankommt (Fallback auf Cache nur offline).
// airports.json ändert sich praktisch nie und ist groß -> cache-first, spart
// Datenvolumen und lädt sofort.
const CACHE_FIRST = ['/airports.json', '/countries.json', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png'];

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // CDN-Requests unangetastet lassen

  const cacheFirst = CACHE_FIRST.some(p => url.pathname.endsWith(p));

  if (cacheFirst) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, copy));
        return res;
      }))
    );
    return;
  }

  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(cache => cache.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
