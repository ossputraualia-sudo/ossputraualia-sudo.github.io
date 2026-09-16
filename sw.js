// ================================================================
// sw.js - SERVICE WORKER KEBAL & RINGKAS (PAG DOCS)
// PT. PUTRA AULIA GROUP
// ================================================================

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

// ⚡ 1. JIKA ADA PUSH DARI SERVER (FALLBACK)
self.addEventListener('push', function(event) {
  var data = {};
  if (event.data) {
    try { data = event.data.json(); } catch(e) { data = { judul: 'P.A.G Docs', pesan: event.data.text() }; }
  }

  var judul = data.judul || '🔔 Pemberitahuan P.A.G';
  var pesan = data.pesan || '';
  var rawLink = data.link || data.url || '/';

  var targetUrl = new URL(rawLink, self.location.origin).href;
  var iconUrl = new URL('icon-192.png', self.location.origin).href;

  var options = {
    body: pesan,
    icon: iconUrl,
    badge: iconUrl,
    tag: 'pag-toast-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: { url: targetUrl },
    actions: [{ action: 'tutup', title: '✕ Tutup' }]
  };

  event.waitUntil(self.registration.showNotification(judul, options));
});

// ⚡ 2. KETIKA SPANDUK DIKLIK ATAU DITUTUP
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Bersihkan badge angka di taskbar
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(function() {});
  }

  // ⚡ JIKA STAF KLIK TOMBOL "✕ TUTUP": Cukup tutup spanduk, JANGAN buka aplikasi!
  if (event.action === 'tutup') {
    return;
  }

  // JIKA BADAN SPANDUK YANG DIKLIK: Buka aplikasi dan angkat ke depan Excel
  var rawUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';
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
