// Service worker: (1) lưu sẵn giao diện app trên máy → mở app hiện ngay, không chờ tải trang;
// (2) nhận thông báo đẩy + số đỏ trên biểu tượng app.
// Mỗi lần cập nhật app trên GitHub: tăng số phiên bản V (tv-3, tv-4…). Máy sẽ dùng bản mới từ lần mở kế tiếp.
const V = 'tv-2';
const SHELL = ['./', 'index.html', 'config.js', 'pwa.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/badge-72.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Chỉ lưu tệp của chính trang này; dữ liệu (Google Apps Script) luôn lấy mới.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    if (hit) { e.waitUntil(net); return hit; }   // có sẵn → trả ngay, cập nhật ngầm cho lần sau
    return net;
  }));
});

self.addEventListener('push', e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (_) { p = { data: { body: e.data && e.data.text() } }; }
  const d = p.data || p, n = p.notification || {};
  const title = d.title || n.title || 'Báo thôi việc';
  const body = d.body || n.body || '';
  const badge = parseInt(d.badge || '0', 10) || 0;
  const jobs = [self.registration.showNotification(title, {
    body, icon: 'icons/icon-192.png', badge: 'icons/badge-72.png',
    tag: d.tag || 'tv', renotify: true, data: { url: self.registration.scope }
  })];
  if (self.navigator && 'setAppBadge' in self.navigator) {
    jobs.push((badge ? self.navigator.setAppBadge(badge) : self.navigator.clearAppBadge()).catch(() => {}));
  }
  e.waitUntil(Promise.all(jobs));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
