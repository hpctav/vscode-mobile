/* ============================================================
   12. MAIN — Bootstrap
   ------------------------------------------------------------
   TẠI SAO CẦN FILE NÀY?
   Các file 01 → 11 chỉ ĐỊNH NGHĨA module (hàm, dữ liệu, API).
   Chúng không tự chạy nghiệp vụ. File này là nơi DUY NHẤT
   gọi init() theo đúng thứ tự, nên chỉ cần đọc file này là
   biết ứng dụng khởi động thế nào.

   THỨ TỰ KHỞI TẠO:
   1. ui.init()        — dựng sidebar, tabs, command palette,
                         status bar, group 1 phím ảo, đo bottom area.
   2. files.init()     — gắn nút mở/lưu file, input ẩn.
   3. preview.init()   — gắn nút refresh/close của preview.
   4. shortcuts.init() — event delegation cho [data-action]/[data-text].
   5. editor.init()    — tải Monaco SAU CÙNG vì đây là bước
                         bất đồng bộ (CDN), rồi dựng group 2.
   6. registerPwa()    — đăng ký service worker (chỉ HTTPS/localhost).
                         PWA không bắt buộc để app chạy, nên lỗi ở
                         bước này chỉ ghi log, không chặn giao diện.

   Tóm lại: UI trước → dữ liệu → hành động → editor → PWA.
   ============================================================ */
(function (global) {
  'use strict';

  var App = global.ME;

  function boot() {
    registerPwa();

    try {
      App.ui.init();
      App.files.init();
      App.preview.init();
      App.shortcuts.init();
      App.editor.init();
    } catch (err) {
      console.error('[VS Code Mobile] Bootstrap lỗi:', err);
      if (App.utils) {
        App.utils.setStatus('Lỗi khởi động: ' +
          (err && err.message ? err.message : err));
      }
    }
  }

  /* ------------------------------------------------------------
     PWA — đăng ký service worker (sw.js)
     ------------------------------------------------------------
     Điều kiện: trình duyệt hỗ trợ serviceWorker + secure context
     (HTTPS hoặc http://localhost). Mở bằng file:// sẽ bỏ qua vì
     trình duyệt không cho đăng ký service worker ở giao thức này.
     ------------------------------------------------------------ */
  function registerPwa() {
    if (!('serviceWorker' in global.navigator)) return;

    var protocol = global.location.protocol;
    if (protocol !== 'https:' && protocol !== 'http:') return;
    if (!global.isSecureContext) return;

    function start() {
      global.navigator.serviceWorker
        .register('./sw.js', { scope: './', updateViaCache: 'none' })
        .then(function (registration) {
          console.info('[PWA] Service worker đã đăng ký:', registration.scope);
        })
        .catch(function (err) {
          console.warn('[PWA] Không đăng ký được service worker:', err);
        });
    }

    /* Script chạy ở cuối body: nếu trang đã load xong thì đăng ký
       ngay, nếu chưa thì chờ sự kiện load. */
    if (document.readyState === 'complete') start();
    else global.addEventListener('load', start, { once: true });
  }

  /* Script nằm cuối <body> nhưng vẫn chờ DOMContentLoaded
     để chắc chắn toàn bộ DOM đã sẵn sàng. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
