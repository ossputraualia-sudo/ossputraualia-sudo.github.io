/* ============================================================
 * PAG DOCS
 * SERVICE WORKER - WEB PUSH
 *
 * VERSION: PAG-PUSH-V5
 *
 * SATU-SATUNYA SISTEM NOTIFICATION:
 * Browser / OS Notification
 *
 * ============================================================ */

const PAG_SW_VERSION =
  "PAG-PUSH-V5";


const PAG_APP_URL =
  "https://ossputraualia-sudo.github.io/";


const PAG_ALLOWED_HOST =
  "ossputraualia-sudo.github.io";


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


/* ============================================================
 * INSTALL
 * ============================================================ */

self.addEventListener(
  "install",
  event => {

    event.waitUntil(
      self.skipWaiting()
    );

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


/* ============================================================
 * SAFE URL
 * ============================================================ */

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
     * Hanya HTTPS.
     */

    if (
      url.protocol !==
      "https:"
    ) {

      return PAG_APP_URL;
    }


    /*
     * Hanya domain PAG Docs.
     */

    if (
      url.hostname !==
      PAG_ALLOWED_HOST
    ) {

      return PAG_APP_URL;
    }


    return url.href;

  } catch {

    return PAG_APP_URL;
  }
}


/* ============================================================
 * BADGE
 * ============================================================ */

async function updateBadge(
  unreadCount
) {

  try {

    const count =
      Number(
        unreadCount
      );


    /*
     * Badge API tersedia di sebagian browser.
     */

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.setAppBadge ===
      "function"
    ) {

      /*
       * Ada unread.
       */

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


      /*
       * Tidak ada unread.
       */

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
    }

  } catch (error) {

    console.warn(
      "[PAG SW] Badge error:",
      error
    );
  }
}


/* ============================================================
 * CLEAR BADGE
 * ============================================================ */

async function clearBadge() {

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
 * PARSE PUSH PAYLOAD
 * ============================================================ */

function parsePushData(
  event
) {

  if (!event.data) {

    return {};
  }


  try {

    return event.data.json();

  } catch {

    try {

      return {

        body:
          event.data.text()

      };

    } catch {

      return {};
    }
  }
}


/* ============================================================
 * PUSH
 *
 * INILAH YANG MEMBUAT NOTIFICATION TETAP MUNCUL
 * SAAT PWA / HALAMAN SUDAH DITUTUP.
 * ============================================================ */

self.addEventListener(
  "push",
  event => {

    event.waitUntil(

      (async () => {

        const data =
          parsePushData(
            event
          );


        /* ----------------------------------------------------
         * TITLE
         * ---------------------------------------------------- */

        const title =
          String(
            data.title ||
            data.judul ||
            "PAG Docs"
          );


        /* ----------------------------------------------------
         * BODY
         * ---------------------------------------------------- */

        const body =
          String(
            data.body ||
            data.pesan ||
            data.message ||
            "Ada informasi baru dari PAG Docs."
          );


        /* ----------------------------------------------------
         * URL
         * ---------------------------------------------------- */

        const targetUrl =
          getSafeUrl(
            data.url ||
            data.link
          );


        /* ----------------------------------------------------
         * UNREAD
         * ---------------------------------------------------- */

        const unreadCount =
          data.unreadCount ??
          data.unread_count ??
          null;


        /* ----------------------------------------------------
         * BADGE
         * ---------------------------------------------------- */

        await updateBadge(
          unreadCount
        );


        /* ----------------------------------------------------
         * NOTIFICATION ID
         * ---------------------------------------------------- */

        const notificationId =
          String(
            data.notificationId ||
            data.notification_id ||
            (
              "pag-" +
              Date.now() +
              "-" +
              Math.random()
                .toString(36)
                .slice(2, 10)
            )
          );


        /* ----------------------------------------------------
         * NOTIFICATION OPTIONS
         * ---------------------------------------------------- */

        const options = {

          body,

          icon:
            data.icon ||
            PAG_ICON_URL,

          badge:
            data.badge ||
            PAG_BADGE_URL,


          /*
           * Setiap notifikasi memiliki ID sendiri.
           * Tidak lagi memakai satu tag global.
           */

          tag:
            notificationId,


          /*
           * Izinkan notifikasi baru
           * tetap muncul walaupun tag sama.
           */

          renotify:
            true,


          /*
           * Browser/OS menentukan suara
           * sesuai setting user.
           */

          silent:
            false,


          timestamp:
            Date.now(),


          /*
           * Data internal.
           */

          data: {

            url:
              targetUrl,

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
              action:
                "open",

              title:
                "Buka PAG Docs"
            },

            {
              action:
                "close",

              title:
                "Tutup"
            }

          ]

        };


        /* ----------------------------------------------------
         * SHOW BROWSER / OS NOTIFICATION
         *
         * INI SATU-SATUNYA BANNER.
         * ---------------------------------------------------- */

        await self.registration
          .showNotification(
            title,
            options
          );


        console.log(
          "[PAG SW] Notification shown:",
          title
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

    event.notification.close();


    /*
     * Tombol TUTUP.
     */

    if (
      event.action ===
      "close"
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


        /*
         * Cari PAG Docs yang masih terbuka.
         */

        const clients =
          await self.clients.matchAll({

            type:
              "window",

            includeUncontrolled:
              true
          });


        /*
         * Kalau ada,
         * fokuskan.
         */

        for (
          const client
          of clients
        ) {

          try {

            const clientUrl =
              new URL(
                client.url
              );


            if (
              clientUrl.hostname !==
              PAG_ALLOWED_HOST
            ) {

              continue;
            }


            if (
              "focus" in client
            ) {

              await client.focus();
            }


            /*
             * Navigasi ke URL tujuan
             * jika berbeda.
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
             * Beri informasi ke halaman.
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

          } catch (error) {

            console.warn(
              "[PAG SW] Client error:",
              error
            );
          }
        }


        /*
         * Tidak ada window.
         *
         * Buka PAG Docs.
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


/* ============================================================
 * NOTIFICATION CLOSE
 * ============================================================ */

self.addEventListener(
  "notificationclose",
  event => {

    console.log(
      "[PAG SW] Notification closed."
    );

  }
);


/* ============================================================
 * MESSAGE DARI INDEX.HTML
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
     * BADGE
     * -------------------------------------------------------- */

    if (
      data.type ===
      "SET_BADGE"
    ) {

      event.waitUntil(

        updateBadge(
          data.count
        )

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
        clearBadge()
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

        event.source?.postMessage({

          type:
            "PAG_SW_PONG",

          version:
            PAG_SW_VERSION

        });

      } catch {}

      return;
    }

  }
);
