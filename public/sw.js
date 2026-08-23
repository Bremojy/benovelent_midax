const CACHE = "benevolent-shell-v22-pwa-hardening";
const ASSETS = ["/", "/index.html", "/manifest.webmanifest", "/pwa-icon-192.png", "/pwa-icon-512.png", "/apple-touch-icon.png"];
const DB_NAME = "benovelent-pwa";
const DB_STORE = "calls";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePendingCall(id, payload) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(payload, id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (error) {
    console.warn("PWA call storage failed:", error);
  }
}
async function removePendingCall(id) {
  if (!id) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(String(id));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (error) {
    console.debug("PWA pending-call cleanup skipped:", error);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text?.() || "You have a new Benovelent MIDAX update." }; }

  const type = String(payload?.data?.type || payload?.type || "notification").toLowerCase();
  const isIncomingCall = ["incoming_call", "audio_call", "video_call"].includes(type) || Boolean(payload?.data?.incomingCall);
  const isMissedCall = ["missed_call", "missed_audio_call", "missed_video_call"].includes(type) || Boolean(payload?.data?.missedCall);
  const title = payload.title || (isIncomingCall ? (type === "video_call" ? "Incoming video call" : "Incoming audio call") : isMissedCall ? "Missed call" : "Benovelent MIDAX");
  const options = {
    body: payload.body || (isIncomingCall ? "Someone is calling you." : isMissedCall ? "You missed a call." : "You have a new update."),
    icon: payload.icon || "/pwa-icon-192.png",
    badge: payload.badge || "/pwa-icon-192.png",
    image: payload.image,
    tag: payload.tag || (isIncomingCall ? `benovelent-call-${payload?.data?.callId || "incoming"}` : "benovelent-notification"),
    renotify: true,
    requireInteraction: isIncomingCall || isMissedCall,
    vibrate: isIncomingCall ? [300, 120, 300, 120, 600] : [120, 60, 120],
    actions: isIncomingCall ? [
      { action: "answer", title: "Answer" },
      { action: "decline", title: "Decline" },
    ] : [],
    silent: false,
    timestamp: Date.now(),
    data: payload.data || { link: "/" },
  };

  event.waitUntil((async () => {
    if (isIncomingCall) {
      const openClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      await Promise.all(openClients.map((client) => client.postMessage({ type: "BENOVELENT_INCOMING_CALL", payload })));
      const callId = String(payload?.data?.callId || `call-${Date.now()}`);
      const incomingPayload = payload?.data?.incomingPayload || {};
      const callData = {
        ...(payload.data || {}),
        ...incomingPayload,
        callId,
        incomingCall: true,
        role: payload?.data?.role || incomingPayload?.role || "member",
      };
      await savePendingCall(callId, { ...payload, data: callData });
      const base = callData.role === "admin" ? "/admin/messages" : callData.role === "superadmin" ? "/superadmin/messages" : "/member/messages";
      options.data = { ...callData, link: `${base}?incomingPushCall=${encodeURIComponent(callId)}` };
    }
    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification?.data || {};
  const action = event.action || "open";
  const callIdValue = data.callId ? String(data.callId) : "";
  const callId = callIdValue ? encodeURIComponent(callIdValue) : "";
  let link = data.link || "/";
  if (data.incomingCall && callId) {
    const base = data.role === "admin" ? "/admin/messages" : data.role === "superadmin" ? "/superadmin/messages" : "/member/messages";
    link = `${base}?incomingPushCall=${callId}&callAction=${encodeURIComponent(action)}`;
  } else if (data.role === "admin") link = "/admin/messages";
  else if (data.role === "superadmin") link = "/superadmin/messages";

  event.waitUntil((async () => {
    if (callIdValue) await removePendingCall(callIdValue);
    const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientList) {
      if ("focus" in client) {
        try { await client.navigate(link); } catch {}
        return client.focus();
      }
    }
    return clients.openWindow(link);
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== location.origin || request.method !== "GET") return;

  // Never cache API responses, auth state, realtime transports, or Vite dev
  // resources. The latter is critical when a user previously ran this app in
  // development while the production service worker was installed.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/socket.io/") ||
    url.pathname.startsWith("/@vite/") ||
    url.pathname.startsWith("/node_modules/.vite/") ||
    url.pathname.startsWith("/src/")
  ) return;

  if (request.headers.has("range")) {
    event.respondWith(fetch(request));
    return;
  }

  // Static assets are fast on repeat visits; HTML falls back to the network so
  // deployments can roll forward without users being trapped on an old shell.
  // Never allow an HTML response to be stored for a JavaScript/CSS/image URL.
  const isDocument = request.mode === "navigate" || request.destination === "document";
  const isStaticAsset = /\.(?:js|mjs|css|json|wasm|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf)$/i.test(url.pathname);
  event.respondWith((async () => {
    if (!isDocument) {
      const cached = await caches.match(request);
      if (cached) {
        const cachedType = cached.headers.get("content-type") || "";
        if (!(isStaticAsset && /text\/html/i.test(cachedType))) return cached;
        try {
          const cache = await caches.open(CACHE);
          await cache.delete(request);
        } catch {}
      }
    }
    try {
      const response = await fetch(request);
      const contentType = response.headers.get("content-type") || "";
      const safeToCache = response.ok && response.status === 200 && response.type !== "opaque" && !(isStaticAsset && /text\/html/i.test(contentType));
      if (safeToCache) {
        try {
          const cache = await caches.open(CACHE);
          await cache.put(request, response.clone());
        } catch (cacheError) {
          console.debug("PWA cache write skipped:", cacheError);
        }
      }
      return response;
    } catch (networkError) {
      const cached = await caches.match(request);
      if (cached) return cached;
      const shell = await caches.match("/");
      if (shell) return shell;
      return new Response("Offline", { status: 503, statusText: "Offline" });
    }
  })());
});
