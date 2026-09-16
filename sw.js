// ================================================================
// sw.js - SERVICE WORKER ENTERPRISE (INFORMATIF, CANTIK & EXPANDABLE)
// PT. PUTRA AULIA GROUP
// ================================================================

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

// ⚡ 1. TERIMA NOTIFIKASI & TAMPILKAN FORMAT MEWAH BERSTRUKTUR
self.addEventListener('push', function(event) {
  var data = {};
  if (event.data) {
    try { 
      data = event.data.json(); 
    } catch(e) { 
      data = { judul: 'P.A.G Docs', pesan: event.data.text() }; 
    }
  }

  var judul = data.judul || data.title || '📢 P.A.G DOCS • PEMBERITAHUAN';
  var pesan = data.pesan || data.body || data.message || 'Ada pembaruan data sistem terbaru.';
  var rawLink = data.link || data.url || '/';

  // Pastikan URL selalu absolut
  var targetUrl = new URL(rawLink, self.location.origin).href;
  var iconUrl = new URL('icon-192.png', self.location.origin).href;

  // ⚡ PENGATURAN TAMPILAN RESMI WINDOWS (CANTIK & EXPANDABLE)
  var options = {
    body: pesan, // Teks multi-baris (\n) otomatis memunculkan fitur 'Perluas Rincian (▾)'
    icon: iconUrl,
    badge: iconUrl,
    tag: 'pag-alert-' + Date.now(), // Tag unik per notifikasi
    renotify: true,                 // Bunyikan lonceng & getar ulang
    requireInteraction: true,       // Melayang permanen di atas Excel sampai ditutup
    silent: false,
    timestamp: Date.now(),          // Menampilkan jam kedatangan pesan
    vibrate: [200, 100, 200, 100, 200],
    data: { 
      url: targetUrl 
    },
    // ⚡ HANYA 1 TOMBOL BERSIH (TANPA TOMBOL BUKA MODUL)
    actions: [
      { action: 'tutup', title: '✕ Tutup' }
    ]
  };

  // Eksekusi penampil notifikasi
  var aksi = [
    self.registration.showNotification(judul, options)
  ];

  // Nyalakan angka badge di taskbar Windows / icon HP jika didukung
  if ('setAppBadge' in navigator) {
    aksi.push(navigator.setAppBadge(1).catch(function() {}));
  }

  event.waitUntil(Promise.all(aksi));
});

// ⚡ 2. KETIKA SPANDUK DIKLIK ATAU DITUTUP OLEH PENGGUNA
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // 🔴 Bersihkan angka badge di taskbar / HP karena notifikasi sudah direspons
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(function() {});
  }

  // ⚡ JIKA STAF MENGEKLIK TOMBOL "✕ TUTUP":
  // Cukup hilangkan spanduknya, JANGAN buka aplikasi sama sekali!
  if (event.action === 'tutup') {
    return;
  }

  // ⚡ JIKA STAF MENGEKLIK BADAN SPANDUK:
  // Angkat aplikasi PWA ke layar depan dan langsung buka modul terkait!
  var rawUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/';
  var targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Jika jendela PWA sudah terbuka di taskbar, langsung fokuskan
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

      // Jika PWA tertutup total, luncurkan jendela baru
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
