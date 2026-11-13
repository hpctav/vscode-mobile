/* ============================================================
   06. COMMANDS — Dữ liệu lệnh, phím ảo, công cụ Monaco
   ------------------------------------------------------------
   TÁCH DỮ LIỆU KHỎI HÀNH VI
   - COMMAND_DATA : mảng JSON cho Command Palette.
   - ACTIONS      : map "action" -> hàm thực thi.
   - VKEY_DATA    : phím ảo cho group 1 (cuộn ngang).
   - TOOL_DATA    : 12 công cụ Monaco cho group 2 (cột dọc).

   VÌ SAO KHÔNG DÙNG FILE .json?
   fetch('commands.json') bị chặn khi mở bằng file:// (CORS).
   Vì vậy dữ liệu JSON được nhúng trong file JS này. Cấu trúc
   vẫn là JSON thuần: chỉ object/array/string/boolean, không
   chứa hàm. Khi chạy qua HTTP, có thể tách sang .json sau.

   MUỐN THÊM MỘT LỆNH?
   1. Thêm object vào COMMAND_DATA.
   2. Trỏ "action" tới một hàm trong ACTIONS.
   3. Nếu là hành vi mới, viết thêm hàm vào ACTIONS.
   Palette tự động hiển thị và tìm kiếm lệnh mới.
   ============================================================ */
