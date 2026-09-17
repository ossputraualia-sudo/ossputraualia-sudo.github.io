/* ============================================================
 * PAG DOCS — SERVICE WORKER
 * VERSION: PAG-PUSH-V7
 *
 * FUNGSI:
 *
 * 1. Menerima Web Push
 * 2. Menampilkan SATU-SATUNYA notifikasi:
 *    native browser / OS
 * 3. Tetap bekerja ketika tab / PWA ditutup
 * 4. Menangani notification click
 * 5. Menangani action button
 * 6. Menangani App Badge jika tersedia
 * 7. Mencegah duplicate notification
 * 8. Menangani subscription yang sudah tidak valid
 *    pada sisi push chain melalui Edge Function
 * 9. Tidak menggunakan polling
 * 10. Tidak menggunakan HTML notification banner
 * 11. Tidak menggunakan visibilitychange
 * 12. Tidak menggunakan focus listener
 * 13. Aman terhadap payload push yang rusak
 *
 * CATATAN:
 *
 * POSISI NATIVE NOTIFICATION TIDAK DAPAT DIATUR
 * OLEH SERVICE WORKER.
 *
 * Posisi banner ditentukan oleh browser / OS.
 *
 * ============================================================ */

const SW_VERSION = "PAG-PUSH-V7";


/* ============================================================
 * APP CONFIG
 * ============================================================ */

const APP_ORIGIN =
  "https://ossputraualia-sudo.github.io";


const APP_URL =
  APP_ORIGIN + "/";


const MAX_BADGE = 999;


/*
 * Prefix cache khusus deduplikasi notification ID.
 *
 * Cache ini BUKAN cache aplikasi.
 *
 * Hanya digunakan sebagai marker bahwa sebuah
 * notificationId sudah pernah diproses.
 */

const NOTIFICATION_CACHE =
  "pag-push-notifications-v1";


/*
 * Marker akan dibuang setelah periode tertentu.
 *
 * 24 jam cukup untuk mencegah duplicate push
 * tanpa menyimpan data selamanya.
 */

const NOTIFICATION_MARKER_TTL =
  24 * 60 * 60 * 1000;


/* ============================================================
 * LOG
 * ============================================================ */

function log(...args) {

  console.log(
    "[PAG SW]",
    ...args
  );

}


/* ============================================================
 * SAFE STRING
 * ============================================================ */

function safeString(
  value,
  fallback = ""
) {

  if (
    value === null ||
    value === undefined
  ) {

    return fallback;

  }


  try {

    const text =
      String(value).trim();


    return text ||
      fallback;

  } catch (_) {

    return fallback;

  }

}


/* ============================================================
 * SAFE NUMBER
 * ============================================================ */

function safeNumber(
  value,
  fallback = 0
) {

  const n =
    Number(value);


  if (
    !Number.isFinite(n)
  ) {

    return fallback;

  }


  if (
    n < 0
  ) {

    return 0;

  }


  return Math.min(
    Math.floor(n),
    MAX_BADGE
  );

}


/* ============================================================
 * SAFE URL
 *
 * HANYA:
 *
 * HTTPS
 * +
 * GitHub Pages PAG Docs
 *
 * ============================================================ */

function safeUrl(
  value
) {

  try {

    const raw =
      safeString(
        value,
        APP_URL
      );


    const url =
      new URL(
        raw,
        APP_URL
      );


    /*
     * Hanya HTTPS.
     */

    if (
      url.protocol !==
      "https:"
    ) {

      return APP_URL;

    }


    /*
     * Hanya origin PAG Docs.
     */

    if (
      url.origin !==
      APP_ORIGIN
    ) {

      return APP_URL;

    }


    return url.href;

  } catch (
    error
  ) {

    return APP_URL;

  }

}


/* ============================================================
 * NORMALIZE NOTIFICATION ID
 *
 * ID HARUS STABIL.
 *
 * Kalau backend tidak mengirim ID,
 * kita membuat fallback berbasis waktu.
 *
 * ============================================================ */

