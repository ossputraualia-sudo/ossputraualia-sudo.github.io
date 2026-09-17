/* =========================================================
   PAG DOCS
   SERVICE WORKER
   WEB PUSH ONLY

   FILE:
   /sw.js

   PENTING:
   File ini berjalan di browser.
   Jangan memasukkan kode Supabase Edge Function di sini.
   ========================================================= */

"use strict";


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
     * Langsung aktif.
     */

    self.skipWaiting();

  }
);


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener(
  "activate",
  function(event) {

    event.waitUntil(

      (async function() {

        console.log(
          "[PAG SW] Activate"
        );


        /*
         * Ambil kontrol seluruh client
         * tanpa perlu reload tambahan.
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


    let data = {};


    /* -----------------------------------------------------
       PARSE PAYLOAD
       ----------------------------------------------------- */

    if (event.data) {

      try {

        data =
          event.data.json();

      } catch (error) {

        try {

          data = {

            judul:
              "🔔 P.A.G Docs",

            pesan:
              event.data.text()

          };

        } catch (textError) {

          data = {};

        }

      }

    }


    /* -----------------------------------------------------
       TITLE
       ----------------------------------------------------- */

    const title =
      data.judul ||
      data.title ||
      "🔔 P.A.G Docs";


    /* -----------------------------------------------------
       BODY
       ----------------------------------------------------- */

    const body =
      data.pesan ||
      data.body ||
      data.message ||
      "Ada pemberitahuan baru dari P.A.G Docs.";


    /* -----------------------------------------------------
       URL
       ----------------------------------------------------- */

    const rawUrl =
      data.link ||
      data.url ||
      "https://ossputraualia-sudo.github.io/";


    let targetUrl;


    try {

      targetUrl =
        new URL(
          rawUrl,
          self.location.origin
        ).href;

    } catch (error) {

      targetUrl =
        self.location.origin + "/";

    }


    /* -----------------------------------------------------
       ICON
       ----------------------------------------------------- */

    let iconUrl;


    try {

      iconUrl =
        new URL(
          "icon-192.png",
          self.location.origin
        ).href;

    } catch (error) {

      iconUrl =
        "";
    }


    /* -----------------------------------------------------
       NOTIFICATION OPTIONS
       ----------------------------------------------------- */

    const options = {

      body:
        String(body),

      icon:
        iconUrl,

      badge:
        iconUrl,

      /*
       * Satu tag untuk notifikasi PAG Docs.
       *
       * Browser akan mengelola notifikasi
       * dengan lebih rapi daripada membuat tag
       * timestamp yang selalu berbeda.
       */

      tag:
        "pag-docs-notification",

      renotify:
        true,

      requireInteraction:
        true,

      silent:
        false,

      timestamp:
        Date.now(),

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


    /* -----------------------------------------------------
       SHOW NOTIFICATION
       ----------------------------------------------------- */

    event.waitUntil(

      self.registration.showNotification(
        title,
        options
      )

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
     * Action "tutup".
     */

    if (
      event.action ===
      "tutup"
    ) {

      return;
    }


    /* -----------------------------------------------------
       TARGET URL
       ----------------------------------------------------- */

    let targetUrl =
      self.location.origin + "/";


    if (
      event.notification &&
      event.notification.data &&
      event.notification.data.url
    ) {

      targetUrl =
        event.notification.data.url;

    }


    /* -----------------------------------------------------
       OPEN / FOCUS WINDOW
       ----------------------------------------------------- */

    event.waitUntil(

      (async function() {

        try {

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
           * Cari window yang sudah terbuka.
           */

          for (
            let i = 0;
            i < clientList.length;
            i++
          ) {

            const client =
              clientList[i];


            if (
              client &&
              "focus" in client
            ) {

              try {

                await client.focus();

              } catch (focusError) {

                console.warn(
                  "[PAG SW] Focus gagal:",
                  focusError
                );

              }


              /*
               * Jika bisa navigate,
               * arahkan ke target.
               */

              if (
                "navigate" in client
              ) {

                try {

                  await client.navigate(
                    targetUrl
                  );

                } catch (navigateError) {

                  console.warn(
                    "[PAG SW] Navigate gagal:",
                    navigateError
                  );

                }

              }


              return;
            }

          }


          /*
           * Tidak ada window.
           *
           * Buka baru.
           */

          if (
            self.clients.openWindow
          ) {

            await self.clients.openWindow(
              targetUrl
            );

          }

        } catch (error) {

          console.error(
            "[PAG SW] Notification click error:",
            error
          );

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
     * Optional:
     * paksa Service Worker baru aktif.
     */

    if (
      event.data.type ===
      "SKIP_WAITING"
    ) {

      self.skipWaiting();

    }

  }
);
