/* ============================================================
 * PAG DOCS — SERVICE WORKER
 * VERSION: PAG-PUSH-V6
 *
 * Fungsi:
 * 1. Menerima Web Push
 * 2. Menampilkan SATU-SATUNYA banner: native browser/OS
 * 3. Tetap bekerja ketika tab/app ditutup
 * 4. Menangani klik notification
 * 5. Menangani app badge jika browser mendukung
 * 6. Tidak menggunakan polling
 * 7. Tidak menggunakan HTML notification banner
 * ============================================================ */

const SW_VERSION = "PAG-PUSH-V6";

const APP_ORIGIN =
  "https://ossputraualia-sudo.github.io";

const APP_URL =
  APP_ORIGIN + "/";

const MAX_BADGE = 999;


/* ============================================================
 * LOG
 * ============================================================ */

function log(...args) {
  console.log("[PAG SW]", ...args);
}


/* ============================================================
 * SAFE NUMBER
 * ============================================================ */

function safeNumber(value, fallback = 0) {

  const n = Number(value);

  if (!Number.isFinite(n)) {
    return fallback;
  }

  if (n < 0) {
    return 0;
  }

  return Math.min(
    Math.floor(n),
    MAX_BADGE
  );
}


/* ============================================================
 * SAFE URL
 * ============================================================ */

function safeUrl(value) {

  try {

    const raw =
      String(value || APP_URL);

    const url =
      new URL(raw, APP_URL);

    /*
     * Hanya izinkan HTTPS
     * dan domain GitHub Pages PAG Docs.
     */

    if (url.protocol !== "https:") {
      return APP_URL;
    }

    if (url.origin !== APP_ORIGIN) {
      return APP_URL;
    }

    return url.href;

  } catch (error) {

    return APP_URL;

  }

}


/* ============================================================
 * APP BADGE
 * ============================================================ */

async function setAppBadge(count) {

  const badge =
    safeNumber(count);

  try {

    /*
     * Badging API pada Service Worker.
     */

    if (
      typeof navigator.setAppBadge ===
      "function"
    ) {

      if (badge > 0) {

        await navigator.setAppBadge(
          badge
        );

      } else {

        if (
          typeof navigator.clearAppBadge ===
          "function"
        ) {

          await navigator.clearAppBadge();

        }

      }

    }

  } catch (error) {

    log(
      "Badge tidak tersedia:",
      error
    );

  }

}


/* ============================================================
 * INSTALL
 * ============================================================ */

self.addEventListener(
  "install",
  event => {

    log(
      "Install:",
      SW_VERSION
    );

    /*
     * Jangan menunggu tab lama.
     */

    self.skipWaiting();

  }
);


/* ============================================================
 * ACTIVATE
 * ============================================================ */

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      (async () => {

        /*
         * Service Worker langsung mengambil
         * kontrol terhadap halaman.
         */

        await self.clients.claim();

        log(
          "Activated:",
          SW_VERSION
        );

      })()

    );

  }
);


/* ============================================================
 * PUSH
 *
 * INI ADALAH JALUR UTAMA NOTIFIKASI.
 *
 * Event push tetap bisa membangunkan Service Worker
 * meskipun halaman PAG Docs tidak sedang terbuka.
 * ============================================================ */