(function (global) {
  'use strict';

  var App = global.ME = global.ME || {};

  /* ------------------------------------------------------------
     1. COMMAND PALETTE — dữ liệu thuần JSON
     ------------------------------------------------------------ */
  var COMMAND_DATA = [
    /* File */
    { "id": "file.open", "label": "Mở file…", "key": "Ctrl+O", "icon": "file-code", "category": "File", "action": "openFile" },
    { "id": "file.openFolder", "label": "Mở thư mục…", "key": "", "icon": "folder-opened", "category": "File", "action": "openFolder" },
    { "id": "file.save", "label": "Lưu file", "key": "Ctrl+S", "icon": "save", "category": "File", "action": "save" },
    { "id": "file.close", "label": "Đóng tab hiện tại", "key": "", "icon": "close", "category": "File", "action": "closeTab" },

    /* Preview */
    { "id": "preview.html", "label": "Preview HTML", "key": "", "icon": "globe", "category": "Preview", "action": "preview" },
    { "id": "preview.refresh", "label": "Làm mới Preview", "key": "", "icon": "refresh", "category": "Preview", "action": "preview" },

    /* Soạn thảo */
    { "id": "editor.find", "label": "Tìm trong file", "key": "Ctrl+F", "icon": "search", "category": "Soạn thảo", "action": "find" },
    { "id": "editor.goto", "label": "Tới dòng…", "key": "Ctrl+G", "icon": "arrow-right", "category": "Soạn thảo", "action": "gotoLine" },
    { "id": "editor.comment", "label": "Bật/tắt comment", "key": "Ctrl+/", "icon": "comment-discussion", "category": "Soạn thảo", "action": "comment" },
    { "id": "editor.duplicate", "label": "Nhân dòng xuống", "key": "Ctrl+D", "icon": "add", "category": "Soạn thảo", "action": "duplicate" },
    { "id": "editor.deleteLine", "label": "Xóa dòng", "key": "Ctrl+Shift+K", "icon": "close", "category": "Soạn thảo", "action": "deleteLine" },
    { "id": "editor.selectAll", "label": "Chọn tất cả", "key": "Ctrl+A", "icon": "check", "category": "Soạn thảo", "action": "selectAll" },
    { "id": "editor.wrap", "label": "Bật/tắt Word Wrap", "key": "", "icon": "word-wrap", "category": "Soạn thảo", "action": "toggleWrap" },

    /* Công cụ Monaco */
    { "id": "tool.lineNumbers", "label": "Bật/tắt cột số dòng", "key": "", "icon": "list-ordered", "category": "Monaco", "action": "toolLineNumbers" },
    { "id": "tool.fontUp", "label": "Tăng cỡ chữ", "key": "", "icon": "zoom-in", "category": "Monaco", "action": "toolFontUp" },
    { "id": "tool.fontDown", "label": "Giảm cỡ chữ", "key": "", "icon": "zoom-out", "category": "Monaco", "action": "toolFontDown" },
    { "id": "tool.minimap", "label": "Bật/tắt Minimap", "key": "", "icon": "map", "category": "Monaco", "action": "toolMinimap" },
    { "id": "tool.whitespace", "label": "Hiện/ẩn khoảng trắng", "key": "", "icon": "whitespace", "category": "Monaco", "action": "toolWhitespace" },
    { "id": "tool.format", "label": "Format tài liệu", "key": "Shift+Alt+F", "icon": "wand", "category": "Monaco", "action": "toolFormat" },
    { "id": "tool.theme", "label": "Đổi theme (Dark/Light/HC)", "key": "", "icon": "color-mode", "category": "Monaco", "action": "toolTheme" },

    /* Giao diện */
    { "id": "view.explorer", "label": "Hiện Explorer", "key": "Ctrl+Shift+E", "icon": "files", "category": "Giao diện", "action": "showExplorer" },
    { "id": "view.search", "label": "Hiện Search", "key": "Ctrl+Shift+F", "icon": "search", "category": "Giao diện", "action": "showSearch" },
    { "id": "view.scm", "label": "Hiện Source Control", "key": "Ctrl+Shift+G", "icon": "source-control", "category": "Giao diện", "action": "showScm" },
    { "id": "view.extensions", "label": "Hiện Extensions", "key": "", "icon": "extensions", "category": "Giao diện", "action": "showExtensions" },
    { "id": "view.settings", "label": "Hiện Settings", "key": "", "icon": "settings-gear", "category": "Giao diện", "action": "showSettings" },
    { "id": "layout.sidebar", "label": "Ẩn/hiện Sidebar", "key": "", "icon": "layout-sidebar-left", "category": "Giao diện", "action": "toggleSidebar" },
    { "id": "layout.vkeys", "label": "Ẩn/hiện hàng phím ảo", "key": "", "icon": "symbol-key", "category": "Giao diện", "action": "toggleVkeys" },
    { "id": "layout.toolRail", "label": "Ẩn/hiện cột công cụ Monaco", "key": "", "icon": "tools", "category": "Giao diện", "action": "toggleToolRail" },

    /* Theme */
    { "id": "theme.dark", "label": "Theme: Dark", "key": "", "icon": "symbol-color", "category": "Theme", "action": "themeDark" },
    { "id": "theme.light", "label": "Theme: Light", "key": "", "icon": "symbol-color", "category": "Theme", "action": "themeLight" },
    { "id": "theme.hc", "label": "Theme: High Contrast", "key": "", "icon": "symbol-color", "category": "Theme", "action": "themeHc" },

    /* Trợ giúp */
    { "id": "help.shortcuts", "label": "Xem danh sách phím tắt", "key": "", "icon": "symbol-key", "category": "Trợ giúp", "action": "showShortcuts" }
  ];

  /* ------------------------------------------------------------
     2. ACTION REGISTRY — hành vi tương ứng với "action"
     ------------------------------------------------------------
     Các hàm chỉ gọi App.* khi được bấm, nên module đích có thể
     nạp sau file này mà không lỗi.
     ------------------------------------------------------------ */
  var ACTIONS = {
    openFile: function () { return App.files.openFileFS(); },
    openFolder: function () { return App.files.openFolderFS(); },
    save: function () { return App.files.saveCurrentFile(); },
    closeTab: function () { return App.ui.closeTab(); },
    preview: function () { return App.preview.previewHtml(false); },

    find: function () { return App.shortcuts.runAction('find'); },
    gotoLine: function () { return App.shortcuts.runAction('gotoLine'); },
    comment: function () { return App.shortcuts.runAction('comment'); },
    duplicate: function () { return App.shortcuts.runAction('duplicate'); },
    deleteLine: function () { return App.shortcuts.runAction('deleteLine'); },
    selectAll: function () { return App.shortcuts.runAction('selectAll'); },
    toggleWrap: function () { return App.editor.toggleWordWrap(); },

    toolLineNumbers: function () { return App.editor.runTool('lineNumbers'); },
    toolFontUp: function () { return App.editor.runTool('fontUp'); },
    toolFontDown: function () { return App.editor.runTool('fontDown'); },
    toolMinimap: function () { return App.editor.runTool('minimap'); },
    toolWhitespace: function () { return App.editor.runTool('whitespace'); },
    toolFormat: function () { return App.editor.runTool('format'); },
    toolTheme: function () { return App.editor.runTool('theme'); },

    showExplorer: function () { return App.ui.showView('explorer'); },
    showSearch: function () { return App.ui.showView('search'); },
    showScm: function () { return App.ui.showView('scm'); },
    showExtensions: function () { return App.ui.showView('extensions'); },
    showSettings: function () { return App.ui.showView('settings'); },
    showShortcuts: function () { return App.ui.showView('settings'); },
    toggleSidebar: function () { return App.ui.toggleSidebar(); },
    toggleVkeys: function () { return App.ui.toggleVkeyBar(); },
    toggleToolRail: function () { return App.ui.toggleToolRail(); },

    themeDark: function () { return App.ui.setTheme('vs-dark'); },
    themeLight: function () { return App.ui.setTheme('vs'); },
    themeHc: function () { return App.ui.setTheme('hc-black'); }
  };

  /* ------------------------------------------------------------
     3. GROUP 1 — phím ảo, cuộn ngang
     ------------------------------------------------------------
     "action": dùng lại bộ xử lý trong 10.shortcuts.js.
     "text"  : chèn ký tự tại con trỏ.
     ------------------------------------------------------------ */
  var VKEY_DATA = [
    { "label": "Tab", "title": "Chèn Tab", "action": "insertTab" },
    { "label": "←", "title": "Sang trái", "action": "cursorLeft" },
    { "label": "↑", "title": "Lên", "action": "cursorUp" },
    { "label": "↓", "title": "Xuống", "action": "cursorDown" },
    { "label": "→", "title": "Sang phải", "action": "cursorRight" },
    { "label": "Home", "title": "Đầu dòng", "action": "cursorHome" },
    { "label": "End", "title": "Cuối dòng", "action": "cursorEnd" },

    { "label": "{", "text": "{" },
    { "label": "}", "text": "}" },
    { "label": "(", "text": "(" },
    { "label": ")", "text": ")" },
    { "label": "[", "text": "[" },
    { "label": "]", "text": "]" },
    { "label": "<", "text": "<" },
    { "label": ">", "text": ">" },
    { "label": "\"", "text": "\"" },
    { "label": "'", "text": "'" },
    { "label": "`", "text": "`" },
    { "label": ";", "text": ";" },
    { "label": ":", "text": ":" },
    { "label": "=", "text": "=" },
    { "label": "+", "text": "+" },
    { "label": "-", "text": "-" },
    { "label": "_", "text": "_" },
    { "label": "/", "text": "/" },
    { "label": "*", "text": "*" },
    { "label": "&", "text": "&" },
    { "label": "|", "text": "|" },
    { "label": "!", "text": "!" },
    { "label": "?", "text": "?" },
    { "label": "$", "text": "$" },
    { "label": "#", "text": "#" },
    { "label": "@", "text": "@" },
    { "label": "%", "text": "%" },
    { "label": "^", "text": "^" },
    { "label": "~", "text": "~" },
    { "label": "\\", "text": "\\" },
    { "label": ",", "text": "," },
    { "label": ".", "text": "." }
  ];

  /* ------------------------------------------------------------
     4. GROUP 2 — 12 công cụ Monaco, chỉ icon
     ------------------------------------------------------------
     "id" khớp với App.editor.runTool(id).
     ------------------------------------------------------------ */
  var TOOL_DATA = [
    { "id": "lineNumbers", "icon": "list-ordered", "title": "Bật/tắt cột số dòng" },
    { "id": "fontUp", "icon": "zoom-in", "title": "Tăng cỡ chữ" },
    { "id": "fontDown", "icon": "zoom-out", "title": "Giảm cỡ chữ" },
    { "id": "wordWrap", "icon": "word-wrap", "title": "Bật/tắt Word Wrap" },
    { "id": "minimap", "icon": "map", "title": "Bật/tắt Minimap" },
    { "id": "whitespace", "icon": "whitespace", "title": "Hiện/ẩn khoảng trắng" },
    { "id": "folding", "icon": "fold", "title": "Bật/tắt gấp code" },
    { "id": "lineHighlight", "icon": "list-selection", "title": "Bật/tắt highlight dòng" },
    { "id": "format", "icon": "wand", "title": "Format tài liệu" },
    { "id": "theme", "icon": "color-mode", "title": "Đổi theme" },
    { "id": "indentGuides", "icon": "indent", "title": "Bật/tắt đường gióng thụt lề" },
    { "id": "stickyScroll", "icon": "pin", "title": "Bật/tắt sticky scroll" }
  ];

  function getAction(name) {
    return ACTIONS[name] || null;
  }

  App.commands = {
    data: COMMAND_DATA,
    actions: ACTIONS,
    vkeys: VKEY_DATA,
    tools: TOOL_DATA,
    getAction: getAction
  };
})(window);
