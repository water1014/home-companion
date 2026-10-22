const CACHE = 'xiaoman-v28';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/persona.js',
  './js/llm.js',
  './js/app.js',
  './js/seed.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/wall.jpg',
  './icons/wall-soft.jpg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // 网络优先：这个应用一直在改，宁可慢一点也要看到最新的
  // 断网时退回缓存，仍然能打开
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
