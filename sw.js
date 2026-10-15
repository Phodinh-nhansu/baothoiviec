// Service worker: (1) lưu sẵn giao diện app trên máy → mở app nhanh, mất mạng vẫn mở được;
// (2) nhận thông báo đẩy + số đỏ trên biểu tượng app.
// Trang chính (index.html) luôn lấy bản mới nhất từ GitHub nếu có mạng (chờ tối đa 3 giây), không thì dùng bản đã lưu.
const V = 'tv-5';
const SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/badge-72.png'];
const fresh = req => fetch(req, { cache: 'no-store' });   // bỏ qua bộ nhớ tạm 10 phút của GitHub

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => fresh(u).then(r => r.ok && c.put(u, r)).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;   // dữ liệu Google luôn lấy mới
  if (req.headers.has('range') || /\.(mp4|jpg|png)$/i.test(new URL(req.url).pathname) && !SHELL.some(u => req.url.endsWith(u))) return;   // clip, ảnh: để trình duyệt tự tải – không lưu vào máy
  const isPage = req.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(req.url).pathname);
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fresh(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; });
    if (isPage) {   // trang chính: ưu tiên bản mới, mạng chậm quá 3 giây thì dùng bản đã lưu
      const timer = new Promise(res => setTimeout(() => res(null), 3000));
      const r = await Promise.race([net.catch(() => null), timer]);
      return r || hit || net;
    }
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }   // tệp phụ: dùng bản lưu, cập nhật ngầm
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
