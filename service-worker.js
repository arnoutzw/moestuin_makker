const CACHE_NAME = 'moestuinmakker-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json'
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for static, network-first for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for Firebase/API calls
  if (url.hostname.includes('firestore') || url.hostname.includes('googleapis')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// Push notification handler
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'You have a garden task!',
    icon: data.icon || './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'moestuinmakker',
    actions: data.actions || [
      { action: 'complete', title: 'Mark Done' },
      { action: 'snooze', title: 'Snooze' }
    ]
  };
  event.waitUntil(self.registration.showNotification(data.title || 'Moestuin Makker', options));
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      if (clients.length > 0) {
        clients[0].focus();
        clients[0].postMessage({ action: event.action, tag: event.notification.tag });
      } else {
        self.clients.openWindow('./index.html');
      }
    })
  );
});
