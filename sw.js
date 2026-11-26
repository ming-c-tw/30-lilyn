/* 生日列車 Service Worker：頁面與程式網路優先（開啟就拿最新版），圖片音檔快取優先；離線才退回快取 */
/* 素材（音樂、音效、圖、AI 模型）另放一個快取，名稱照素材內容的雜湊（發版.py 算）：素材沒變就跨版本保留，不會每次發版都重抓（2026-11-19 Ming：音樂好慢才出來） */
const MEDIA_CACHE = 'mrt-media-f821b03dcd';
const MEDIA = ["./audio/bgm/adventure.mp3", "./audio/bgm/birthday.mp3", "./audio/bgm/boss.mp3", "./audio/bgm/cute.mp3", "./audio/bgm/eerie.mp3", "./audio/bgm/fashion.mp3", "./audio/bgm/final.mp3", "./audio/bgm/final_pre.mp3", "./audio/bgm/puzzle.mp3", "./audio/bgm/runner.mp3", "./audio/bgm/sweet.mp3", "./audio/bgm/title.mp3", "./audio/bgm/travel.mp3", "./audio/bgm/victory.mp3", "./audio/bgm/volley.mp3", "./audio/clip_chandelier.m4a", "./audio/clip_lillian.m4a", "./audio/clip_lily.m4a", "./audio/clip_lydia.m4a", "./audio/sfx/arrow.mp3", "./audio/sfx/arrow_bad.mp3", "./audio/sfx/aura.mp3", "./audio/sfx/badge.mp3", "./audio/sfx/ball_hit.mp3", "./audio/sfx/banish.mp3", "./audio/sfx/breakdown.mp3", "./audio/sfx/bump.mp3", "./audio/sfx/burn.mp3", "./audio/sfx/candle_blow.mp3", "./audio/sfx/candle_lit.mp3", "./audio/sfx/card_flip.mp3", "./audio/sfx/cat.mp3", "./audio/sfx/charge.mp3", "./audio/sfx/click.mp3", "./audio/sfx/correct.mp3", "./audio/sfx/defeat.mp3", "./audio/sfx/devil.mp3", "./audio/sfx/digit.mp3", "./audio/sfx/dim.mp3", "./audio/sfx/director.mp3", "./audio/sfx/escape.mp3", "./audio/sfx/exile.mp3", "./audio/sfx/fairy.mp3", "./audio/sfx/fall.mp3", "./audio/sfx/finale.mp3", "./audio/sfx/game_win.mp3", "./audio/sfx/gauge_full.mp3", "./audio/sfx/gift.mp3", "./audio/sfx/glitch.mp3", "./audio/sfx/gold_ignite.mp3", "./audio/sfx/grip.mp3", "./audio/sfx/grip_free.mp3", "./audio/sfx/growl.mp3", "./audio/sfx/heal.mp3", "./audio/sfx/heart.mp3", "./audio/sfx/ignite.mp3", "./audio/sfx/invite.mp3", "./audio/sfx/jump.mp3", "./audio/sfx/land.mp3", "./audio/sfx/locker.mp3", "./audio/sfx/merge.mp3", "./audio/sfx/mystery.mp3", "./audio/sfx/omen.mp3", "./audio/sfx/page.mp3", "./audio/sfx/pop.mp3", "./audio/sfx/punch.mp3", "./audio/sfx/purr.mp3", "./audio/sfx/rainbow.mp3", "./audio/sfx/rift.mp3", "./audio/sfx/rift_close.mp3", "./audio/sfx/shake.mp3", "./audio/sfx/shutter.mp3", "./audio/sfx/smirk.mp3", "./audio/sfx/smoke.mp3", "./audio/sfx/sparkle.mp3", "./audio/sfx/telescope.mp3", "./audio/sfx/throw.mp3", "./audio/sfx/ticket.mp3", "./audio/sfx/train.mp3", "./audio/sfx/trap.mp3", "./audio/sfx/ult_slam.mp3", "./audio/sfx/ult_spin.mp3", "./audio/sfx/unseal.mp3", "./audio/sfx/win.mp3", "./audio/sfx/wish.mp3", "./audio/sfx/wish_n1.mp3", "./audio/sfx/wish_n2.mp3", "./audio/sfx/wish_n3.mp3", "./audio/sfx/wish_n4.mp3", "./audio/sfx/wish_n5.mp3", "./audio/sfx/wish_n6.mp3", "./audio/sfx/wrong.mp3", "./audio/sfx/yum.mp3", "./img/s0_puzzle_pixel.png", "./img/s6_icon_女廁.png", "./img/s6_icon_男女.png", "./img/s6_icon_男廁.png", "./img/s6_p4_畫1.jpg", "./img/s6_p4_畫2.jpg", "./img/s6_p4_畫3.jpg", "./img/s6_p4_畫4.jpg", "./img/s6_photo1.jpg", "./img/s6_photo2.jpg", "./img/s6_photo3.jpg", "./img/s6_photo4.jpg", "./img/s6_photo5.jpg", "./img/strip_title.png", "./img/targets_all.mind", "./img/targets_card_test.mind", "./img/targets_flower.mind", "./img/targets_winter.mind", "./vendor/ai/flower_refs.json", "./vendor/ai/group1-shard1of2.bin", "./vendor/ai/group1-shard2of2.bin", "./vendor/ai/model.json", "./vendor/ai/tf.min.js"];
const CACHE = 'mrt-1795674616';
const ASSETS = ['./', './index.html', './games.js', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './img/s0_puzzle_pixel.png', './vendor/mindar/mindar-image-three.prod.js', './vendor/mindar/controller-mGt1s8dJ.js', './vendor/mindar/ui-fBadYuor.js', './img/targets_all.mind'];   // AR 引擎與目標檔也預先快取
/* 外部程式庫與字型（網址有版本號、內容不會變）：安裝時一起抓進素材快取，之後一律快取優先（2026-11-19：捷運站裡訊號差時，網路優先會卡在等網路） */
const CDN = ['https://cdnjs.cloudflare.com/ajax/libs/nes.css/2.3.0/css/nes.min.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/fusion-pixel-12px-proportional-tc@5.2.5/index.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/fusion-pixel-12px-proportional-tc@5.2.5/files/fusion-pixel-12px-proportional-tc-latin-400-normal.woff2',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/renderers/CSS3DRenderer.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'];
function fillMedia(){   // 背景把全部素材抓進素材快取（已經有的跳過，4 條同時；單一檔失敗不影響其他）
  const ALL = CDN.concat(MEDIA); return caches.open(MEDIA_CACHE).then((c) => { let i = 0; const one = () => { if (i >= ALL.length) return Promise.resolve(); const u = ALL[i++];
    return c.match(u).then((hit) => hit || fetch(u, { cache: 'no-cache' }).then((r) => { if (r.ok) return c.put(u, r); })).catch(() => {}).then(one); };
    return Promise.all([one(), one(), one(), one()]); });
}
self.addEventListener('install', (e) => { e.waitUntil(Promise.all([caches.open(CACHE).then((c) => c.addAll(ASSETS)), fillMedia()])); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== MEDIA_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin && !/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)$/.test(u.hostname)) return;
  if (u.origin !== location.origin) {   // 外部程式庫／字型：快取優先
    e.respondWith(caches.match(e.request.url).then((hit) => hit || fetch(e.request).then((res) => { const copy = res.clone(); if (res.ok) caches.open(MEDIA_CACHE).then((c) => c.put(e.request.url, copy)); return res; })));
    return;
  }
  if (u.origin === location.origin && (/\/(img|audio)\/[^?]+\.(jpe?g|png|m4a|mp3|mind)$/.test(u.pathname) || /\/vendor\/ai\//.test(u.pathname))) {   // 圖片、音檔、AI 模型：快取優先（提早預載的才能直接用）
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request, { cache: 'no-cache' }).then((res) => { const copy = res.clone(); if (res.ok) caches.open(MEDIA_CACHE).then((c) => c.put(e.request, copy)); return res; })));
    return;
  }
  /* 頁面與程式：網路優先（拿最新版）；但網路 3 秒沒回應就先用快取，不讓開 App 卡在等訊號 */
  const net = fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; });
  const cached = () => caches.match(e.request).then((hit) => hit || caches.match('./index.html'));
  e.respondWith(new Promise((resolve) => {
    let done = false; const give = (r) => { if (!done && r) { done = true; resolve(r); } };
    const t = setTimeout(() => cached().then(give), 3000);
    net.then((res) => { clearTimeout(t); give(res); }).catch(() => { clearTimeout(t); cached().then((hit) => { if (hit) give(hit); else if (!done) { done = true; resolve(Response.error()); } }); });
  }));
});
