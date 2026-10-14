// Service worker: nhận thông báo đẩy (Firebase Cloud Messaging) + số đỏ trên biểu tượng app
const V = 'tv-1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // để trình duyệt cho phép cài app

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