function getNotificationId(
  data
) {

  const supplied =
    safeString(
      data?.notificationId ??
      data?.notification_id ??
      data?.id ??
      data?.notif_id
    );


  if (
    supplied
  ) {

    return supplied;

  }


  /*
   * UUID tersedia pada browser modern.
   */

  try {

    if (
      typeof crypto?.randomUUID ===
      "function"
    ) {

      return crypto.randomUUID();

    }

  } catch (_) {}


  /*
   * Fallback lama.
   */

  return (
    "pag-" +
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .slice(2)
  );

}


/* ============================================================
 * NOTIFICATION MARKER
 *
 * Mencegah push yang sama ditampilkan berkali-kali
 * jika notificationId identik.
 *
 * Cache ini hanya menyimpan marker.
 * Tidak menyimpan isi notification.
 * ============================================================ */

async function hasNotificationBeenShown(
  notificationId
) {

  if (
    !notificationId
  ) {

    return false;

  }


  try {

    const cache =
      await caches.open(
        NOTIFICATION_CACHE
      );


    const markerUrl =
      new URL(
        "/__pag_push_marker__/" +
        encodeURIComponent(
          notificationId
        ),
        APP_URL
      ).href;


    const response =
      await cache.match(
        markerUrl
      );


    if (
      !response
    ) {

      return false;

    }


    const timestamp =
      Number(
        response.headers.get(
          "x-pag-push-time"
        ) ||
        0
      );


    /*
     * Marker lama dibuang.
     */

    if (
      timestamp &&
      Date.now() -
        timestamp >
        NOTIFICATION_MARKER_TTL
    ) {

      await cache.delete(
        markerUrl
      );


      return false;

    }


    return true;

  } catch (
    error
  ) {

    /*
     * Kalau Cache API gagal,
     * jangan sampai push mati.
     */

    log(
      "Duplicate check gagal:",
      error
    );


    return false;

  }

}


/* ============================================================
 * MARK NOTIFICATION AS SHOWN
 * ============================================================ */

async function markNotificationShown(
  notificationId
) {

  if (
    !notificationId
  ) {

    return;

  }


  try {

    const cache =
      await caches.open(
        NOTIFICATION_CACHE
      );


    const markerUrl =
      new URL(
        "/__pag_push_marker__/" +
        encodeURIComponent(
          notificationId
        ),
        APP_URL
      ).href;


    await cache.put(

      markerUrl,

      new Response(
        "shown",
        {
          status: 200,

          headers: {

            "Content-Type":
              "text/plain",

            "x-pag-push-time":
              String(
                Date.now()
              )

          }

        }
      )

    );

  } catch (
    error
  ) {

    log(
      "Marker notification gagal:",
      error
    );

  }

}


/* ============================================================
 * CLEAN OLD MARKERS
 *
 * Best effort.
 *
 * Tidak pernah menghalangi push.
 * ============================================================ */

async function cleanupNotificationMarkers() {

  try {

    const cache =
      await caches.open(
        NOTIFICATION_CACHE
      );


    const requests =
      await cache.keys();


    const now =
      Date.now();


    for (
      const request of requests
    ) {

      try {

        const response =
          await cache.match(
            request
          );


        const timestamp =
          Number(
            response?.headers?.get(
              "x-pag-push-time"
            ) ||
            0
          );


        if (
          timestamp &&
          now - timestamp >
            NOTIFICATION_MARKER_TTL
        ) {

          await cache.delete(
            request
          );

        }

      } catch (_) {}

    }

  } catch (
    error
  ) {

    log(
      "Cleanup marker dilewati:",
      error
    );

  }

}


/* ============================================================
 * APP BADGE
 * ============================================================ */

async function setAppBadge(
  count
) {

  const badge =
    safeNumber(
      count
    );


  try {

    /*
     * Pada browser yang mengekspos Badging API
     * kepada Service Worker, gunakan navigator.
     */

    if (
      typeof navigator?.setAppBadge ===
      "function"
    ) {

      if (
        badge > 0
      ) {

        await navigator.setAppBadge(
          badge
        );

      } else if (
        typeof navigator.clearAppBadge ===
        "function"
      ) {

        await navigator.clearAppBadge();

      }

      return;

    }


    /*
     * Fallback:
     *
     * Sebagian browser hanya menyediakan
     * Badging API pada Window.
     *
     * Dalam kondisi tersebut tidak ada error.
     */

  } catch (
    error
  ) {

    log(
      "Badge tidak tersedia:",
      error
    );

  }

}


