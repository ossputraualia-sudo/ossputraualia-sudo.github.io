/* ============================================================
 * PAG DOCS - SERVICE WORKER
 * Web Push + Notification + Badge
 * VERSION: PAG-PUSH-V4
 * ============================================================ */

const PAG_SW_VERSION = "PAG-PUSH-V4";

const PAG_APP_URL =
  "https://ossputraualia-sudo.github.io/";

const PAG_ICON_URL =
  new URL("icon-192.png", self.location.origin).href;

const PAG_BADGE_URL =
  new URL("icon-192.png", self.location.origin).href;


/* ============================================================
 * INSTALL
 * ============================================================ */

self.addEventListener("install", event => {
  event.waitUntil(
    self.skipWaiting()
  );
});


/* ============================================================
 * ACTIVATE
 * ============================================================ */

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();

      console.log(
        "[PAG SW]",
        PAG_SW_VERSION,
        "activated"
      );
    })()
  );
});


/* ============================================================
 * SAFE URL
 * ============================================================ */

function getSafeUrl(value) {

  try {

    if (!value) {
      return PAG_APP_URL;
    }

    const url = new URL(
      value,
      PAG_APP_URL
    );

    if (url.protocol !== "https:") {
      return PAG_APP_URL;
    }

    /*
     * Batasi navigasi hanya ke domain PAG Docs.
     */
    const allowedHost =
      "ossputraualia-sudo.github.io";

    if (url.hostname !== allowedHost) {
      return PAG_APP_URL;
    }

    return url.href;

  } catch (error) {

    console.warn(
      "[PAG SW] Invalid URL:",
      error
    );

    return PAG_APP_URL;
  }
}


/* ============================================================
 * BADGE
 *
 * Badge adalah fitur tambahan.
 * Tidak semua browser mendukung badge dari Service Worker.
 * Karena itu error tidak boleh menghentikan notification.
 * ============================================================ */

async function updateAppBadge(unreadCount) {

  try {

    const count =
      Number(unreadCount);

    /*
     * Beberapa browser menyediakan
     * setAppBadge pada WorkerNavigator.
     */

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.setAppBadge === "function"
    ) {

      if (
        Number.isFinite(count) &&
        count > 0
      ) {

        await navigator.setAppBadge(
          Math.min(
            Math.floor(count),
            999
          )
        );

        return;
      }

      if (
        Number.isFinite(count) &&
        count === 0
      ) {

        if (
          typeof navigator.clearAppBadge ===
          "function"
        ) {

          await navigator.clearAppBadge();
        }

        return;
      }

      await navigator.setAppBadge();

      return;
    }

  } catch (error) {

    console.warn(
      "[PAG SW] Badge unavailable:",
      error
    );
  }
}


async function clearAppBadge() {

  try {

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.clearAppBadge ===
      "function"
    ) {

      await navigator.clearAppBadge();
    }

  } catch (error) {

    console.warn(
      "[PAG SW] Clear badge error:",
      error
    );
  }
}


/* ============================================================
 * NORMALIZE PUSH DATA
 * ============================================================ */

async function getPushData(event) {

  if (!event.data) {
    return {};
  }

  try {

    return event.data.json();

  } catch (error) {

    try {

      return {
        body: event.data.text()
      };

    } catch {

      return {};
    }
  }
}


/* ============================================================
 * PUSH EVENT
 *
 * INI YANG BEKERJA SAAT APLIKASI BENAR-BENAR DITUTUP.
 * ============================================================ */

self.addEventListener("push", event => {

  event.waitUntil(
    (async () => {

      const data =
        await getPushData(event);


      /* ------------------------------------------------------
       * DATA NOTIFICATION
       * ------------------------------------------------------ */

      const title =
        data.title ||
        data.judul ||
        "PAG Docs";


      const body =
        data.body ||
        data.pesan ||
        data.message ||
        "Ada informasi baru dari PAG Docs.";


      const targetUrl =
        getSafeUrl(
          data.url ||
          data.link ||
          PAG_APP_URL
        );


      const unreadCount =
        data.unreadCount ??
        data.unread_count ??
        null;


      /* ------------------------------------------------------
       * UPDATE BADGE
       * ------------------------------------------------------ */

      await updateAppBadge(
        unreadCount
      );


      /* ------------------------------------------------------
       * UNIQUE NOTIFICATION ID
       *
       * Jika Edge Function mengirim notificationId,
       * gunakan itu sebagai tag.
       * ------------------------------------------------------ */

      const notificationId =
        data.notificationId ||
        data.notification_id ||
        (
          "pag-" +
          Date.now() +
          "-" +
          Math.random()
            .toString(36)
            .slice(2, 8)
        );


      /* ------------------------------------------------------
       * NOTIFICATION OPTIONS
       * ------------------------------------------------------ */

      const notificationOptions = {

        body: body,

        icon:
          data.icon ||
          PAG_ICON_URL,

        badge:
          data.badge ||
          PAG_BADGE_URL,

        /*
         * Jangan memakai satu tag global.
         * Setiap push bisa mempunyai notifikasi sendiri.
         */
        tag:
          String(notificationId),

        /*
         * Browser boleh menampilkan kembali
         * notification walaupun tag sama.
         */
        renotify: true,

        /*
         * Tidak membungkam notification.
         */
        silent: false,

        /*
         * Timestamp notification.
         */
        timestamp: Date.now(),

        /*
         * Android/browser tertentu mendukung vibrate.
         */
        vibrate: [
          200,
          100,
          200
        ],

        /*
         * Data yang ikut notification.
         */
        data: {

          url: targetUrl,

          notificationId:
            notificationId,

          unreadCount:
            unreadCount,

          source:
            "PAG_DOCS"
        },

        /*
         * Action.
         */
        actions: [
          {
            action: "open",
            title: "Buka PAG Docs"
          },
          {
            action: "tutup",
            title: "Tutup"
          }
        ]
      };


      /* ------------------------------------------------------
       * TAMPILKAN NOTIFICATION
       *
       * Ini tetap berjalan walaupun:
       * - tab ditutup
       * - browser window ditutup
       * - PWA ditutup
       * ------------------------------------------------------ */

      await self.registration.showNotification(
        title,
        notificationOptions
      );


      console.log(
        "[PAG SW] PUSH RECEIVED:",
        title,
        data
      );

    })()
  );
});