self.addEventListener(
  "push",
  event => {

    event.waitUntil(

      (async () => {

        let data = {};

        /*
         * Baca payload JSON.
         */

        try {

          if (event.data) {

            data =
              event.data.json();

          }

        } catch (error) {

          /*
           * Fallback jika payload bukan JSON.
           */

          try {

            data = {
              body:
                event.data?.text() || ""
            };

          } catch (_) {

            data = {};

          }

        }


        /* ----------------------------------------------------
         * DATA NOTIFIKASI
         * ---------------------------------------------------- */

        const title =
          String(
            data.title ??
            data.judul ??
            "PAG Docs"
          );


        const body =
          String(
            data.body ??
            data.message ??
            data.pesan ??
            "Ada pemberitahuan baru."
          );


        const url =
          safeUrl(
            data.url ??
            data.link ??
            "/"
          );


        const notificationId =
          String(
            data.notificationId ??
            data.id ??
            crypto.randomUUID()
          );


        const unreadCount =
          safeNumber(
            data.unreadCount ??
            data.unread ??
            data.badge ??
            0
          );


        /* ----------------------------------------------------
         * UPDATE BADGE
         * ---------------------------------------------------- */

        await setAppBadge(
          unreadCount
        );


        /* ----------------------------------------------------
         * NATIVE NOTIFICATION
         *
         * INILAH SATU-SATUNYA BANNER.
         * Tidak ada banner HTML.
         * ---------------------------------------------------- */

        const notificationOptions = {

          body,

          icon:
            "/icon-192.png",

          badge:
            "/icon-192.png",

          /*
           * Setiap notification memiliki tag sendiri
           * agar notification berbeda tidak saling
           * menimpa.
           */

          tag:
            "pag-docs-" +
            notificationId,

          /*
           * Notification baru tetap diberitahukan
           * meskipun tag sebelumnya sama.
           */

          renotify: true,

          /*
           * Data untuk notificationclick.
           */

          data: {

            url,

            notificationId,

            unreadCount

          },

          actions: [

            {
              action: "open",
              title: "Buka PAG Docs"
            },

            {
              action: "close",
              title: "Tutup"
            }

          ]

        };


        await self.registration.showNotification(
          title,
          notificationOptions
        );


        log(
          "Notification shown:",
          title,
          "badge=",
          unreadCount
        );


      })()

    );

  }
);


/* ============================================================
 * NOTIFICATION CLICK
 * ============================================================ */

self.addEventListener(
  "notificationclick",
  event => {

    /*
     * Tutup notification.
     */

    event.notification.close();


    /*
     * Jika tombol Tutup.
     */

    if (
      event.action === "close"
    ) {

      return;

    }


    event.waitUntil(

      (async () => {

        const target =
          safeUrl(
            event.notification?.data?.url ||
            APP_URL
          );


        /*
         * Cari window PAG Docs yang sudah ada.
         */

        const clientsList =
          await self.clients.matchAll({

            type: "window",

            includeUncontrolled: true

          });


        for (
          const client of clientsList
        ) {

          try {

            /*
             * Kalau sudah ada PAG Docs,
             * fokuskan window tersebut.
             */

            if (
              "focus" in client
            ) {

              if (
                "navigate" in client &&
                client.url !== target
              ) {

                await client.navigate(
                  target
                );

              }

              await client.focus();

              return;

            }

          } catch (error) {

            log(
              "Focus client gagal:",
              error
            );

          }

        }


        /*
         * Kalau belum ada window,
         * buka PAG Docs baru.
         */

        if (
          self.clients.openWindow
        ) {

          await self.clients.openWindow(
            target
          );

        }

      })()

    );

  }
);


/* ============================================================
 * NOTIFICATION CLOSE
 * ============================================================ */

self.addEventListener(
  "notificationclose",
  event => {

    log(
      "Notification closed:",
      event.notification?.title ||
      ""
    );

  }
);


/* ============================================================
 * MESSAGE DARI index.html
 * ============================================================ */

self.addEventListener(
  "message",
  event => {

    const data =
      event.data || {};


    /*
     * Paksa SW baru aktif.
     */

    if (
      data.type ===
      "SKIP_WAITING"
    ) {

      self.skipWaiting();

      return;

    }


    /*
     * Set badge.
     */

    if (
      data.type ===
      "SET_APP_BADGE"
    ) {

      event.waitUntil(

        setAppBadge(
          data.count
        )

      );

      return;

    }


    /*
     * Clear badge.
     */

    if (
      data.type ===
      "CLEAR_APP_BADGE"
    ) {

      event.waitUntil(

        setAppBadge(0)

      );

      return;

    }


    /*
     * Ping untuk diagnosis.
     */

    if (
      data.type ===
      "PAG_SW_PING"
    ) {

      try {

        event.ports?.[0]?.postMessage({

          ok: true,

          version:
            SW_VERSION

        });

      } catch (_) {}

    }

  }
);


/* ============================================================
 * START LOG
 * ============================================================ */

log(
  "Loaded:",
  SW_VERSION
);
