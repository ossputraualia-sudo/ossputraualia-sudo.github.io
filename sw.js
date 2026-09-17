// ================================================================
// sw.js
// PAG DOCS FIELD / PT PUTRA AULIA GROUP
// SERVICE WORKER - WEB PUSH
// ================================================================

const SW_VERSION = 'pag-push-v2';


// ================================================================
// 1. INSTALL
// ================================================================
self.addEventListener('install', function(event) {
  console.log('[PAG SW] Install:', SW_VERSION);

  // Langsung gunakan worker terbaru
  self.skipWaiting();
});


// ================================================================
// 2. ACTIVATE
// ================================================================
self.addEventListener('activate', function(event) {
  event.waitUntil(
    (async function() {
      console.log('[PAG SW] Activate:', SW_VERSION);

      // Ambil kontrol semua halaman
      await self.clients.claim();

      // Bersihkan cache lama jika nanti digunakan
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(function(key) {
            return key !== SW_VERSION;
          })
          .map(function(key) {
            return caches.delete(key);
          })
      );
    })()
  );
});


// ================================================================
// 3. TERIMA WEB PUSH
// ================================================================
self.addEventListener('push', function(event) {

  console.log('[PAG SW] PUSH diterima');

  var data = {};

  // --------------------------------------------------------------
  // Baca payload
  // --------------------------------------------------------------
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        judul: 'P.A.G DOCS',
        pesan: event.data.text()
      };
    }
  }

  var judul =
    data.judul ||
    data.title ||
    '🔔 P.A.G DOCS • PEMBERITAHUAN';

  var pesan =
    data.pesan ||
    data.body ||
    data.message ||
    'Ada pembaruan pada sistem P.A.G Docs.';

  var rawLink =
    data.link ||
    data.url ||
    '/';

  // --------------------------------------------------------------
  // Pastikan URL absolut
  // --------------------------------------------------------------
  var targetUrl;

  try {
    targetUrl = new URL(
      rawLink,
      self.location.origin
    ).href;
  } catch (e) {
    targetUrl = self.location.origin + '/';
  }


  // --------------------------------------------------------------
  // Icon
  // --------------------------------------------------------------
  var iconUrl;

  try {
    iconUrl = new URL(
      'icon-192.png',
      self.location.origin
    ).href;
  } catch (e) {
    iconUrl = '';
  }


  // --------------------------------------------------------------
  // OPTIONS NOTIFIKASI
  // --------------------------------------------------------------
  var options = {

    body: String(pesan),

    icon: iconUrl,

    badge: iconUrl,

    // Gunakan tag tetap agar notifikasi PAG bisa diperbarui
    // tanpa menghasilkan ratusan notifikasi identik.
    tag: 'pag-docs-notification',

    // Bunyi/getar kembali ketika notifikasi baru datang.
    renotify: true,

    // Tetap terlihat sampai user berinteraksi.
    requireInteraction: true,

    silent: false,

    timestamp: Date.now(),

    vibrate: [200, 100, 200],

    data: {
      url: targetUrl,
      source: 'PAG_DOCS'
    },

    // Satu tombol saja.
    actions: [
      {
        action: 'tutup',
        title: '✕ Tutup'
      }
    ]
  };


  // --------------------------------------------------------------
  // TAMPILKAN NOTIFIKASI
  // --------------------------------------------------------------
  event.waitUntil(

    self.registration.showNotification(
      judul,
      options
    )

  );
});


// ================================================================
// 4. KLIK NOTIFIKASI
// ================================================================
self.addEventListener(
  'notificationclick',
  function(event) {

    console.log(
      '[PAG SW] Notification click:',
      event.action
    );

    event.notification.close();


    // ------------------------------------------------------------
    // Tombol TUTUP
    // ------------------------------------------------------------
    if (event.action === 'tutup') {
      return;
    }


    // ------------------------------------------------------------
    // Ambil URL
    // ------------------------------------------------------------
    var targetUrl =
      event.notification &&
      event.notification.data &&
      event.notification.data.url
        ? event.notification.data.url
        : self.location.origin + '/';


    event.waitUntil(

      (async function() {

        var clientList =
          await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
          });


        // --------------------------------------------------------
        // Cari halaman PAG Docs yang sudah terbuka
        // --------------------------------------------------------
        for (var i = 0; i < clientList.length; i++) {

          var client = clientList[i];

          if (
            client &&
            'focus' in client
          ) {

            await client.focus();

            // Kalau bisa navigate, arahkan ke URL target.
            if ('navigate' in client) {
              try {
                await client.navigate(targetUrl);
              } catch (e) {
                console.warn(
                  '[PAG SW] Gagal navigate:',
                  e
                );
              }
            }

            return;
          }
        }


        // --------------------------------------------------------
        // Kalau belum ada jendela → buka baru
        // --------------------------------------------------------
        if (self.clients.openWindow) {
          await self.clients.openWindow(targetUrl);
        }

      })()

    );
  }
);


// ================================================================
// 5. PESAN DARI HALAMAN
// ================================================================
self.addEventListener(
  'message',
  function(event) {

    if (!event.data) return;

    if (event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }

  }
);
