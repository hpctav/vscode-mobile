# VS Code Mobile

Giao diện soạn thảo code trên điện thoại, lấy cảm hứng trực tiếp từ **VS Code Workbench**.
Toàn bộ chỉ dùng **HTML + CSS + JavaScript thuần + SVG**, không framework, không build step,
mở được trực tiếp bằng `file://`.

- Editor: **Monaco Editor** — lõi soạn thảo chính thức của VS Code.
- Icon: **@vscode/codicons** — bộ icon chính thức của VS Code (MIT).
- Màu sắc / bố cục: theme **Dark+** của VS Code.

> Đây là dự án học tập, không phải sản phẩm chính thức của Microsoft.

---

## 1. Chạy thử

1. Giải nén thư mục `vscode-mobile`.
2. Mở `index.html` bằng **Chrome / Edge** trên Android.
3. Lần đầu cần Internet để tải Monaco từ CDN jsDelivr.

Khuyến nghị:

- Dùng Chrome/Edge để có **File System Access API**: mở cả thư mục, lưu đè file, preview tự cập nhật.
- Trình duyệt không hỗ trợ API này vẫn dùng được qua nút “Mở file” / “Mở thư mục” (input ẩn).
- Nếu mở bằng `file://`, preview HTML vẫn chạy nhờ cơ chế đổi asset sang `blob:` URL.
- Muốn **cài PWA và dùng offline**, phải phục vụ qua HTTPS hoặc `http://localhost`
  (ví dụ GitHub Pages). `file://` không đăng ký được service worker — xem mục 7.

---

## 2. Cấu trúc file

```
vscode-mobile/
├─ index.html          Khung giao diện: title bar, sidebar (chứa activity bar),
│                      tabs, breadcrumbs, status bar, bottom area, tool rail,
│                      palette, preview.
├─ manifest.webmanifest PWA manifest: tên, màu, icon, chế độ standalone.
├─ sw.js               Service worker: cache app shell để mở offline.
├─ icons/              Nơi đặt icon PWA (xem mục 7):
│                      icon-192.png, icon-512.png, icon-maskable-512.png.
├─ css/
│  └─ styles.css       CSS tối giản, chia 12 phần theo thứ tự đọc.
└─ js/
   ├─ 01.constants.js  Hằng số: phiên bản Monaco, map ngôn ngữ, nội dung mẫu.
   ├─ 02.state.js      Trạng thái dùng chung (chỉ dữ liệu, không DOM).
   ├─ 03.icons.js      SVG sprite sinh từ Codicons + map icon theo loại file.
   ├─ 04.dom.js        Gom mọi getElementById vào một chỗ.
   ├─ 05.utils.js      Hàm tiện ích: đường dẫn, ngôn ngữ, escape, debounce.
   ├─ 06.commands.js   DỮ LIỆU JSON: lệnh palette, phím ảo, 12 công cụ Monaco.
   ├─ 07.ui.js         Workbench: sidebar, tabs, status bar, palette, bottom area.
   ├─ 08.files.js      Mở/lưu file, duyệt thư mục, dựng cây file.
   ├─ 09.preview.js    Preview HTML: rewrite CSS/JS/ảnh/font sang blob URL.
   ├─ 10.shortcuts.js  Bộ xử lý data-action/data-text + clipboard + phím cứng.
   ├─ 11.editor.js     Khởi tạo Monaco, công cụ Monaco, nối sự kiện.
   └─ 12.main.js       Bootstrap: gọi init() + đăng ký service worker.
```

Thứ tự nạp trong `index.html` cũng chính là thứ tự số `01 → 12`.
Mỗi file là một IIFE gắn API vào `window.ME`, nên không cần ES module.

### Vì sao dữ liệu lệnh không nằm trong file `.json`?

