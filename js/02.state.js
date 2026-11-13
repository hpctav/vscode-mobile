/* ============================================================
   02. STATE — Trạng thái dùng chung
   ------------------------------------------------------------
   Chỉ giữ dữ liệu. Không truy vấn DOM, không gọi API.
   Mọi module đọc/ghi qua App.state.
   ============================================================ */
(function (global) {
  'use strict';

  var App = global.ME = global.ME || {};

  App.state = {
    /* Editor */
    editor: null,
    monaco: null,
    wordWrap: 'on',
    fontSize: 14,
    dirty: false,

    /* Công cụ Monaco (group 2) — trạng thái bật/tắt */
    editorTools: {
      lineNumbers: 'on',
      minimap: false,
      whitespace: false,
      folding: false,
      lineHighlight: 'line',
      indentGuides: true,
      stickyScroll: false
    },

    /* File đang mở */
    currentFileHandle: null,
    currentFilePath: '',
    currentLanguage: 'html',

    /* Thư mục đang mở */
    dirHandle: null,
    dirName: '',
    fileEntries: new Map(),
    expandedDirs: new Set(),

    /* Điều hướng tab (back/forward) */
    fileHistory: [],
    historyIndex: -1,

    /* Preview */
    previewBlobUrls: [],
    autoPreviewTimer: null,
    suppressAutoPreview: false,

    /* Giao diện */
    activeView: 'explorer',
    sidebarOpen: false,
    paletteOpen: false,
    paletteIndex: 0,
    searchCaseSensitive: false,
    vkeysOpen: true,
    toolRailOpen: false
  };
})(window);
