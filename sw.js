/* ==========================================================
 * PAG DOCS SERVICE WORKER
 * Push Notification + Badge + Notification Click
 * Version: PAG-PUSH-V3
 * ========================================================== */

const PAG_SW_VERSION = "PAG-PUSH-V3";

const PAG_APP_URL =
  "https://ossputraualia-sudo.github.io/";

const PAG_ICON_URL =
  new URL("icon-192.png", self.location.origin).href;

const PAG_BADGE_URL =
  new URL("icon-192.png", self.location.origin).href;


/* ==========================================================
 * INSTALL
 * ========================================================== */

self.addEventListener("install", event => {

  event.waitUntil(
    self.skipWaiting()
  );

});


/* ==========================================================
 * ACTIVATE
 * ========================================================== */

self.addEventListener("activate", event => {

  event.waitUntil(
    (async () => {

      await self.clients.claim();

      console.log(
        "[PAG SW] Activated:",
        PAG_SW_VERSION
      );

    })()
  );

});


/* ==========================================================
 * HELPER
 * ========================================================== */

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

    return url.href;

  } catch (error) {

    return PAG_APP_URL;

  }

}


/* ==========================================================
 * SET BADGE
 *
 * unreadCount > 0
 * → angka badge
 *
 * unreadCount kosong
 * → badge titik/generic
 *
 * unreadCount = 0
 * → clear badge
 * ========================================================== */

async function updateAppBadge(unreadCount) {

  try {

    if (
      !self.navigator ||
      typeof self.navigator.setAppBadge !== "function"
    ) {
      return;
    }


    const count = Number(unreadCount);


    if (
      Number.isFinite(count) &&
      count > 0
    ) {

      await self.navigator.setAppBadge(
        Math.min(Math.floor(count), 999)
      );

      return;
    }


    if (
      Number.isFinite(count) &&
      count === 0
    ) {

      if (
        typeof self.navigator.clearAppBadge ===
        "function"
      ) {

        await self.navigator.clearAppBadge();

      }

      return;
    }


    /*
     * Tidak ada angka.
     * Tampilkan badge generik.
     */

    await self.navigator.setAppBadge();

  } catch (error) {

    console.warn(
      "[PAG SW] Badge gagal:",
      error
    );

  }

}


/* ==========================================================
 * CLEAR BADGE
 * ========================================================== */

async function clearAppBadge() {

  try {

    if (
      self.navigator &&
      typeof self.navigator.clearAppBadge ===
      "function"
    ) {

      await self.navigator.clearAppBadge();

    }

  } catch (error) {

    console.warn(
      "[PAG SW] Clear badge gagal:",
      error
    );

  }

}


/* ==========================================================
 * PUSH RECEIVED
 * ========================================================== */

self.addEventListener("push", event => {

  event.waitUntil(

    (async () => {

      let data = {};


      /* ------------------------------------------------------
       * PARSE PAYLOAD
       * ------------------------------------------------------ */

      try {

        if (event.data) {

          try {

            data = event.data.json();

          } catch {

            data = {
              pesan: event.data.text()
            };

          }

        }

      } catch (error) {

        console.warn(
          "[PAG SW] Payload error:",
          error
        );

      }


      /* ------------------------------------------------------
       * CONTENT
       * ------------------------------------------------------ */

      const title =
        data.judul ||
        data.title ||
        "PAG Docs";


      const body =
        data.pesan ||
        data.body ||
        data.message ||
        "Ada informasi baru.";


      const targetUrl =
        getSafeUrl(
          data.url ||
          data.link ||
          PAG_APP_URL
        );


      /* ------------------------------------------------------
       * BADGE
       * ------------------------------------------------------ */

      await updateAppBadge(
        data.unreadCount
      );


      /* ------------------------------------------------------
       * NOTIFICATION OPTIONS
       * ------------------------------------------------------ */

      const options = {

        body,

        icon:
          data.icon ||
          PAG_ICON_URL,

        badge:
          data.badge ||
          PAG_BADGE_URL,

        tag:
          data.tag ||
          "pag-docs-notification",

        renotify: true,

        requireInteraction: true,

        silent: false,

        timestamp:
          Date.now(),

        vibrate: [
          200,
          100,
          200
        ],

        data: {

          url: targetUrl,

          source:
            "PAG_DOCS",

          unreadCount:
            data.unreadCount ?? null

        },

        actions: [

          {
            action: "tutup",
            title: "Tutup"
          }

        ]

      };


      /* ------------------------------------------------------
       * SHOW NOTIFICATION
       * ------------------------------------------------------ */

      await self.registration.showNotification(
        title,
        options
      );


    })()

  );

});


/* ==========================================================
 * NOTIFICATION CLICK
 * ========================================================== */

self.addEventListener(
  "notificationclick",
  event => {

    event.notification.close();


    if (
      event.action === "tutup"
    ) {

      return;

    }


    event.waitUntil(

      (async () => {

        const rawUrl =
          event.notification?.data?.url ||
          PAG_APP_URL;


        const targetUrl =
          getSafeUrl(rawUrl);


        const clientList =
          await self.clients.matchAll({

            type: "window",

            includeUncontrolled: true

          });


        /*
         * Cari PAG Docs yang sudah terbuka
         */

        for (
          const client of clientList
        ) {

          try {

            if (
              "focus" in client
            ) {

              await client.focus();

            }


            if (
              client.url !== targetUrl &&
              "navigate" in client
            ) {

              await client.navigate(
                targetUrl
              );

            }


            return;

          } catch (error) {

            console.warn(
              "[PAG SW] Navigate error:",
              error
            );

          }

        }


        /*
         * Kalau belum ada window,
         * buka PAG Docs.
         */

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


/* ==========================================================
 * MESSAGE
 * ========================================================== */

self.addEventListener(
  "message",
  event => {

    const data =
      event.data || {};


    /* ------------------------------------------------------
     * UPDATE SERVICE WORKER
     * ------------------------------------------------------ */

    if (
      data.type ===
      "SKIP_WAITING"
    ) {

      self.skipWaiting();

      return;

    }


    /* ------------------------------------------------------
     * CLEAR BADGE
     * ------------------------------------------------------ */

    if (
      data.type ===
      "CLEAR_BADGE"
    ) {

      event.waitUntil(
        clearAppBadge()
      );

      return;

    }


    /* ------------------------------------------------------
     * SET BADGE
     * ------------------------------------------------------ */

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


    /* ------------------------------------------------------
     * SERVICE WORKER PING
     * ------------------------------------------------------ */

    if (
      data.type ===
      "PAG_SW_PING"
    ) {

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

    }

  }
);
