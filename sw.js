/* PromptVault Studio service worker: app-shell offline caching.
   Cache-first for same-origin GET; network fallback updates the cache. */
const CACHE = 'promptvault-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg'])).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      const fetched = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default')) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(e.request, copy))
          }
          return res
        })
        .catch(() => cached)
      // For navigations and shell assets prefer cache speed; otherwise prefer fresh
      if (cached && (e.request.mode === 'navigate' || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html'))) {
        return cached
      }
      return fetched.then((r) => r || cached)
    }),
  )
})
