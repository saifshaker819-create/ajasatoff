const CACHE_NAME = 'leave-system-v6';
const ASSETS = ['/', '/index.html', '/manifest.json'];

// تثبيت: خزّن الملفات الأساسية
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(ASSETS.map(url => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting(); // فعّل SW الجديد فوراً دون انتظار
});

// رسائل من الصفحة
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// تفعيل: احذف الكاش القديم وتولّ التحكم فوراً
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: Network First — الشبكة أولاً، الكاش احتياط عند انقطاع الإنترنت
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // إذا نجح الطلب: حدّث الكاش وأرجع الاستجابة الجديدة
        if (response && response.status === 200) {
          caches.open(CACHE_NAME).then(cache =>
            cache.put(event.request, response.clone())
          );
        }
        return response;
      })
      .catch(() => {
        // إذا انقطع الإنترنت: أرجع من الكاش
        return caches.match(event.request)
          .then(cached => cached || caches.match('/index.html'));
      })
  );
});
