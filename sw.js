const CACHE_NAME = 'program-v4-cache';
const OFFLINE_URL = '/G-nl-k-program/';

const CACHE_ASSETS = [
  '/G-nl-k-program/',
  '/G-nl-k-program/index.html',
  '/G-nl-k-program/manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inconsolata:wght@300;400;500;600&display=swap',
];

// Yüklenince cache'e al
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Eski cache'leri temizle
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// İstekleri yakala
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // AI API, fontlar — her zaman internetten al
  if (
    url.hostname === 'api.anthropic.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // Geri kalan her şey: önce cache, yoksa internet, o da yoksa cache'den sun
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Arka planda güncelle
        fetch(event.request).then(fresh => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, fresh));
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => cached || new Response('Çevrimdışısın. Uygulama yükleniyor...', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }));
    })
  );
});