`fetch('commands.json')` bị chặn CORS khi mở bằng `file://`. Vì vậy dữ liệu
JSON được nhúng trong `06.commands.js` dưới dạng **mảng object thuần JSON**
(chỉ string/boolean/array/object, không chứa hàm). Muốn thêm lệnh, chỉ sửa
`COMMAND_DATA`; muốn thêm hành vi, thêm hàm vào `ACTIONS`. Khi chạy qua HTTP,
có thể tách nguyên mảng này ra file `.json` mà không phải sửa UI.

---

## 3. Luồng khởi động

Chỉ cần đọc `js/12.main.js` là hiểu toàn bộ quá trình:

```js
App.ui.init();        // 1. dựng khung, palette, group 1, đo bottom area
App.files.init();     // 2. gắn nút mở/lưu file + input ẩn
App.preview.init();   // 3. gắn nút refresh/đóng preview
App.shortcuts.init(); // 4. event delegation cho [data-action]/[data-text]
App.editor.init();    // 5. tải Monaco (bất đồng bộ), dựng group 2
registerPwa();        // 6. đăng ký sw.js nếu HTTPS/localhost
```

Thứ tự cố ý: **UI trước → dữ liệu → hành động → editor → PWA**.
Monaco được tải sau cùng vì phụ thuộc CDN và cần DOM/UI sẵn sàng.
PWA đăng ký độc lập: lỗi service worker chỉ ghi log, không chặn giao diện.

Luồng dữ liệu đơn giản:

```
Người dùng bấm nút
   → 10.shortcuts.js (data-action/data-text) hoặc 07.ui.js (nút giao diện)
   → 06.commands.js tra action → 08.files.js / 09.preview.js / 11.editor.js
   → cập nhật 02.state.js
   → 07.ui.js vẽ lại tabs, status bar, cây file…
```

---

## 4. Tính năng

### Giao diện kiểu VS Code
- Title bar + command center, nút back/forward.
- Activity bar nằm **trong sidebar** (cột dọc 44px): Explorer, Search,
  Source Control, Run, Extensions, Account, Settings.
- Sidebar trượt trên mobile, cố định trên màn hình rộng (≥ 900px).
- Tabs có dấu chấm “dirty”, nút đóng tab, breadcrumbs.
- Status bar: cursor, ngôn ngữ, số lỗi/cảnh báo, nhánh Git (minh hoạ).
- Command Palette đọc lệnh từ dữ liệu JSON trong `06.commands.js`.

### Soạn thảo
- Monaco Editor với tô màu cú pháp, tìm kiếm, minimap tắt cho gọn.
- Word wrap, đổi theme Dark / Light / High Contrast.
- Đổi ngôn ngữ thủ công hoặc tự nhận theo phần mở rộng file.
- Undo / redo, copy / cut / paste, comment, nhân dòng, xoá dòng, tới dòng.
- 12 công cụ Monaco bật/tắt nhanh: số dòng, cỡ chữ, word wrap, minimap,
  khoảng trắng, gấp code, highlight dòng, format, theme, đường gióng thụt lề,
  sticky scroll.

### File & thư mục
- Mở file đơn hoặc cả thư mục (File System Access API).
- Fallback `<input type="file">` và `<input webkitdirectory>`.
- Cây file có icon theo phần mở rộng, mở/đóng thư mục, làm mới, thu gọn.
- Tạo file mới; tạo thư mục con khi đã mở thư mục bằng API.
- Lưu đè file gốc hoặc tải xuống nếu không có quyền ghi.

### Preview HTML
- Đọc HTML đang mở, đổi đường dẫn tương đối sang `blob:` URL.
- Hỗ trợ `src`, `href` (trừ `<a>`), `srcset`, `poster`, `data`, SVG `<use>`,
  CSS `url(...)`, `@import`, thẻ `<style>` và `style=""`.
- Tự cập nhật sau khi ngừng gõ (có thể tắt bằng checkbox “Auto”).
- Chạy được cả khi app mở bằng `file://`.

### Bottom area — 3 tầng điều khiển

**Group 1 — phím ảo cuộn ngang** (`#vkeyBar`)

Hàng phím ảo sinh từ `App.commands.vkeys`, cuộn ngang bằng vuốt:

