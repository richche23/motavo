/* Motavo service worker — intentionally minimal.
   Exists primarily to satisfy PWA installability (Chrome requires a SW with a
   fetch handler before it offers "Add to Home Screen"). All requests pass
   straight through to the network — no caching, so no stale-content risk.
   If we ever want offline support, this is the file to grow. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