/* ============================================================
 * PARSE PUSH PAYLOAD
 * ============================================================ */

async function parsePushPayload(
  event
) {

  if (
    !event?.data
  ) {

    return {};

  }


  /*
   * PRIORITAS JSON
   */

  try {

    return event.data.json();

  } catch (_) {}


  /*
   * FALLBACK TEXT
   */

  try {

    const text =
      event.data.text();


    if (
      !text
    ) {

      return {};

    }


    /*
     * Kadang payload berupa JSON string.
     */

    try {

      return JSON.parse(
        text
      );

    } catch (_) {}


    return {

      body:
        text

    };

  } catch (
    error
  ) {

    log(
      "Payload push tidak dapat dibaca:",
      error
    );


    return {};

  }

}


/* ============================================================
 * EXTRACT NOTIFICATION DATA
 * ============================================================ */

function normalizeNotification(
  data
) {

  const notificationId =
    getNotificationId(
      data
    );


  const title =
    safeString(
      data?.title ??
      data?.judul ??
      "PAG Docs",
      "PAG Docs"
    );


  const body =
    safeString(
      data?.body ??
      data?.message ??
      data?.pesan ??
      "Ada pemberitahuan baru.",
      "Ada pemberitahuan baru."
    );


  const url =
    safeUrl(
      data?.url ??
      data?.link ??
      APP_URL
    );


  const unreadCount =
    safeNumber(
      data?.unreadCount ??
      data?.unread ??
      data?.badge ??
      0
    );


  /*
   * Metadata tambahan untuk routing.
   *
   * Tidak wajib digunakan sekarang.
   *
   * Tetapi disiapkan agar nanti notification
   * dapat membuka modul/record yang tepat.
   */

  const menu =
    safeString(
      data?.menu ??
      data?.module ??
      data?.targetMenu
    );


  const recordId =
    safeString(
      data?.recordId ??
      data?.record_id ??
      data?.targetId ??
      data?.target_id
    );


  const entity =
    safeString(
      data?.entity ??
      data?.type
    );


  return {

    notificationId,

    title,

    body,

    url,

    unreadCount,

    menu,

    recordId,

    entity

  };

}


/* ============================================================
 * BUILD NOTIFICATION OPTIONS
 * ============================================================ */

