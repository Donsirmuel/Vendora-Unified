const CACHE_NAME = 'vendora-cache-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : undefined)))
  );
  clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // SPA navigation: always serve cached index.html on offline
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        return fresh;
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('/index.html')) || (await cache.match('/offline.html'));
      }
    })());
    return;
  }

  // Static assets: cache-first
const dest = req.destination;
if (['style', 'script', 'worker', 'image', 'font'].includes(dest)) {
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      const url = new URL(req.url);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        cache.put(req, res.clone());
      }
      return res;
    } catch (_) {
      return caches.match('/offline.html');
    }
  })());
  return;
}


  // Fallback: network-first
  event.respondWith(
    fetch(req).catch(() => caches.match(req).then((res) => res || caches.match('/offline.html')))
  );
});

self.addEventListener('push', function(event) {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = data.title || 'Vendora';
  const body = data.message || 'You have a new notification';
  const options = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window' }).then(clientList => {
    for (const client of clientList) {
      if ('focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow('/dashboard');
  }));
});
