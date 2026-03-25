'use strict';

const CACHE_VERSION = 'oss-lille-v1';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './images/img_03.webp',
  './images/img_03.jpg',
  './images/img_04.webp',
  './images/img_04.jpg',
  './images/bg_01.webp',
  './images/bg_02.webp',
  './images/img_05.webp',
  './images/img_06.webp',
  './images/img_07.webp',
  './images/img_08.webp',
  './images/img_09.webp',
  './images/img_10.webp',
  './images/img_11.webp',
  './images/img_12.webp',
  './images/img_13.webp',
  './images/img_14.webp',
];

/* ----------------------------------------------------------
   Installation — mise en cache des ressources critiques
---------------------------------------------------------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ----------------------------------------------------------
   Activation — nettoyage des anciens caches
---------------------------------------------------------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/* ----------------------------------------------------------
   Fetch — stratégies de cache par type de ressource
---------------------------------------------------------- */
self.addEventListener('fetch', event => {
  const { request } = event;

  // Ignorer les requêtes non-GET et hors-origine
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  if (request.mode === 'navigate') {
    // Navigation HTML → network-first, fallback sur cache
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(c => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
  } else {
    // Ressources statiques → cache-first, mise à jour en arrière-plan
    event.respondWith(
      caches.match(request).then(cached => {
        const networkFetch = fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(c => c.put(request, clone));
          }
          return response;
        });
        return cached || networkFetch;
      })
    );
  }
});
