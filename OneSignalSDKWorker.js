importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Pasang angka badge di taskbar saat push notifikasi masuk
self.addEventListener('push', function(event) {
  if ('setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(1).catch(function(e){});
  }
});

// Bersihkan badge saat notifikasi diklik
self.addEventListener('notificationclick', function(event) {
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(function(e){});
  }
});
