const CACHE = "benovelent-shell-v7";
const ASSETS = ["/", "/index.html", "/manifest.webmanifest", "/pwa-icon-192.png", "/pwa-icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text?.() || "You have a new Benovelent MIDAX update." }; }
  const title = payload.title || "Benovelent MIDAX";
  const options = {
    body: payload.body || "You have a new update.",
    icon: payload.icon || "/pwa-icon-192.png",
    badge: payload.badge || "/pwa-icon-192.png",
    tag: payload.tag || "benevolent-notification",
    renotify: true,
    data: payload.data || { link: "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification?.data?.link || "/";
  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientList) {
      if ("focus" in client) {
        try { await client.navigate(link); } catch { /* ignore */ }
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

  // Media/video requests frequently use HTTP Range and receive 206 Partial Content.
  // CacheStorage does not accept partial responses, so bypass the cache entirely.
  if (request.headers.has("range")) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(request);

      // Cache only complete, successful responses. In particular, never cache 206.
      if (response.ok && response.status === 200 && response.type !== "opaque") {
        try {
          const cache = await caches.open(CACHE);
          await cache.put(request, response.clone());
        } catch (cacheError) {
          // A cache failure must never turn a successful network request into an app error.
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
