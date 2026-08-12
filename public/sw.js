const CACHE="benevolent-shell-v1";
const ASSETS=["/","/index.html","/manifest.webmanifest","/pwa-icon-192.png","/pwa-icon-512.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{const u=new URL(e.request.url); if(u.origin!==location.origin || e.request.method!=="GET") return; e.respondWith(fetch(e.request).then(r=>{const copy=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match("/"))))});
