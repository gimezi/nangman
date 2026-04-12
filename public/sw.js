const CACHE = 'nangman-v1'
const STATIC = ['/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC))
  )
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

  // API / 인증 요청은 항상 네트워크 직접 사용
  if (url.pathname.startsWith('/api/') || request.method !== 'GET') {
    return
  }

  // 그 외 리소스: 네트워크 우선, 실패 시 캐시
  event.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((cache) => cache.put(request, clone))
        return res
      })
      .catch(() => caches.match(request))
  )
})
