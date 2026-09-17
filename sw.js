/* =========================================================
   PAG DOCS
   SERVICE WORKER
   WEB PUSH ONLY

   FILE:
   /sw.js

   TANGGUNG JAWAB:

   1. Install
   2. Activate
   3. Receive Push
   4. Show Notification
   5. Handle Notification Click

   TIDAK ADA:
   - Supabase REST
   - Supabase Edge Function
   - VAPID private key
   - service_role key
   - database logic
   ========================================================= */

"use strict";


/* =========================================================
   CONFIG
   ========================================================= */

const PAG_APP_URL =
  "https://ossputraualia-sudo.github.io/";


const PAG_ICON_URL =
  new URL(
    "icon-192.png",
    self.location.origin
  ).href;


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener(
  "install",
  function(event) {

    console.log(
      "[PAG SW] Install"
    );


    /*
     * Aktifkan versi baru segera.
     */

    event.waitUntil(
      self.skipWaiting()
    );

  }
);


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener(
  "activate",
  function(event) {

    console.log(
      "[PAG SW] Activate"
    );


    event.waitUntil(

      (async function() {

        /*
         * Ambil kontrol semua client.
         */

        await self.clients.claim();

      })()

    );

  }
);


/* =========================================================
   PUSH
   ========================================================= */

self.addEventListener(
  "push",
  function(event) {

    console.log(
      "[PAG SW] PUSH diterima."
    );


    event.waitUntil(

      (async function() {

        let data =
          {};


        /* =================================================
           PARSE PAYLOAD
           ================================================= */

        if (event.data) {

          try {

            data =
              event.data.json();

          } catch (jsonError) {

            try {

              data = {

                title:
                  "🔔 P.A.G Docs",

                body:
                  event.data.text()

              };

            } catch (textError) {

              data =
                {};

            }

          }

        }


        /* =================================================
           TITLE
           ================================================= */

        const title =
          data?.title ||
          data?.judul ||
          "🔔 P.A.G Docs";


        /* =================================================
           BODY
           ================================================= */

        const body =
          data?.body ||
          data?.pesan ||
          data?.message ||
          "Ada pemberitahuan baru dari P.A.G Docs.";


        /* =================================================
           TARGET URL
           ================================================= */

        const rawUrl =
          data?.url ||
          data?.link ||
          PAG_APP_URL;


        let targetUrl;


        try {

          const parsed =
            new URL(
              rawUrl,
              PAG_APP_URL
            );


          /*
           * Hanya izinkan HTTPS.
           */

          if (
            parsed.protocol ===
            "https:"
          ) {

            targetUrl =
              parsed.href;

          } else {

            targetUrl =
              PAG_APP_URL;

          }

        } catch (error) {

          targetUrl =
            PAG_APP_URL;

        }


        /* =================================================
           NOTIFICATION OPTIONS
           ================================================= */

        const options = {

          body:
            String(body),

          icon:
            PAG_ICON_URL,

          badge:
            PAG_ICON_URL,

          /*
           * Gunakan tag stabil.
           *
           * Browser dapat mengganti notification
           * lama jika event yang sama dikirim ulang.
           */

          tag:
            "pag-docs-notification",

          /*
           * Notifikasi baru tetap memberi perhatian.
           */

          renotify:
            true,

          requireInteraction:
            true,

          silent:
            false,

          timestamp:
            Date.now(),

          /*
           * Vibrate hanya jika browser mendukungnya.
           */

          vibrate:
            [200, 100, 200],

          data: {

            url:
              targetUrl,

            source:
              "PAG_DOCS"

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


        /* =================================================
           SHOW
           ================================================= */

        await self.registration.showNotification(
          title,
          options
        );


        console.log(
          "[PAG SW] Notification ditampilkan."
        );

      })()

    );

  }
);


/* =========================================================
   NOTIFICATION CLICK
   ========================================================= */

self.addEventListener(
  "notificationclick",
  function(event) {

    console.log(
      "[PAG SW] Notification click:",
      event.action
    );


    /*
     * Tutup notification.
     */

    event.notification.close();


    /*
     * Tombol Tutup.
     */

    if (
      event.action ===
      "tutup"
    ) {

      return;

    }


    event.waitUntil(

      (async function() {

        /* =================================================
           TARGET
           ================================================= */

        let targetUrl =
          PAG_APP_URL;


        try {

          const storedUrl =
            event
              .notification
              ?.data
              ?.url;


          if (storedUrl) {

            const parsed =
              new URL(
                storedUrl,
                PAG_APP_URL
              );


            /*
             * Hanya HTTPS.
             */

            if (
              parsed.protocol ===
              "https:"
            ) {

              targetUrl =
                parsed.href;

            }

          }

        } catch (error) {

          console.warn(
            "[PAG SW] Target URL tidak valid:",
            error
          );

        }


        /* =================================================
           CLIENT WINDOWS
           ================================================= */

        const clientList =
          await self.clients.matchAll(

            {

              type:
                "window",

              includeUncontrolled:
                true

            }

          );


        /*
         * Cari aplikasi PAG Docs yang sudah terbuka.
         */

        for (
          const client of clientList
        ) {

          if (!client) {

            continue;
          }


          /*
           * Focus terlebih dahulu.
           */

          if (
            "focus" in client
          ) {

            try {

              await client.focus();

            } catch (error) {

              console.warn(
                "[PAG SW] Focus gagal:",
                error
              );

            }

          }


          /*
           * Jika target sama dengan halaman
           * yang sedang dibuka, tidak perlu navigate.
           */

          try {

            const current =
              new URL(
                client.url
              );


            const target =
              new URL(
                targetUrl
              );


            if (
              current.href ===
              target.href
            ) {

              return;

            }

          } catch (error) {

            /*
             * Abaikan perbandingan URL.
             */

          }


          /*
           * Navigate hanya jika tersedia.
           */

          if (
            "navigate" in client
          ) {

            try {

              await client.navigate(
                targetUrl
              );

              return;

            } catch (error) {

              console.warn(
                "[PAG SW] Navigate gagal:",
                error
              );

            }

          }

        }


        /* =================================================
           TIDAK ADA CLIENT
           ================================================= */

        if (
          "openWindow" in self.clients
        ) {

          try {

            await self.clients.openWindow(
              targetUrl
            );

          } catch (error) {

            console.error(
              "[PAG SW] openWindow gagal:",
              error
            );

          }

        }

      })()

    );

  }
);


/* =========================================================
   MESSAGE
   ========================================================= */

self.addEventListener(
  "message",
  function(event) {

    if (!event.data) {

      return;
    }


    /*
     * Optional manual activation.
     */

    if (
      event.data.type ===
      "SKIP_WAITING"
    ) {

      self.skipWaiting();

      return;
    }


    /*
     * Health check dari halaman.
     */

    if (
      event.data.type ===
      "PAG_SW_PING"
    ) {

      try {

        event.source?.postMessage({

          type:
            "PAG_SW_PONG",

          version:
            "pag-push-v2"

        });

      } catch (error) {

        console.warn(
          "[PAG SW] PONG gagal:",
          error
        );

      }

    }

  }
);
