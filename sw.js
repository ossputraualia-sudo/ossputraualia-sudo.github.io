// ================================================================
// sw.js - SERVICE WORKER UTAMA (STABIL & TEMBUS EXCEL 100%)
// PT. PUTRA AULIA GROUP
// ================================================================

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

// ⚡ 1. TERIMA PUSH DARI SERVER (LANGSUNG TEMBAK SPANDUK HITAM RESMI)
self.addEventListener('push', function(event) {
  var data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch(e) {
      data = { judul: 'P.A.G Docs', pesan: event.data.text() };
    }
  }

  var judul = data.judul || data.title || '🔔 Pemberitahuan P.A.G';
  var pesan = data.pesan || data.body || data.message || 'Ada pembaruan dokumen atau tender baru.';
  var rawLink = data.link || data.url || '/';

  var targetUrl = new URL(rawLink, self.location.origin).href;
  var iconUrl = new URL('icon-192.png', self.location.origin).href;

  var options = {
    body: pesan,
    icon: iconUrl,
    badge: iconUrl,
    tag: 'pag-toast-' + Date.now(),
    renotify: true,
    requireInteraction: true, // Banner melayang permanen sampai diklik
    silent: false,
    vibrate: [300, 100, 300],
    data: { 
      url: targetUrl 
    }
  };

  // ⚡ EKSEKUSI LANGSUNG TANPA PENGHALANG!
  var aksi = [
    self.registration.showNotification(judul, options)
  ];

  // Pasang badge angka di HP/Windows secara aman
  if ('setAppBadge' in navigator) {
    aksi.push(navigator.setAppBadge(1).catch(function() {}));
  }

  event.waitUntil(Promise.all(aksi));
});

// ⚡ 2. KETIKA BANNER DIKLIK DI WINDOWS ATAU HP
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Bersihkan badge
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(function() {});
  }

  var rawUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/';
  
  var targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          return client.focus().then(function(focusedClient) {
            if (focusedClient && 'navigate' in focusedClient) {
              return focusedClient.navigate(targetUrl);
            }
          });
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
