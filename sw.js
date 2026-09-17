/* ============================================================
 * PAG DOCS — SERVICE WORKER
 * VERSION: PAG-PUSH-V8 (RICH INFORMATIVE & DYNAMIC BADGE)
 *
 * FITUR UTAMA:
 * 1. Rich Native Notification (Informatif, Timestamp, Pola Getar)
 * 2. Action Button Dinamis Sesuai Modul (Tender, Paket, Surat, dll)
 * 3. Full App Badge Taskbar (Desktop) & Ikon Layar Utama (HP)
 * 4. Deduplikasi Marker Cache 24 Jam
 * 5. Smart Window Focus (Tidak menduplikasi tab yang terbuka)
 * 6. Proteksi Keamanan URL (Anti Open-Redirect)
 * ============================================================ */

const SW_VERSION = "PAG-PUSH-V8";

/* ============================================================
 * APP CONFIG
 * ============================================================ */

const APP_ORIGIN = "https://ossputraualia-sudo.github.io";
const APP_URL = APP_ORIGIN + "/";
const MAX_BADGE = 999;

const NOTIFICATION_CACHE = "pag-push-notifications-v1";
const NOTIFICATION_MARKER_TTL = 24 * 60 * 60 * 1000; // 24 Jam

/* ============================================================
 * LOG & SANITIZERS
 * ============================================================ */

function log(...args) {
  console.log("[PAG SW]", ...args);
}

function safeString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  try {
    const text = String(value).trim();
    return text || fallback;
  } catch (_) {
    return fallback;
  }
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n < 0) return 0;
  return Math.min(Math.floor(n), MAX_BADGE);
}

function safeUrl(value) {
  try {
    const raw = safeString(value, APP_URL);
    const url = new URL(raw, APP_URL);
    if (url.protocol !== "https:") return APP_URL;
    if (url.origin !== APP_ORIGIN) return APP_URL;
    return url.href;
  } catch (_) {
    return APP_URL;
  }
}

function getNotificationId(data) {
  const supplied = safeString(
    data?.notificationId ??
    data?.notification_id ??
    data?.id ??
    data?.notif_id
  );
  if (supplied) return supplied;

  try {
    if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  } catch (_) {}

  return "pag-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

/* ============================================================
 * NOTIFICATION MARKER (DEDUPLIKASI)
 * ============================================================ */

async function hasNotificationBeenShown(notificationId) {
  if (!notificationId) return false;
  try {
    const cache = await caches.open(NOTIFICATION_CACHE);
    const markerUrl = new URL("/__pag_push_marker__/" + encodeURIComponent(notificationId), APP_URL).href;
    const response = await cache.match(markerUrl);
    if (!response) return false;

    const timestamp = Number(response.headers.get("x-pag-push-time") || 0);
    if (timestamp && Date.now() - timestamp > NOTIFICATION_MARKER_TTL) {
      await cache.delete(markerUrl);
      return false;
    }
    return true;
  } catch (error) {
    log("Duplicate check gagal:", error);
    return false;
  }
}

async function markNotificationShown(notificationId) {
  if (!notificationId) return;
  try {
    const cache = await caches.open(NOTIFICATION_CACHE);
    const markerUrl = new URL("/__pag_push_marker__/" + encodeURIComponent(notificationId), APP_URL).href;
    await cache.put(
      markerUrl,
      new Response("shown", {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          "x-pag-push-time": String(Date.now())
        }
      })
    );
  } catch (error) {
    log("Marker notification gagal:", error);
  }
}

async function cleanupNotificationMarkers() {
  try {
    const cache = await caches.open(NOTIFICATION_CACHE);
    const requests = await cache.keys();
    const now = Date.now();
    for (const request of requests) {
      try {
        const response = await cache.match(request);
        const timestamp = Number(response?.headers?.get("x-pag-push-time") || 0);
        if (timestamp && now - timestamp > NOTIFICATION_MARKER_TTL) {
          await cache.delete(request);
        }
      } catch (_) {}
    }
  } catch (error) {
    log("Cleanup marker dilewati:", error);
  }
}