- `Tab`, `← ↑ ↓ →`, `Home`, `End`.
- Dấu câu và ký tự hay dùng: `{ } ( ) [ ] < > " ' \` ; : = + - _ / * & | ! ? $ # @ % ^ ~ \ , .`
- Nút `Phím` trong dock ẩn/hiện cả hàng.

**Dock thao tác nhanh** (`#bottomDock`)

| Nút | Chức năng |
| --- | --- |
| Menu | Mở/đóng sidebar |
| Undo / Redo | Hoàn tác / làm lại |
| Gõ | Đưa focus vào editor để mở bàn phím |
| Lệnh | Mở Command Palette |
| Lưu | Lưu file hiện tại |
| Xem | Mở preview HTML |
| Phím | Ẩn/hiện group 1 |
| Công cụ | Ẩn/hiện group 2 |

**Group 2 — rail công cụ Monaco** (`#toolRail`)

Cột icon dọc sát phải, trượt lên từ đáy, cuộn dọc khi thiếu chỗ:

- Chỉ icon + tooltip/`aria-label`, không chiếm thêm chiều ngang editor.
- 12 công cụ: số dòng, tăng/giảm cỡ chữ, word wrap, minimap, khoảng trắng,
  gấp code, highlight dòng, format, theme, đường gióng thụt lề, sticky scroll.
- Trạng thái bật/tắt được tô sáng; dữ liệu lấy từ `App.commands.tools`.

Cả bottom area tự đo chiều cao (`--dock-h`) và chừa chỗ cho bàn phím ảo
qua `visualViewport` (`--vkbd`).

---

## 5. Phím tắt

| Phím | Hành động |
| --- | --- |
| `Ctrl/Cmd + S` | Lưu file |
| `Ctrl/Cmd + O` | Mở file |
| `Ctrl/Cmd + Shift + P` hoặc `F1` | Command Palette |
| `Ctrl/Cmd + F` | Tìm trong file |
| `Ctrl/Cmd + G` | Tới dòng |
| `Ctrl/Cmd + /` | Bật/tắt comment |
| `Ctrl/Cmd + D` | Nhân dòng |
| `Ctrl/Cmd + A/C/X/V` | Chọn tất cả / sao chép / cắt / dán |
| `Esc` | Đóng palette / rail công cụ / sidebar / preview |

Trên mobile, mọi thao tác trên đều có nút tương ứng trong dock, Settings
hoặc Command Palette — không cần bàn phím vật lý.

---

## 6. Ghi chú kỹ thuật

- **Không build step.** Không npm, không bundler, không ES module.
- **Không framework.** Chỉ DOM API; app không dùng `fetch` để đọc dữ liệu
  (dữ liệu lệnh nhúng sẵn trong `06.commands.js`). Riêng `sw.js` dùng `fetch`
  để cache app shell.
- **Icon offline.** `03.icons.js` chứa sẵn SVG sprite; không tải icon từ mạng.
- **Monaco online.** Monaco lấy từ:
  `https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs`
  Nếu offline, app hiện thông báo lỗi thay vì màn hình trắng.
- **An toàn preview.** iframe dùng `sandbox="allow-scripts allow-same-origin"`.
- **Không có Git thật.** Mục Source Control chỉ minh hoạ giao diện.
- **Giới hạn đã biết.** Thư mục rỗng không hiện trong cây file; một số trình duyệt
  chặn clipboard khi không có thao tác trực tiếp của người dùng.

Kiểm thử tự động (cần Node + jsdom, chỉ dùng khi phát triển):

```bash
node /tmp/opencode/test/smoke-vscode.js
```

---

## 7. PWA — cài lên màn hình chính

Bộ ba file PWA:

| File | Vai trò |
| --- | --- |
| `manifest.webmanifest` | Tên app, màu, icon, `start_url`, chế độ `standalone`. |
| `sw.js` | Cache app shell (HTML/CSS/JS/manifest) để mở offline. |
| `js/12.main.js` | Gọi `registerPwa()` để đăng ký `sw.js`. |

