/* ============================================================
   10. SHORTCUTS — Hành động dùng chung
   ------------------------------------------------------------
   Mọi nút có data-action="..." đều chạy qua runAction().
   Nút có data-text="..." sẽ chèn ký tự tại con trỏ (phím ảo).
   Dùng event delegation nên nút sinh động cũng hoạt động.
   ============================================================ */
(function (global) {
  'use strict';

  var App = global.ME = global.ME || {};
  var state = App.state;
  var utils = App.utils;

  /* ---------- Clipboard ---------- */

  function createOffscreenTextarea(value) {
    var textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-hidden', 'true');
    textarea.setAttribute('inputmode', 'none');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    return textarea;
  }

  function legacyWriteClipboard(text) {
    var textarea = createOffscreenTextarea(text);
    var ok = false;

    try {
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }

    document.body.removeChild(textarea);
    return ok;
  }

  async function writeClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        /* thử fallback bên dưới */
      }
    }
    return legacyWriteClipboard(text);
  }

  async function readClipboard() {
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        return await navigator.clipboard.readText();
      } catch (err) {
        /* thử fallback bên dưới */
      }
    }

    var textarea = createOffscreenTextarea('');
    var ok = false;

    try {
      textarea.focus();
      ok = document.execCommand('paste');
    } catch (err) {
      ok = false;
    }

    var value = textarea.value;
    document.body.removeChild(textarea);
    return ok ? value : null;
  }

  /* ---------- Tiện ích selection ---------- */

  function getSelectedText(editor, allowLineFallback) {
    var model = editor.getModel();
    var selection = editor.getSelection();
    if (!model || !selection) return '';

    if (!selection.isEmpty()) return model.getValueInRange(selection);
    if (!allowLineFallback) return '';

    var position = editor.getPosition();
    if (!position) return '';
    return model.getLineContent(position.lineNumber) +
      (position.lineNumber < model.getLineCount() ? '\n' : '');
  }

  function getCutRange(editor, selection) {
    if (!selection.isEmpty()) return selection;

    var model = editor.getModel();
    var position = editor.getPosition();
    if (!model || !position) return null;

    var line = position.lineNumber;

    if (model.getLineCount() === 1) {
      return new state.monaco.Range(1, 1, 1, model.getLineMaxColumn(1));
    }

    if (line === model.getLineCount()) {
      return new state.monaco.Range(
        line - 1, model.getLineMaxColumn(line - 1),
        line, model.getLineMaxColumn(line)
      );
    }

    return new state.monaco.Range(line, 1, line + 1, 1);
  }

  /* ---------- Hành động ---------- */

  var handlers = {
    selectAll: async function (editor) {
      var model = editor.getModel();
      if (!model) return 'Ctrl+A: editor chưa có nội dung';
      editor.setSelection(model.getFullModelRange());
      editor.focus();
      return 'Ctrl+A: đã chọn tất cả';
    },

    copy: async function (editor) {
      var selection = editor.getSelection();
      var lineFallback = !!selection && selection.isEmpty();
      var text = getSelectedText(editor, true);
      if (!text) return 'Ctrl+C: không có nội dung để sao chép';

      var ok = await writeClipboard(text);
      if (!ok) return 'Ctrl+C: trình duyệt chặn clipboard';
      return 'Ctrl+C: đã sao chép ' +
        (lineFallback ? 'dòng hiện tại' : text.length + ' ký tự');
    },

    cut: async function (editor) {
      var selection = editor.getSelection();
      if (!selection) return 'Ctrl+X: không xác định được vùng chọn';

      var text = getSelectedText(editor, true);
      if (!text) return 'Ctrl+X: không có nội dung để cắt';

      var ok = await writeClipboard(text);
      if (!ok) return 'Ctrl+X: không ghi được clipboard nên chưa cắt';

      var range = getCutRange(editor, selection);
      if (!range) return 'Ctrl+X: không xác định được dòng';

      editor.pushUndoStop();
      editor.executeEdits('cut', [{ range: range, text: '' }]);
      editor.pushUndoStop();
      editor.focus();
      return 'Ctrl+X: đã cắt';
    },

    paste: async function (editor) {
      var text = await readClipboard();
      if (text === null) {
        return 'Ctrl+V: không đọc được clipboard — nhấn giữ trong vùng code để dán';
      }
      if (text === '') return 'Ctrl+V: clipboard trống';

      var selection = editor.getSelection();
      if (!selection) return 'Ctrl+V: không xác định được vị trí con trỏ';

      editor.pushUndoStop();
      editor.executeEdits('paste', [{
        range: selection,
        text: text,
        forceMoveMarkers: true
      }]);
      editor.pushUndoStop();
      editor.focus();
      return 'Ctrl+V: đã dán ' + text.length + ' ký tự';
    },

    undo: async function (editor) {
      editor.focus();
      editor.trigger('shortcut', 'undo', null);
      return 'Ctrl+Z: hoàn tác';
    },

    redo: async function (editor) {
      editor.focus();
      editor.trigger('shortcut', 'redo', null);
      return 'Ctrl+Y: làm lại';
    },

    find: async function (editor) {
      editor.focus();
      editor.trigger('shortcut', 'editor.action.startFindAction', null);
      return 'Ctrl+F: tìm kiếm';
    },

    save: async function () {
      await App.files.saveCurrentFile();
      return null;
    },

    preview: async function () {
      await App.preview.previewHtml(false);
      return null;
    },

    comment: async function (editor) {
      editor.focus();
      editor.trigger('shortcut', 'editor.action.commentLine', null);
      return 'Ctrl+/: bật/tắt comment';
    },

    duplicate: async function (editor) {
      editor.focus();
      editor.trigger('shortcut', 'editor.action.copyLinesDownAction', null);
      return 'Ctrl+D: đã nhân dòng';
    },

    deleteLine: async function (editor) {
      editor.focus();
      editor.trigger('shortcut', 'editor.action.deleteLines', null);
      return 'Đã xóa dòng';
    },

    gotoLine: async function (editor) {
      editor.focus();
      editor.trigger('shortcut', 'editor.action.gotoLine', null);
      return 'Ctrl+G: tới dòng';
    },

    cursorLeft: async function (editor) {
      editor.trigger('shortcut', 'cursorLeft', null);
      editor.focus();
      return null;
    },

    cursorRight: async function (editor) {
      editor.trigger('shortcut', 'cursorRight', null);
      editor.focus();
      return null;
    },

    cursorUp: async function (editor) {
      editor.trigger('shortcut', 'cursorUp', null);
      editor.focus();
      return null;
    },

    cursorDown: async function (editor) {
      editor.trigger('shortcut', 'cursorDown', null);
      editor.focus();
      return null;
    },

    cursorHome: async function (editor) {
      editor.trigger('shortcut', 'cursorHome', null);
      editor.focus();
      return null;
    },

    cursorEnd: async function (editor) {
      editor.trigger('shortcut', 'cursorEnd', null);
      editor.focus();
      return null;
    },

    insertTab: async function (editor) {
      editor.trigger('keyboard', 'tab', null);
      editor.focus();
      return 'Đã chèn Tab';
    },

    account: async function () {
      return 'Bản offline — không cần đăng nhập tài khoản.';
    }
  };

  var EDITOR_ACTIONS = {
    selectAll: true, copy: true, cut: true, paste: true,
    undo: true, redo: true, find: true, comment: true,
    duplicate: true, deleteLine: true, gotoLine: true,
    cursorLeft: true, cursorRight: true, cursorUp: true,
    cursorDown: true, cursorHome: true, cursorEnd: true,
    insertTab: true
  };

  async function runAction(action) {
    var editor = state.editor;

    if (EDITOR_ACTIONS[action] && !editor) {
      utils.setStatus('Editor chưa sẵn sàng');
      return;
    }

    var handler = handlers[action];
    if (!handler) return;

    try {
      var message = await handler(editor);
      if (message) utils.setStatus(message);
    } catch (err) {
      utils.setStatus('Lỗi phím tắt: ' + (err && err.message ? err.message : err));
    }
  }

  /* ---------- Sự kiện ---------- */

  /* ---------- Phím ảo: chèn ký tự tại con trỏ ---------- */

  function insertTextAtCursor(text) {
    var editor = state.editor;
    if (!editor) {
      utils.setStatus('Editor chưa sẵn sàng');
      return;
    }

    var selection = editor.getSelection();
    if (!selection) return;

    editor.pushUndoStop();
    editor.executeEdits('vkey', [{
      range: selection,
      text: text,
      forceMoveMarkers: true
    }]);
    editor.pushUndoStop();
    editor.focus();
  }

  /* Một listener duy nhất cho mọi nút [data-action] và [data-text].
     Event delegation giúp nút sinh động (phím ảo, công cụ) cũng chạy. */
  function onClick(event) {
    var target = event.target;
    if (!target || typeof target.closest !== 'function') return;

    var textBtn = target.closest('[data-text]');
    if (textBtn) {
      event.preventDefault();
      insertTextAtCursor(textBtn.getAttribute('data-text'));
      return;
    }

    var actionBtn = target.closest('[data-action]');
    if (!actionBtn) return;

    event.preventDefault();
    runAction(actionBtn.getAttribute('data-action'));
  }

  function onHardwareKeydown(event) {
    var modifier = event.ctrlKey || event.metaKey;
    if (!modifier) return;

    var key = (event.key || '').toLowerCase();

    if (key === 's') {
      event.preventDefault();
      event.stopPropagation();
      App.files.saveCurrentFile();
    } else if (key === 'o') {
      event.preventDefault();
      event.stopPropagation();
      App.files.openFileFS();
    }
  }

  function init() {
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onHardwareKeydown, true);
  }

  App.shortcuts = {
    init: init,
    runAction: runAction,
    insertTextAtCursor: insertTextAtCursor,
    handlers: handlers
  };
})(window);
