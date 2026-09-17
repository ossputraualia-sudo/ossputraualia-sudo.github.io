/* ==========================================================
 * PAG DOCS SERVICE WORKER
 *
 * PAG-PUSH-V3
 *
 * Fungsi:
 * 1. Web Push
 * 2. Notification
 * 3. Notification Click
 * 4. App Badge
 * 5. Clear Badge
 *
 * TIDAK ADA:
 * - Supabase key
 * - Service role
 * - Edge Function
 * - database access
 *
 * Service Worker hanya menangani sisi browser/device.
 * ========================================================== */


const PAG_SW_VERSION =
  "PAG-PUSH-V3";


const PAG_APP_URL =
  "https://ossputraualia-sudo.github.io/";


const PAG_ICON_URL =
  new URL(
    "icon-192.png",
    self.location.origin
  ).href;


const PAG_BADGE_URL =
  new URL(
    "icon-192.png",
    self.location.origin
  ).href;


/* ==========================================================
 * INSTALL
 * ========================================================== */

self.addEventListener(
  "install",
  event => {

    event.waitUntil(
      self.skipWaiting()
    );

  }
);


/* ==========================================================
 * ACTIVATE
 * ========================================================== */

self.addEventListener(
  "activate",
  event => {

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

  }
);


/* ==========================================================
 * SAFE URL
 * ========================================================== */

function getSafeUrl(
  value
) {

  try {

    if (!value) {

      return PAG_APP_URL;

    }


    const url =
      new URL(
        value,
        PAG_APP_URL
      );


    /*
     * Hanya izinkan HTTPS.
     */

    if (
      url.protocol !==
      "https:"
    ) {

      return PAG_APP_URL;

    }


    return url.href;

  } catch {

    return PAG_APP_URL;

  }

}


/* ==========================================================
 * UPDATE APP BADGE
 *
 * unreadCount:
 *
 * 5
 * → badge 5
 *
 * 1
 * → badge 1
 *
 * 0
 * → clear
 *
 * null / undefined
 * → badge generic
 * ========================================================== */

async function updateAppBadge(
  unreadCount
) {

  try {

    if (
      typeof self.navigator.setAppBadge !==
      "function"
    ) {

      return;

    }


    const count =
      Number(
        unreadCount
      );


    /*
     * Ada angka
     */

    if (
      Number.isFinite(count) &&
      count > 0
    ) {

      await self.navigator.setAppBadge(

        Math.min(
          Math.floor(count),
          999
        )

      );

      return;

    }


    /*
     * Nol
     */

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
     *
     * Tetap tampilkan badge generik.
     */

    await self.navigator.setAppBadge();

  } catch (error) {

    console.warn(
      "[PAG SW] Badge error:",
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
      typeof self.navigator.clearAppBadge ===
      "function"
    ) {

      await self.navigator.clearAppBadge();

    }

  } catch (error) {

    console.warn(
      "[PAG SW] Clear badge error:",
      error
    );

  }

}


/* ==========================================================
 * PUSH EVENT
 * ========================================================== */

self.addEventListener(
  "push",
  event => {

    event.waitUntil(

      (async () => {

        let data = {};


        /* --------------------------------------------------
           PARSE PAYLOAD
           -------------------------------------------------- */

        try {

          if (
            event.data
          ) {

            try {

              data =
                event.data.json();

            } catch {

              data = {

                pesan:
                  event.data.text()

              };

            }

          }

        } catch (error) {

          console.warn(
            "[PAG SW] Payload parse error:",
            error
          );

        }


        /* --------------------------------------------------
           TITLE
           -------------------------------------------------- */

        const title =
          data.judul ||
          data.title ||
          "PAG Docs";


        /* --------------------------------------------------
           BODY
           -------------------------------------------------- */

        const body =
          data.pesan ||
          data.body ||
          data.message ||
          "Ada informasi baru dari PAG Docs.";


        /* --------------------------------------------------
           TARGET
           -------------------------------------------------- */

        const targetUrl =
          getSafeUrl(

            data.url ||
            data.link ||
            PAG_APP_URL

          );


        /* --------------------------------------------------
           BADGE
           -------------------------------------------------- */

        await updateAppBadge(
          data.unreadCount
        );


        /* --------------------------------------------------
           NOTIFICATION OPTIONS
           -------------------------------------------------- */

        const notificationOptions = {

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

          renotify:
            true,

          requireInteraction:
            true,

          silent:
            false,

          timestamp:
            Date.now(),

          vibrate: [
            200,
            100,
            200
          ],

          data: {

            url:
              targetUrl,

            source:
              "PAG_DOCS",

            unreadCount:
              data.unreadCount ??
              null

          },

          actions: [

            {
              action:
                "tutup",

              title:
                "Tutup"

            }

          ]

        };


        /* --------------------------------------------------
           SHOW NOTIFICATION
           -------------------------------------------------- */

        await self.registration.showNotification(

          title,

          notificationOptions

        );


        console.log(
          "[PAG SW] Push received:",
          title
        );

      })()

    );

  }
);


/* ==========================================================
 * NOTIFICATION CLICK
 * ========================================================== */

self.addEventListener(
  "notificationclick",
  event => {

    /*
     * Tutup notification terlebih dahulu.
     */

    event.notification.close();


    /*
     * Action "Tutup".
     */

    if (
      event.action ===
      "tutup"
    ) {

      return;

    }


    event.waitUntil(

      (async () => {

        const rawUrl =
          event.notification?.data?.url ||
          PAG_APP_URL;


        const targetUrl =
          getSafeUrl(
            rawUrl
          );


        /* --------------------------------------------------
           CARI WINDOW PAG DOCS
           -------------------------------------------------- */

        const clientList =
          await self.clients.matchAll({

            type:
              "window",

            includeUncontrolled:
              true

          });


        /* --------------------------------------------------
           FOCUS / NAVIGATE EXISTING WINDOW
           -------------------------------------------------- */

        for (
          const client of clientList
        ) {

          try {

            /*
             * Fokus window.
             */

            if (
              "focus" in client
            ) {

              await client.focus();

            }


            /*
             * Kalau sudah berada di target,
             * tidak perlu navigate lagi.
             */

            if (
              client.url ===
              targetUrl
            ) {

              return;

            }


            /*
             * Navigate jika tersedia.
             */

            if (
              "navigate" in client
            ) {

              await client.navigate(
                targetUrl
              );

              return;

            }

          } catch (error) {

            console.warn(
              "[PAG SW] Existing client error:",
              error
            );

          }

        }


        /* --------------------------------------------------
           BUKA WINDOW BARU
           -------------------------------------------------- */

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
 * MESSAGE FROM PAGE
 * ========================================================== */

self.addEventListener(
  "message",
  event => {

    const data =
      event.data || {};


    /* ------------------------------------------------------
       SKIP WAITING
       ------------------------------------------------------ */

    if (
      data.type ===
      "SKIP_WAITING"
    ) {

      event.waitUntil(
        self.skipWaiting()
      );

      return;

    }


    /* ------------------------------------------------------
       CLEAR BADGE
       ------------------------------------------------------ */

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
       SET BADGE
       ------------------------------------------------------ */

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
       PING
       ------------------------------------------------------ */

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
          "[PAG SW] Ping response error:",
          error
        );

      }

    }

  }
);