### 7.1. Chuẩn bị icon

Đặt 3 file PNG vào thư mục `icons/` với đúng tên:

| File | Kích thước | Purpose | Ghi chú |
| --- | --- | --- | --- |
| `icons/icon-192.png` | 192×192 | `any` | Icon thường, dùng cả cho `apple-touch-icon`. |
| `icons/icon-512.png` | 512×512 | `any` | Icon độ phân giải cao. |
| `icons/icon-maskable-512.png` | 512×512 | `maskable` | Nền phủ kín; nội dung chính nằm trong vùng an toàn ~80%. |

Nên dùng cùng một thiết kế, nền đặc (không trong suốt) để icon maskable
không bị cắt xấu trên launcher Android.

Nếu icon được host công khai ở repo GitHub khác, sửa `src` trong
`manifest.webmanifest` thành URL tuyệt đối, ví dụ:

```json
"src": "https://raw.githubusercontent.com/<user>/<repo>/main/icons/icon-192.png"
```

Khuyến nghị giữ icon **cùng origin** với app (đặt trong `icons/` và deploy
cùng GitHub Pages) để tránh lỗi CORS và cache không ổn định.

### 7.2. Deploy để cài PWA

PWA chỉ hoạt động khi app được phục vụ qua **HTTPS** hoặc `http://localhost`.
Mở bằng `file://` vẫn dùng được giao diện nhưng **không** đăng ký được service worker.

Cách nhanh với GitHub Pages:

1. Push thư mục `vscode-mobile/` lên repository GitHub.
2. Vào **Settings → Pages**, chọn deploy từ nhánh `main`, thư mục `/ (root)`.
3. Mở `https://<user>.github.io/<repo>/vscode-mobile/`.
4. Trên Chrome Android: menu **⋮ → Add to Home screen / Install app**.

Vì `start_url` và `scope` đều là `./`, app chạy đúng cả khi nằm trong thư mục con.
Khi test trên máy tính, có thể chạy `python3 -m http.server 8000` trong thư mục
`vscode-mobile/` rồi mở `http://localhost:8000`.

Kiểm tra bằng Chrome DevTools → **Application**:

- **Manifest**: không báo lỗi, thấy đủ 3 icon.
- **Service Workers**: trạng thái `activated and is running`.
- **Cache Storage**: có cache `vscode-mobile-v1`.

### 7.3. Cập nhật app

Mỗi khi sửa HTML/CSS/JS, tăng phiên bản cache trong `sw.js`:

```js
var CACHE_VERSION = 'v2'; // v1 → v2 → v3…
```

Sau khi deploy, mở app và reload một lần (hoặc đóng hẳn rồi mở lại)
để service worker tải bản mới. Nếu vẫn thấy bản cũ, vào DevTools →
Application → Service Workers → **Update**.

Ghi chú offline:

- App shell (HTML/CSS/JS/icon/manifest) được cache, nên giao diện mở được khi mất mạng.
- Monaco vẫn tải từ CDN jsDelivr; lần đầu cần mạng. Trình duyệt có thể dùng
  HTTP cache cho các lần sau, nhưng `sw.js` cố tình không cache CDN để tránh phình cache.
- Icon PWA không nằm trong `APP_SHELL` (để tránh lỗi cài đặt nếu chưa upload icon).
  Sau khi đã có icon, service worker vẫn tự cache chúng ở lần tải đầu tiên.

---

## 8. Ghi công

- [Monaco Editor](https://github.com/microsoft/monaco-editor) — MIT.
- [@vscode/codicons](https://github.com/microsoft/vscode-codicons) — MIT.
- Giao diện tham khảo [VS Code](https://github.com/microsoft/vscode) — MIT.
- Đây là dự án độc lập, không liên kết với Microsoft.

Chúc bạn học vui. Đọc theo thứ tự `01 → 12` là cách nhanh nhất để hiểu toàn bộ mã nguồn.
