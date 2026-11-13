/* ============================================================
   SERVICE WORKER — VS Code Mobile
   ------------------------------------------------------------
   Nhiệm vụ:
   1. Cache "app shell" (HTML, CSS, JS, manifest) để mở offline.
   2. Điều hướng (navigation): ưu tiên mạng, mất mạng thì trả
      index.html đã cache.
   3. Tài nguyên cùng origin: cache trước, cập nhật ngầm
      (stale-while-revalidate) để lần sau có bản mới.

   LƯU Ý KHI SỬA APP:
   - Tăng CACHE_VERSION mỗi khi đổi HTML/CSS/JS.
   - Service worker chỉ chạy khi app được phục vụ qua HTTPS
     hoặc http://localhost. Mở file:// sẽ không đăng ký được.
   - Monaco vẫn tải từ CDN. Lần đầu cần mạng; trình duyệt có
     thể dùng HTTP cache cho các lần sau.
   ============================================================ */
'use strict';

var CACHE_PREFIX = 'vscode-mobile-';
var CACHE_VERSION = 'v1';
var CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

/* Danh sách file tối thiểu để giao diện chạy được offline.
   Đường dẫn tương đối để hoạt động cả khi đặt trong thư mục con
   (ví dụ GitHub Pages: /vscode-mobile/). */
var APP_SHELL = [
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/01.constants.js',
  './js/02.state.js',
  './js/03.icons.js',
  './js/04.dom.js',
  './js/05.utils.js',
  './js/06.commands.js',
  './js/07.ui.js',
  './js/08.files.js',
  './js/09.preview.js',
  './js/10.shortcuts.js',
  './js/11.editor.js',
  './js/12.main.js'
];

/* ------------------------------------------------------------
   INSTALL — tải sẵn app shell
   ------------------------------------------------------------ */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(APP_SHELL);
      })
      .then(function () {
        /* Có bản mới thì kích hoạt ngay, không chờ đóng tab cũ. */
        return self.skipWaiting();
      })
  );
});

/* ------------------------------------------------------------
   ACTIVATE — xoá cache phiên bản cũ
   ------------------------------------------------------------ */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (key) {
            return key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME;
          }).map(function (key) {
            return caches.delete(key);
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

/* ------------------------------------------------------------
   FETCH
   ------------------------------------------------------------ */
self.addEventListener('fetch', function (event) {
  var request = event.request;

  /* Chỉ xử lý GET cùng origin. CDN Monaco để trình duyệt tự lo. */
  if (request.method !== 'GET') return;

  var url;
  try {
    url = new URL(request.url);
  } catch (err) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  /* Mở trang: ưu tiên mạng để nhận bản mới, offline thì dùng cache. */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response && response.ok) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put('./index.html', copy);
            });
          }
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  /* CSS/JS/ảnh/icon: trả cache ngay, cập nhật ngầm. */
  event.respondWith(
    caches.match(request).then(function (cached) {
      var network = fetch(request)
        .then(function (response) {
          if (response && response.ok) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, copy);
            });
          }
          return response;
        })
        .catch(function () {
          return cached;
        });

      return cached || network;
    })
  );
});
