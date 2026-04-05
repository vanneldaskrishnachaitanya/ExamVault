const STATIC_CACHE = 'examvault-static-v3';
const DATA_CACHE = 'examvault-data-v1';
const FILE_CACHE = 'examvault-files-v1';
const STATIC = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];
const DATA_PATHS = ['/announcements', '/events', '/exams', '/quotes/today', '/syllabus', '/timetable', '/search', '/downloads', '/bookmarks'];

const isDataRequest = (url) => DATA_PATHS.some(path => url.pathname.startsWith(path));
const isCloudinary = (url) => url.hostname.includes('cloudinary.com');
const isStaticAsset = (url) => /\.(js|css|png|jpg|jpeg|webp|gif|svg|ico|woff2?)$/i.test(url.pathname);

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error('offline');
  }
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(STATIC).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => ![STATIC_CACHE, DATA_CACHE, FILE_CACHE].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if (e.request.mode === 'navigate') {
    e.respondWith(networkFirst(e.request, STATIC_CACHE).catch(() => caches.match('/index.html')));
    return;
  }

  if (isCloudinary(url) || isStaticAsset(url)) {
    e.respondWith(cacheFirst(e.request, FILE_CACHE));
    return;
  }

  if (url.hostname === self.location.hostname && isDataRequest(url)) {
    e.respondWith(networkFirst(e.request, DATA_CACHE));
    return;
  }

  if (url.hostname.includes('render.com') && isDataRequest(url)) {
    e.respondWith(networkFirst(e.request, DATA_CACHE));
    return;
  }

  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
