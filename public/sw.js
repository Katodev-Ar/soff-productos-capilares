const CACHE_NAME = 'soff-admin-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Network-first strategy for API calls, cache-first for static assets
  if (event.request.url.includes('/rest/v1/') || event.request.url.includes('/auth/')) {
    // Always go to network for Supabase API calls
    event.respondWith(fetch(event.request))
  } else {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    )
  }
})
