// ================================================================
// sw.js - SMART SERVICE WORKER DENGAN PUSH PINTAR & BADGE ANGKA
// PT. PUTRA AULIA GROUP
// ================================================================

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

// ⚡ 1. TERIMA PUSH DARI SERVER DENGAN PENGECEKAN PINTAR & BADGE
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
    requireInteraction: true,
    silent: false,
    vibrate: [300, 100, 300],
    data: { 
      url: targetUrl 
    }
  };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async function(clientList) {
      
      // 🔴 1. PASANG BADGE ANGKA DI TASKBAR WINDOWS & ICON HP
      if ('setAppBadge' in navigator) {
        try {
          var count = (typeof data.count === 'number') ? data.count : 1;
          await navigator.setAppBadge(count);
        } catch (eBadge) {}
      }

      // 🧠 2. ⚡ PERBAIKAN: HANYA CEK APAKAH PWA SEDANG AKTIF DIFOKUSKAN
      var isAppFocused = clientList.some(function(client) {
        return client.focused === true; // Hanya anggap aktif jika user sedang mengetik di dalam PWA
      });

      // A. JIKA USER SEDANG AKTIF DI DALAM PWA:
      if (isAppFocused) {
        // Jangan munculkan spanduk hitam Windows (cukup kartu hijau internal saja)
        return;
      }

      // B. JIKA SEDANG DI EXCEL / MINIMIZE / LAYAR TERKUNCI:
      // ⚡ MUNCULKAN SPANDUK HITAM RESMI WINDOWS & ANDROID!
      return self.registration.showNotification(judul, options);
    })
  );
});

// ⚡ 2. KETIKA BANNER DIKLIK DI WINDOWS ATAU HP
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // 🔴 BERSIHKAN BADGE ANGKA KARENA SUDAH DIBUKA
  if ('clearAppBadge' in navigator) {
    try {
      navigator.clearAppBadge();
    } catch (eClear) {}
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

// ⚡ 3. SINKRONISASI BADGE DARI DALAM APLIKASI
self.addEventListener('message', function(event) {
  if (!event.data) return;

  if (event.data.type === 'UPDATE_BADGE' && 'setAppBadge' in navigator) {
    try {
      var unreadCount = Number(event.data.count || 0);
      if (unreadCount > 0) {
        navigator.setAppBadge(unreadCount);
      } else {
        navigator.clearAppBadge();
      }
    } catch (e) {}
  }

  if (event.data.type === 'CLEAR_BADGE' && 'clearAppBadge' in navigator) {
    try {
      navigator.clearAppBadge();
    } catch (e) {}
  }
});