function buildNotificationOptions(
  notification
) {

  const {

    notificationId,

    body,

    url,

    unreadCount,

    menu,

    recordId,

    entity

  } =
    notification;


  const options = {

    body,

    icon:
      "/icon-192.png",

    badge:
      "/icon-192.png",

    /*
     * Notification ID menjadi tag.
     *
     * Notifikasi berbeda tetap dapat tampil.
     *
     * Notification dengan ID sama akan dianggap
     * notification yang sama.
     */

    tag:
      "pag-docs-" +
      notificationId,

    /*
     * Karena duplicate ID kita cegah sendiri,
     * notification baru tetap dapat memberitahu user.
     */

    renotify:
      true,

    /*
     * Data untuk click handler.
     */

    data: {

      url,

      notificationId,

      unreadCount,

      menu,

      recordId,

      entity

    },

    /*
     * Action:
     *
     * Buka PAG Docs
     * Tutup
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


  return options;

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
     * Jangan menunggu SW lama.
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
         * Ambil kontrol halaman secepat mungkin.
         */

        await self.clients.claim();


        /*
         * Bersihkan marker lama.
         *
         * Best effort.
         */

        await cleanupNotificationMarkers();


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
 * INI JALUR UTAMA.
 *
 * DAPAT BERJALAN MESKIPUN:
 *
 * - tab ditutup
 * - PWA ditutup
 * - browser tidak sedang menampilkan PAG Docs
 *
 * ============================================================ */

self.addEventListener(
  "push",
  event => {

    event.waitUntil(

      (async () => {

        /*
         * Baca payload.
         */

        const rawData =
          await parsePushPayload(
            event
          );


        /*
         * Normalisasi.
         */

        const notification =
          normalizeNotification(
            rawData
          );


        const {

          notificationId,

          title,

          unreadCount

        } =
          notification;


        /*
         * --------------------------------------------------
         * DUPLICATE PROTECTION
         * --------------------------------------------------
         *
         * Jika backend mengirim notificationId yang sama
         * lebih dari sekali, jangan tampilkan banner kedua.
         */

        const alreadyShown =
          await hasNotificationBeenShown(
            notificationId
          );


        if (
          alreadyShown
        ) {

          log(
            "Duplicate notification dilewati:",
            notificationId
          );


          /*
           * Badge tetap diperbarui karena jumlah unread
           * bisa saja berubah walaupun notificationId sama.
           */

          await setAppBadge(
            unreadCount
          );


          return;

        }


        /*
         * Tandai sebelum showNotification.
         *
         * Ini mencegah event push yang sangat berdekatan
         * memproses notification ID yang sama dua kali.
         */

        await markNotificationShown(
          notificationId
        );


        /*
         * --------------------------------------------------
         * BADGE
         * --------------------------------------------------
         */

        await setAppBadge(
          unreadCount
        );


        /*
         * --------------------------------------------------
         * NATIVE NOTIFICATION
         *
         * INILAH SATU-SATUNYA BANNER.
         * --------------------------------------------------
         */

        const options =
          buildNotificationOptions(
            notification
          );


        await self.registration.showNotification(
          title,
          options
        );


        log(
          "Notification shown:",
          title,
          "id=",
          notificationId,
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
     * Tutup notification native.
     */

    try {

      event.notification.close();

    } catch (_) {}


    /*
     * Action Tutup:
     *
     * Jangan membuka aplikasi.
     */

    if (
      event.action ===
      "close"
    ) {

      return;

    }


    event.waitUntil(

      (async () => {

        const data =
          event.notification?.data ||
          {};


        const target =
          safeUrl(
            data.url ||
            APP_URL
          );


        /*
         * Cari window PAG Docs yang sudah ada.
         */

        const clientsList =
          await self.clients.matchAll({

            type:
              "window",

            includeUncontrolled:
              true

          });


        /*
         * PRIORITAS:
         *
         * Fokus existing PAG Docs.
         */

        for (
          const client of clientsList
        ) {

          try {

            /*
             * Pastikan client berasal dari
             * origin PAG Docs.
             */

            const clientUrl =
              new URL(
                client.url
              );


            if (
              clientUrl.origin !==
              APP_ORIGIN
            ) {

              continue;

            }


            /*
             * Jika target berbeda,
             * navigasikan wrapper ke target.
             */

            if (
              "navigate" in client &&
              client.url !== target
            ) {

              await client.navigate(
                target
              );

            }


            if (
              "focus" in client
            ) {

              await client.focus();

            }


            return;

          } catch (
            error
          ) {

            log(
              "Focus client gagal:",
              error
            );

          }

        }


        /*
         * Belum ada PAG Docs:
         *
         * buka window baru.
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

    try {

      log(
        "Notification closed:",
        event.notification?.title ||
        ""
      );

    } catch (_) {}

  }
);


/* ============================================================
 * MESSAGE DARI index.html
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

      self.skipWaiting();

      return;

    }


    /* --------------------------------------------------------
     * SET BADGE
     * -------------------------------------------------------- */

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


    /* --------------------------------------------------------
     * CLEAR BADGE
     * -------------------------------------------------------- */

    if (
      data.type ===
      "CLEAR_APP_BADGE"
    ) {

      event.waitUntil(

        setAppBadge(
          0
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

        event.ports?.[0]?.postMessage({

          ok:
            true,

          version:
            SW_VERSION,

          push:
            true,

          origin:
            APP_ORIGIN

        });

      } catch (_) {}


      return;

    }


    /* --------------------------------------------------------
     * CLEAR NOTIFICATION MARKERS
     *
     * Dipakai jika suatu saat kita perlu
     * reset duplicate protection.
     * -------------------------------------------------------- */

    if (
      data.type ===
      "CLEAR_PUSH_MARKERS"
    ) {

      event.waitUntil(

        (async () => {

          try {

            await caches.delete(
              NOTIFICATION_CACHE
            );

            log(
              "Push notification markers cleared."
            );

          } catch (
            error
          ) {

            log(
              "Clear markers gagal:",
              error
            );

          }

        })()

      );


      return;

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
