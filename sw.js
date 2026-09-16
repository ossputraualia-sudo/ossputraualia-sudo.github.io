// sw.js - PENERIMA SINYAL SAAT APLIKASI TERTUTUP MATI
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

// ⚡ DIBANGUNKAN OLEH WINDOWS/GOOGLE SAAT PWA DITUTUP
self.addEventListener('push', function(event) {
  var data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch(e) {
      data = { judul: 'P.A.G Docs', pesan: event.data.text() };
    }
  }

  var judul = data.judul || '🔔 Pemberitahuan Baru';
  var pesan = data.pesan || 'Ada pembaruan dokumen atau tender baru.';
  var targetUrl = data.link || data.url || '/';

  var options = {
    body: pesan,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [200, 100, 200],
    requireInteraction: true, // Banner tetap tampil di layar sampai diklik
    data: { url: targetUrl }
  };

  event.waitUntil(
    self.registration.showNotification(judul, options)
  );
});

// Saat banner diklik di layar desktop
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
