/* Gosari — Service Worker v1.8.0
   HTML: network-first (para que los deploys se vean sin trucos)
   Imágenes: stale-while-revalidate
   Nunca cachea llamadas al backend. */
const CACHE = 'gosari-v1.8.0';

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.hostname.indexOf('script.google') >= 0 || url.hostname.indexOf('googleusercontent') >= 0) return;
  if (url.origin !== location.origin) return;

  const esHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').indexOf('text/html') >= 0;

  if (esHTML) {
    e.respondWith(
      fetch(req)
        .then(r => { const c = r.clone(); caches.open(CACHE).then(ch => ch.put(req, c)); return r; })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req)
        .then(r => { const c = r.clone(); caches.open(CACHE).then(ch => ch.put(req, c)); return r; })
        .catch(() => cached);
      return cached || net;
    })
  );
});
