// pwa.js – phần riêng của app cài trên điện thoại: cài app, bật thông báo đẩy, số đỏ trên biểu tượng.
// Firebase chỉ tải khi cần: mạng chặn Firebase thì app vẫn chạy, chỉ thiếu thông báo đẩy.
(function () {
  const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const C = window.TV_CONFIG || {}, $ = id => document.getElementById(id);
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const hasNoti = 'Notification' in window && 'serviceWorker' in navigator;
  const device = (isIOS ? 'iPhone/iPad' : /android/i.test(navigator.userAgent) ? 'Android' : 'Máy tính') + (standalone ? ' – app' : ' – trình duyệt');
  let token = null, swReg = null, messaging = null, fm = null, loggedIn = false, pendingFresh = false, shown = false;

  // Service worker: lưu sẵn giao diện trên máy (mở app không phải tải lại) + nhận thông báo đẩy
  const swReady = 'serviceWorker' in navigator
    ? navigator.serviceWorker.register('sw.js', { scope: './' }).then(r => (swReg = r)).catch(() => null)
    : Promise.resolve(null);

  // Khung gợi ý (cài app / bật thông báo / hướng dẫn khi bị tắt)
  const css = document.createElement('style');
  css.textContent = `.pw-card{position:fixed;left:12px;right:12px;bottom:calc(var(--nav-h,64px) + 26px + env(safe-area-inset-bottom,0px));z-index:45;background:#1F3A5C;color:#fff;border-radius:18px;
    padding:14px 14px 14px 16px;box-shadow:0 12px 30px rgba(22,41,63,.35);display:flex;gap:12px;align-items:center;max-width:520px;margin:0 auto;font-size:14px}
    .pw-card b{display:block;font-size:15px;margin-bottom:2px}.pw-card span{font-size:13px;color:#CFE6E1;line-height:1.4}.pw-card .grow{flex:1}
    .pw-card button{border:0;border-radius:12px;font:inherit;font-weight:700;font-size:14px;padding:10px 14px;cursor:pointer}
    .pw-card .go{background:#F2A25A;color:#fff}.pw-card .x{background:transparent;color:#9FB3C8;padding:6px 4px;font-size:18px}`;
  document.head.appendChild(css);
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div id="cInstall" class="pw-card hide"><div class="grow"><b>Cài app lên màn hình chính</b><span>Bấm <b style="display:inline">⋯</b> → <b style="display:inline">Chia sẻ</b> → <b style="display:inline">Thêm vào MH chính</b>. Sau đó mở app từ biểu tượng mới để nhận thông báo.</span></div><button class="x" data-close="cInstall" aria-label="Đóng">✕</button></div>
    <div id="cPush" class="pw-card hide"><div class="grow"><b>Bật thông báo</b><span id="pushMsg">Nhận ngay việc mới và số đỏ trên biểu tượng app.</span></div><button class="go" id="btnPush">Bật</button><button class="x" data-close="cPush" aria-label="Để sau">✕</button></div>
    <div id="cInfo" class="pw-card hide"><div class="grow"><b id="infoT"></b><span id="infoM"></span></div><button class="x" data-close="cInfo" aria-label="Đóng">✕</button></div>`;
  document.body.appendChild(wrap);

  function sendToken(fresh) {
    if (!token) return;
    if (loggedIn && typeof window.onDeviceToken === 'function') { window.onDeviceToken(token, device, fresh || pendingFresh); pendingFresh = false; }
    else if (fresh) pendingFresh = true;   // gửi khi đăng nhập xong
  }
  async function initPush() {
    if (messaging) return true;
    await swReady; if (!swReg) throw new Error('Trình duyệt này chưa hỗ trợ thông báo đẩy.');
    await navigator.serviceWorker.ready;
    const [app, m] = await Promise.all([import(FB + 'firebase-app.js'), import(FB + 'firebase-messaging.js')]);
    if (!(await m.isSupported().catch(() => false))) throw new Error('Trình duyệt này chưa hỗ trợ thông báo đẩy.');
    fm = m; messaging = m.getMessaging(app.initializeApp(C.firebase));
    return true;
  }
  async function fetchToken(fresh) {
    await initPush();
    token = await fm.getToken(messaging, { vapidKey: C.vapidKey, serviceWorkerRegistration: swReg });
    if (!token) throw new Error('Không lấy được mã thiết bị.');
    sendToken(fresh);
  }
  const later = k => ls.get('tv_hide_' + k) && Date.now() - +ls.get('tv_hide_' + k) < 86400000;
  function info(t, m) { if (later('cInfo')) return; $('infoT').textContent = t; $('infoM').textContent = m; $('cInfo').classList.remove('hide'); }
  function showCards() {
    if (shown) return; shown = true;
    if (isIOS && !standalone) { if (!later('cInstall')) $('cInstall').classList.remove('hide'); return; }
    if (!hasNoti) { if (isIOS) info('Chưa nhận được thông báo', 'Cần iPhone chạy iOS 16.4 trở lên (Cài đặt → Cài đặt chung → Cập nhật phần mềm).'); return; }
    if (Notification.permission === 'default' && !later('cPush')) $('cPush').classList.remove('hide');
    if (Notification.permission === 'denied') info('Thông báo đang bị tắt', isIOS
      ? 'Vào Cài đặt iPhone → Thông báo → Thôi việc → bật Cho phép thông báo, Âm thanh, Biểu tượng.'
      : 'Bấm biểu tượng ổ khóa / ⋮ → Cài đặt trang web → Thông báo → Cho phép.');
    if (Notification.permission === 'granted') fetchToken(false).catch(e => console.warn('push', e));
  }
  wrap.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { ls.set('tv_hide_' + b.dataset.close, String(Date.now())); $(b.dataset.close).classList.add('hide'); });
  $('btnPush').onclick = async () => {
    let p = 'default';   // iPhone chỉ cho hỏi quyền đúng lúc người dùng bấm
    try { p = await Notification.requestPermission(); } catch (e) { p = Notification.permission; }
    if (p !== 'granted') { $('cPush').classList.add('hide'); if (p === 'denied') { shown = false; showCards(); } return; }
    $('pushMsg').textContent = 'Đang bật…'; $('btnPush').disabled = true;
    try { await fetchToken(true); $('cPush').classList.add('hide'); }
    catch (e) { $('pushMsg').textContent = 'Chưa bật được: ' + (e && e.message || e) + ' – thử đóng hẳn app rồi mở lại.'; $('btnPush').disabled = false; }
  };

  // Nhận tin từ app (cùng trang)
  window.TV_PWA = {
    msg(m) {
      if (!m || typeof m !== 'object') return;
      if (m.type === 'tv-hello') { loggedIn = true; sendToken(false); setTimeout(showCards, 800); }
      if (m.type === 'tv-logout') { loggedIn = false; token = null; }
      if (m.type === 'tv-badge' && 'setAppBadge' in navigator) (m.n ? navigator.setAppBadge(m.n) : navigator.clearAppBadge()).catch(() => {});
    }
  };
  // iPhone chưa cài ra màn hình chính: nhắc ngay cả khi chưa đăng nhập
  if (isIOS && !standalone) setTimeout(showCards, 1200);
})();