/* ============================================================
 * APP BADGE API (DESKTOP TASKBAR & MOBILE OS)
 * ============================================================ */

async function setAppBadge(count) {
  const badge = safeNumber(count);
  try {
    if (typeof navigator?.setAppBadge === "function") {
      if (badge > 0) {
        await navigator.setAppBadge(badge);
      } else if (typeof navigator.clearAppBadge === "function") {
        await navigator.clearAppBadge();
      }
    }
  } catch (error) {
    log("Badge OS tidak tersedia:", error);
  }
}

/* ============================================================
 * PARSE PAYLOAD & EKSTRAKSI DATA INFORMATIF
 * ============================================================ */

async function parsePushPayload(event) {
  if (!event?.data) return {};
  try { return event.data.json(); } catch (_) {}
  try {
    const text = event.data.text();
    if (!text) return {};
    try { return JSON.parse(text); } catch (_) {}
    return { body: text };
  } catch (error) {
    log("Payload tidak terbaca:", error);
    return {};
  }
}

function normalizeNotification(data) {
  const notificationId = getNotificationId(data);

  const title = safeString(
    data?.title ?? data?.judul ?? "PAG Docs",
    "PAG Docs"
  );

  const body = safeString(
    data?.body ?? data?.message ?? data?.pesan ?? "Ada pemberitahuan operasional baru.",
    "Ada pemberitahuan operasional baru."
  );

  const url = safeUrl(data?.url ?? data?.link ?? APP_URL);
  const unreadCount = safeNumber(data?.unreadCount ?? data?.unread ?? data?.badge ?? 0);

  const module = safeString(data?.module ?? data?.menu ?? "SYSTEM").toUpperCase();
  const category = safeString(data?.category ?? "DATA").toUpperCase();
  const priority = safeString(data?.priority ?? "normal").toLowerCase();
  const recordId = safeString(data?.recordId ?? data?.record_id ?? "");
  const image = safeString(data?.image ?? data?.gambar ?? "");

  // Timestamp kejadian (waktu pembuatan dokumen/event)
  const timestamp = data?.timestamp || data?.created_at
    ? new Date(data.timestamp || data.created_at).getTime()
    : Date.now();

  return {
    notificationId,
    title,
    body,
    url,
    unreadCount,
    module,
    category,
    priority,
    recordId,
    image,
    timestamp
  };
}

/* ============================================================
 * BUILD INFORMATIVE NOTIFICATION OPTIONS
 * ============================================================ */

function buildNotificationOptions(notification) {
  const {
    notificationId,
    body,
    url,
    unreadCount,
    module,
    category,
    priority,
    recordId,
    image,
    timestamp
  } = notification;

  // 1. Tentukan Label Tombol Sesuai Modul
  let actionTitle = "Buka PAG Docs";
  if (module === "TENDER") actionTitle = "📋 Buka Tender";
  else if (module === "PAKET" || module === "PAKET_DOK") actionTitle = "📁 Buka Proyek";
  else if (module === "SURAT") actionTitle = "✉️ Buka Surat";
  else if (module === "RAB") actionTitle = "💰 Buka RAB";
  else if (module === "BANK_REF") actionTitle = "📚 Buka Referensi";

  // 2. Pola Getar Sesuai Tingkat Kepentingan (Haptic Vibration)
  let vibratePattern = [100, 50, 100]; // Normal
  if (priority === "urgent" || priority === "high") {
    vibratePattern = [200, 100, 200, 100, 400]; // Pola khusus perhatian tinggi
  }

  const options = {
    body: body,
    icon: "/icon-192.png",
    badge: "/icon-192.png", // Icon status bar
    tag: "pag-docs-" + notificationId,
    renotify: true,
    timestamp: timestamp, // Menampilkan jam asli kejadian
    vibrate: vibratePattern,
    requireInteraction: priority === "urgent", // Notifikasi mendesak tetap di layar sampai direspon
    silent: false,
    data: {
      url,
      notificationId,
      unreadCount,
      module,
      recordId
    },
    actions: [
      {
        action: "open",
        title: actionTitle
      },
      {
        action: "close",
        title: "Tutup"
      }
    ]
  };

  // Jika payload mengirim gambar pratinjau (banner rich preview)
  if (image) {
    options.image = image;
  }

  return options;
}

