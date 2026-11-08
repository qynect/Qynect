const CACHE = "qynect-v2";

const PRECACHE = [
  "./",
  "./ios.html",
  "./static/pass-core.js?v=1",
  "./static/qrcode.js?v=1",
  "./static/web-pass.js?v=1",
  "./static/tailwind.js",
  "./static/qynect-icon-180.png",
  "./static/qynect-icon-192.png",
  "./static/qynect-icon-512.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
