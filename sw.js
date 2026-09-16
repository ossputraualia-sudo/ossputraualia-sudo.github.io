// ================================================================
// sw.js - SERVICE WORKER NATIVE PUSH (OPTIMAL UNTUK WINDOWS & EXCEL)
// PT. PUTRA AULIA GROUP
// ================================================================

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

// ⚡ 1. TERIMA PUSH DARI SERVER (SAAT APLIKASI DI-MINIMIZE / TUTUP)
self.addEventListener('push', function(event) {
  var data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch(e) {
      data = { judul: 'P.A.G Docs', pesan: event.data.text() };
    }
  }

  // Tangkap baik bahasa Indonesia (judul/pesan) maupun standar Push API (title/body)
  var judul = data.judul || data.title || '🔔 Pemberitahuan P.A.G';
  var pesan = data.pesan || data.body || data.message || 'Ada pembaruan dokumen atau tender baru.';
  var rawLink = data.link || data.url || '/';

  // ⚡ Pastikan URL selalu absolut agar aman untuk Windows
  var targetUrl = new URL(rawLink, self.location.origin).href;
  var iconUrl = new URL('icon-192.png', self.location.origin).href;

  var options = {
    body: pesan,
    icon: iconUrl,
    badge: iconUrl,
    tag: 'pag-toast-' + Date.now(), // Tag unik: agar Windows selalu membunyikan banner baru
    renotify: true,                 // Bunyikan suara & getar meski ada notifikasi lama
    requireInteraction: true,       // ⚡ BANNER MELAYANG PERMANEN di layar sampai diklik/disilang
    silent: false,
    vibrate: [300, 100, 300],
    data: { 
      url: targetUrl 
    }
  };

  event.waitUntil(
    self.registration.showNotification(judul, options)
  );
});

// ⚡ 2. KETIKA BANNER DI WINDOWS DIKLIK OLEH PENGGUNA
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  var rawUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/';
  
  var targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Skenario A: Jika jendela aplikasi sudah terbuka di taskbar, tarik ke depan Excel
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

      // Skenario B: Jika aplikasi tertutup total, luncurkan jendela baru (wajib URL Absolut)
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
