const CACHE_NAME = 'gunluk-program-v5';

// Dinamik base path - hangi repo adı olursa olsun çalışır
const BASE = self.location.pathname.replace('/sw.js','');

const CACHE_ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inconsolata:wght@300;400;500;600&display=swap',
];

// Yüklenince cache'e al
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_ASSETS).catch(()=>{}))
      .then(() => self.skipWaiting())
  );
});

// Eski cache'leri temizle
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// İstekleri yakala
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // AI API ve fontlar — her zaman internetten al
  if (url.hostname === 'api.anthropic.com' ||
      url.hostname === 'fonts.googleapis.com' ||
      url.hostname === 'fonts.gstatic.com') {
    event.respondWith(fetch(event.request).catch(() => new Response('', {status: 503})));
    return;
  }

  // Diğer istekler — önce cache, yoksa internet
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Başarılı GET isteklerini cache'e ekle
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Çevrimdışı fallback
        return caches.match(BASE + '/index.html') || 
               new Response('Çevrimdışı', {status: 503});
      });
    })
  );
});

// Notification tıklanınca timer sayfasını aç
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({type:'window'}).then(clients => {
      if (clients.length) {
        clients[0].focus();
        clients[0].postMessage({page:'timer'});
      } else {
        self.clients.openWindow(BASE + '/');
      }
    })
  );
});
