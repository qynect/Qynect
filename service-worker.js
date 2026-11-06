const CACHE = "qynect-v1";

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
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