/* ============================================================
 * NOTIFICATION CLICK
 * ============================================================ */

self.addEventListener(
  "notificationclick",
  event => {

    event.notification.close();


    /*
     * Tombol Tutup
     */
    if (
      event.action ===
      "tutup"
    ) {

      return;
    }


    event.waitUntil(
      (async () => {

        const notificationData =
          event.notification?.data ||
          {};


        const targetUrl =
          getSafeUrl(
            notificationData.url
          );


        /* ----------------------------------------------------
         * CARI WINDOW PAG DOCS YANG SUDAH TERBUKA
         * ---------------------------------------------------- */

        const clients =
          await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true
          });


        /*
         * Jika ada PAG Docs yang terbuka,
         * fokuskan window tersebut.
         */

        for (const client of clients) {

          try {

            /*
             * Prioritaskan domain PAG Docs.
             */
            const clientUrl =
              new URL(
                client.url
              );


            if (
              clientUrl.origin ===
              new URL(
                PAG_APP_URL
              ).origin
            ) {

              if (
                "focus" in client
              ) {

                await client.focus();
              }


              /*
               * Jika URL berbeda,
               * navigasikan ke target.
               */
              if (
                client.url !==
                targetUrl &&
                "navigate" in client
              ) {

                await client.navigate(
                  targetUrl
                );
              }


              /*
               * Beri tahu halaman bahwa
               * notification dibuka.
               */

              try {

                client.postMessage({

                  type:
                    "PAG_NOTIFICATION_OPENED",

                  notificationId:
                    notificationData
                      .notificationId ||
                    null,

                  unreadCount:
                    notificationData
                      .unreadCount ??
                    null
                });

              } catch {}


              return;
            }

          } catch (error) {

            console.warn(
              "[PAG SW] Existing client error:",
              error
            );
          }
        }


        /* ----------------------------------------------------
         * TIDAK ADA WINDOW
         *
         * BUKA PAG DOCS BARU.
         * ---------------------------------------------------- */

        if (
          self.clients.openWindow
        ) {

          await self.clients.openWindow(
            targetUrl
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

    console.log(
      "[PAG SW] Notification closed"
    );
  }
);


/* ============================================================
 * MESSAGE FROM INDEX.HTML
 * ============================================================ */

self.addEventListener(
  "message",
  event => {

    const data =
      event.data ||
      {};


    /* --------------------------------------------------------
     * SKIP WAITING
     * -------------------------------------------------------- */

    if (
      data.type ===
      "SKIP_WAITING"
    ) {

      event.waitUntil(
        self.skipWaiting()
      );

      return;
    }


    /* --------------------------------------------------------
     * CLEAR BADGE
     * -------------------------------------------------------- */

    if (
      data.type ===
      "CLEAR_BADGE"
    ) {

      event.waitUntil(
        clearAppBadge()
      );

      return;
    }


    /* --------------------------------------------------------
     * SET BADGE
     * -------------------------------------------------------- */

    if (
      data.type ===
      "SET_BADGE"
    ) {

      event.waitUntil(
        updateAppBadge(
          data.count
        )
      );

      return;
    }


    /* --------------------------------------------------------
     * PING
     * -------------------------------------------------------- */

    if (
      data.type ===
      "PAG_SW_PING"
    ) {

      try {

        if (
          event.source &&
          event.source.postMessage
        ) {

          event.source.postMessage({

            type:
              "PAG_SW_PONG",

            version:
              PAG_SW_VERSION
          });
        }

      } catch (error) {

        console.warn(
          "[PAG SW] Ping error:",
          error
        );
      }

      return;
    }
  }
);
