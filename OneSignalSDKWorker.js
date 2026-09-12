importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Pasang angka badge di taskbar / icon PWA saat push notifikasi masuk
self.addEventListener('push', function(event) {
  if ('setAppBadge' in self.navigator) {
    // WAJIB: Gunakan event.waitUntil agar worker tidak dimatikan sebelum badge terpasang
    event.waitUntil(
      self.navigator.setAppBadge(1).catch(function(e) {
        console.warn("[SW] Gagal pasang badge:", e);
      })
    );
  }
});

// Bersihkan badge saat notifikasi diklik oleh user
self.addEventListener('notificationclick', function(event) {
  if ('clearAppBadge' in self.navigator) {
    // WAJIB: Gunakan event.waitUntil
    event.waitUntil(
      self.navigator.clearAppBadge().catch(function(e) {
        console.warn("[SW] Gagal bersihkan badge:", e);
      })
    );
  }
});
