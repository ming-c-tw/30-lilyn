/* 生日列車 Service Worker：頁面與程式網路優先（開啟就拿最新版），圖片音檔快取優先；離線才退回快取 */
const CACHE = 'mrt-1794305256';
const ASSETS = ['./', './index.html', './games.js', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './img/s0_puzzle_pixel.png', './vendor/mindar/mindar-image-three.prod.js', './vendor/mindar/controller-mGt1s8dJ.js', './vendor/mindar/ui-fBadYuor.js', './img/targets_all.mind'];   // AR 引擎與目標檔也預先快取
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin && !/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)$/.test(u.hostname)) return;
  if (u.origin === location.origin && /\/(img|audio)\/[^?]+\.(jpe?g|png|m4a|mp3|mind)$/.test(u.pathname)) {   // 圖片、音檔：快取優先（提早預載的才能直接用）
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })));
    return;
  }
  e.respondWith(fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html'))));
});
