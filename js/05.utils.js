/* ============================================================
   05. UTILS — Hàm tiện ích dùng chung
   ------------------------------------------------------------
   Không phụ thuộc module nào khác ngoài App.state/App.dom.
   ============================================================ */
(function (global) {
  'use strict';

  var App = global.ME = global.ME || {};
  var state = App.state;

  function setStatus(message) {
    var el = App.dom.status;
    if (!el) return;
    el.textContent = message;
    el.title = message;
  }

  function focusEditor() {
    if (state.editor) state.editor.focus();
  }

  function showError(message) {
    setStatus('Lỗi tải editor');
    var el = App.dom.fallback;
    if (!el) return;
    el.hidden = false;
    el.textContent = message;
  }

  function extToLang(name) {
    var match = /\.([^.]+)$/.exec(name || '');
    var ext = match ? match[1].toLowerCase() : '';
    return App.EXT_LANG[ext] || 'plaintext';
  }

  function langLabel(lang) {
    return App.LANG_LABELS[lang] || String(lang || 'Plain Text');
  }

  function isHtmlPath(path, lang) {
    return lang === 'html' || /\.html?$/i.test(path || '');
  }

  function basename(path) {
    var text = String(path || '').replace(/\\/g, '/');
    var index = text.lastIndexOf('/');
    return index >= 0 ? text.slice(index + 1) : text;
  }

  function dirname(path) {
    if (!path) return '';
    var index = path.lastIndexOf('/');
    return index >= 0 ? path.slice(0, index) : '';
  }

  /**
   * Chuẩn hoá đường dẫn tương đối so với file hiện tại.
   * Trả về null với URL tuyệt đối / không xử lý được.
   */
  function normalizePath(base, rel) {
    rel = (rel || '').trim().replace(/\\/g, '/');
    if (!rel) return null;
    if (/^(https?:|data:|blob:|mailto:|tel:|javascript:|#|\/\/)/i.test(rel)) return null;

    rel = rel.replace(/[?#].*$/, '');
    try {
      rel = decodeURI(rel);
    } catch (err) {
      /* giữ nguyên nếu chuỗi percent-encoding không hợp lệ */
    }
    if (!rel) return null;

    var baseDir = dirname(base);
    var combined = rel.charAt(0) === '/' ? rel.slice(1) : (baseDir ? baseDir + '/' + rel : rel);
    var parts = combined.split('/');
    var out = [];

    parts.forEach(function (part) {
      if (!part || part === '.') return;
      if (part === '..') out.pop();
      else out.push(part);
    });

    return out.join('/');
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var args = arguments;
      var self = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(self, args);
      }, delay);
    };
  }

  App.utils = {
    setStatus: setStatus,
    focusEditor: focusEditor,
    showError: showError,
    extToLang: extToLang,
    langLabel: langLabel,
    isHtmlPath: isHtmlPath,
    basename: basename,
    dirname: dirname,
    normalizePath: normalizePath,
    escapeHtml: escapeHtml,
    escapeRegExp: escapeRegExp,
    debounce: debounce
  };
})(window);
