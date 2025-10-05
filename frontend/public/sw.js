// Bump this version when deploying to force old caches to be purged
const CACHE_NAME = 'vendora-cache-v10';
const API_CACHE = 'vendora-api-v1';
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
        // Network-first for HTML navigations
        return await fetch(req);
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
    // Stale-while-revalidate: return cache immediately, update in background
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const fetchPromise = (async () => {
        try {
          const res = await fetch(req);
          const url = new URL(req.url);
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            cache.put(req, res.clone());
          }
          return res;
        } catch (_) {
          return cached || caches.match('/offline.html');
        }
      })();
      if (cached) {
        event.waitUntil(fetchPromise);
        return cached;
      }
      return await fetchPromise;
    })());
    return;
  }


  // API GETs: network-first with cache fallback for resilience
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/') && req.method === 'GET') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(API_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(API_CACHE);
        const cached = await cache.match(req);
        return cached || (await caches.match('/offline.html'));
      }
    })());
    return;
  }

  // Fallback: network-first
  event.respondWith(
    fetch(req).catch(() => caches.match(req).then((res) => res || caches.match('/offline.html')))
  );
});

// Allow clients to trigger skipWaiting to activate an updated SW immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'BADGE' && 'setAppBadge' in navigator) {
    const n = Number(event.data.value || 0);
    if (n > 0) navigator.setAppBadge(n).catch(() => {});
    else navigator.clearAppBadge && navigator.clearAppBadge().catch(() => {});
  }
});

self.addEventListener('push', function(event) {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = data.title || 'Vendora';
  const body = data.message || 'You have a new notification';
  const options = {
    body,
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: data.url || '/dashboard' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
  // Attempt to set a badge on supported platforms
  try {
    if ('setAppBadge' in navigator) navigator.setAppBadge(1);
  } catch {}
});

self.addEventListener('notificationclick', function(event) {
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/dashboard';
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
    for (const client of clientList) {
      try {
        const url = new URL(client.url);
        if (url.pathname === targetUrl && 'focus' in client) return client.focus();
      } catch (e) {}
    }
    if (clients.openWindow) return clients.openWindow(targetUrl);
  }));
});

// Background Sync (one-off) handler — expects queued requests in IndexedDB (not implemented here)
self.addEventListener('sync', (event) => {
  if (event.tag === 'vendora-sync') {
    event.waitUntil((async () => {
      // Placeholder: process queued POSTs if implemented
      return true;
    })());
  }
});

// Periodic Background Sync — refreshes key cached API GETs
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'vendora-periodic') {
    event.waitUntil((async () => {
      try {
        const cache = await caches.open(API_CACHE);
        const endpoints = ['/api/v1/orders/?status=pending', '/api/v1/transactions/?status=uncompleted'];
        for (const ep of endpoints) {
          const res = await fetch(ep, { cache: 'no-store' });
          cache.put(ep, res.clone());
        }
      } catch {}
    })());
  }
});

// Background Fetch API — demo hook (no-op by default)
self.addEventListener('backgroundfetchsuccess', (event) => {
  // Could consume fetched records and cache; keeping minimal for now
});
