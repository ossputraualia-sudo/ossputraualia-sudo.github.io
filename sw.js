// ================================================================
// sw.js - SERVICE WORKER DENGAN DUKUNGAN POP-UP WINDOWS / EXCEL
// ================================================================

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

// ⚡ DIBANGUNKAN OLEH SISTEM OPERASI SAAT APLIKASI DI-MINIMIZE / TUTUP
self.addEventListener('push', function(event) {
  var data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch(e) {
      data = { judul: 'P.A.G Docs', pesan: event.data.text() };
    }
  }

  var judul = data.judul || '🔔 Pemberitahuan P.A.G';
  var pesan = data.pesan || 'Ada pembaruan tender atau dokumen baru.';
  var targetUrl = data.link || data.url || 'https://ossputraualia-sudo.github.io/';

  // Buat URL icon absolut agar Windows tidak gagal memuat gambar
  var iconUrl = self.location.origin + '/icon-192.png';

  var options = {
    body: pesan,
    icon: iconUrl,
    badge: iconUrl,
    tag: 'pag-toast-' + Date.now(), // ⚡ Tag dinamis agar Windows tidak menganggap pesan duplikat
    renotify: true,                 // ⚡ Paksa Windows membunyikan bel & memunculkan banner baru
    requireInteraction: true,       // ⚡ Banner TETAP MELAYANG di layar sampai diklik/disilang
    silent: false,
    vibrate: [300, 100, 300],
    data: { url: targetUrl }
  };

  event.waitUntil(
    self.registration.showNotification(judul, options)
  );
});

// Saat banner di layar desktop Windows diklik oleh pengguna
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Jika tab/jendela PWA sudah ada di taskbar, langsung buka & fokuskan
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // Jika PWA tertutup penuh, buka jendela baru
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