/* ============================================================
 * LIFECYCLE: INSTALL & ACTIVATE
 * ============================================================ */

self.addEventListener("install", () => {
  log("Install:", SW_VERSION);
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      await cleanupNotificationMarkers();
      log("Activated:", SW_VERSION);
    })()
  );
});

/* ============================================================
 * PUSH EVENT HANDLER (BACKGROUND LISTENER)
 * ============================================================ */

self.addEventListener("push", event => {
  event.waitUntil(
    (async () => {
      const rawData = await parsePushPayload(event);
      const notification = normalizeNotification(rawData);
      const { notificationId, title, unreadCount } = notification;

      // 1. Cek Pencegahan Duplikasi
      const alreadyShown = await hasNotificationBeenShown(notificationId);
      if (alreadyShown) {
        log("Duplicate notifikasi diabaikan:", notificationId);
        await setAppBadge(unreadCount); // Tetap update angka badge
        return;
      }

      await markNotificationShown(notificationId);

      // 2. Perbarui Badge Ikon HP / Taskbar PC
      await setAppBadge(unreadCount);

      // 3. Tampilkan Banner Native Informatif
      const options = buildNotificationOptions(notification);
      await self.registration.showNotification(title, options);

      log("Banner informatif tampil:", title, "id=", notificationId);
    })()
  );
});

/* ============================================================
 * NOTIFICATION CLICK & FOCUS HANDLER
 * ============================================================ */

self.addEventListener("notificationclick", event => {
  try {
    event.notification.close();
  } catch (_) {}

  if (event.action === "close") return;

  event.waitUntil(
    (async () => {
      const data = event.notification?.data || {};
      const target = safeUrl(data.url || APP_URL);

      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      // Jika aplikasi sudah terbuka, fokuskan dan navigasikan
      for (const client of clientsList) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin !== APP_ORIGIN) continue;

          if ("navigate" in client && client.url !== target) {
            await client.navigate(target);
          }
          if ("focus" in client) {
            await client.focus();
          }
          return;
        } catch (_) {}
      }

      // Jika belum ada jendela terbuka, buat jendela baru
      if (self.clients.openWindow) {
        await self.clients.openWindow(target);
      }
    })()
  );
});

self.addEventListener("notificationclose", event => {
  try {
    log("Notifikasi ditutup:", event.notification?.title || "");
  } catch (_) {}
});

/* ============================================================
 * IPC MESSAGES DARI index.html
 * ============================================================ */

self.addEventListener("message", event => {
  const data = event.data || {};

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (data.type === "SET_APP_BADGE") {
    event.waitUntil(setAppBadge(data.count));
    return;
  }

  if (data.type === "CLEAR_APP_BADGE") {
    event.waitUntil(setAppBadge(0));
    return;
  }

  if (data.type === "PAG_SW_PING") {
    try {
      event.ports?.[0]?.postMessage({
        ok: true,
        version: SW_VERSION,
        push: true,
        origin: APP_ORIGIN
      });
    } catch (_) {}
    return;
  }

  if (data.type === "CLEAR_PUSH_MARKERS") {
    event.waitUntil(
      (async () => {
        try {
          await caches.delete(NOTIFICATION_CACHE);
          log("Push markers dibersihkan.");
        } catch (_) {}
      })()
    );
  }
});

log("Loaded:", SW_VERSION);
