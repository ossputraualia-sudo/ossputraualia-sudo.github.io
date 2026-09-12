/* ================================================================
 * SERVICE WORKER - PAG DOCS
 * Required untuk OneSignal push notifications
 * ================================================================ */

const CACHE_NAME = 'PAG_CACHE_V1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

/* ================================================================
 * INSTALL EVENT - Cache files
 * ================================================================ */
self.addEventListener('install', function(event) {
  console.log('[SW] Install event triggered');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching essential files');
      return cache.addAll(URLS_TO_CACHE).catch(function(err) {
        console.warn('[SW] Cache error (non-blocking):', err);
      });
    })
  );
  
  self.skipWaiting();
});

/* ================================================================
 * ACTIVATE EVENT - Clean old caches
 * ================================================================ */
self.addEventListener('activate', function(event) {
  console.log('[SW] Activate event triggered');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});

/* ================================================================
 * FETCH EVENT - Network first, fallback to cache
 * ================================================================ */
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Chrome extensions & external APIs
  if (event.request.url.startsWith('chrome-extension://') || 
      event.request.url.includes('onesignal') ||
      event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Clone response untuk disimpan di cache
        if (response.status === 200) {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, cacheCopy);
          });
        }
        return response;
      })
      .catch(function(error) {
        console.log('[SW] Fetch failed, returning cached version:', event.request.url);
        return caches.match(event.request).then(function(response) {
          return response || new Response('Offline - No cached version available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

/* ================================================================
 * PUSH EVENT - Handle OneSignal push notifications
 * ================================================================ */
self.addEventListener('push', function(event) {
  console.log('[SW] Push event received');
  
  if (!event.data) {
    console.log('[SW] No push data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push data:', data);

    const options = {
      body: data.contents?.en || data.contents?.id || 'Notifikasi baru',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'pag-notification',
      requireInteraction: false,
      actions: [
        {
          action: 'open',
          title: '🔍 Buka Aplikasi'
        },
        {
          action: 'close',
          title: '✕ Tutup'
        }
      ],
      data: {
        url: data.url || '/',
        notifId: data.id
      }
    };

    event.waitUntil(
      self.registration.showNotification(
        data.headings?.en || data.headings?.id || 'PAG Docs',
        options
      )
    );
  } catch (err) {
    console.error('[SW] Error handling push:', err);
  }
});

/* ================================================================
 * NOTIFICATION CLICK EVENT
 * ================================================================ */
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  const action = event.action;

  if (action === 'close') {
    console.log('[SW] User closed notification');
    return;
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Cari window yang sudah terbuka
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Jika tidak ada, buka window baru
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/* ================================================================
 * NOTIFICATION CLOSE EVENT
 * ================================================================ */
self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notification dismissed');
});

console.log('[SW] Service Worker loaded successfully');
