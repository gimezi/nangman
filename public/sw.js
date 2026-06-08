const CACHE = 'nangman-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // HTML 페이지, API, non-GET은 항상 네트워크 직접 사용 (캐시 안 함)
  if (
    request.mode === 'navigate' ||
    url.pathname.startsWith('/api/') ||
    request.method !== 'GET'
  ) {
    return
  }

  // 정적 자산(JS, CSS, 이미지 등)만 캐시
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then((cache) => cache.put(request, clone))
        }
        return res
      })
    })
  )
})
