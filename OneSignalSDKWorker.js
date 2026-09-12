/* ================================================================
 * 1. IMPORT ONESIGNAL SDK RESMI (WAJIB PALING ATAS)
 * ================================================================ */
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

/* ================================================================
 * 2. PWA CACHE MANAGER (PT. PUTRA AULIA GROUP)
 * ================================================================ */
const CACHE_NAME = 'PAG_CACHE_V2';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png'
];

// Install Event - Simpan file statis ke Cache
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE).catch(function(err) {
        console.warn('[SW] Cache non-blocking error:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Bersihkan cache lama
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Menghapus cache lawas:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Ambil dari jaringan, fallback ke cache jika offline
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  // Jangan cache request ke OneSignal, Google Apps Script, atau chrome extensions
  const url = event.request.url;
  if (
    url.startsWith('chrome-extension://') ||
    url.includes('onesignal.com') ||
    url.includes('script.google.com') ||
    url.includes('googleusercontent.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(event.request).then(function(cachedResponse) {
          if (cachedResponse) return cachedResponse;
          return new Response('Offline - Konten belum tersedia', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// CATATAN: Event "push" dan "notificationclick" TIDAK PERLU DITULIS 
// karena sudah otomatis ditangani 100% oleh OneSignalSDK.sw.js di baris pertama.