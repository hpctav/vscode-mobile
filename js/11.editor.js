/* ============================================================
   11. EDITOR — Monaco (lõi soạn thảo của VS Code)
   ------------------------------------------------------------
   Tạo editor, nối sự kiện con trỏ/nội dung/marker với UI.
   Group 2: 12 công cụ Monaco (chỉ icon) đọc từ 06.commands.js.
   Mọi thao tác phím tắt đi qua App.shortcuts.runAction().
   ============================================================ */
(function (global) {
  'use strict';

  var App = global.ME = global.ME || {};
  var state = App.state;
  var dom = App.dom;
  var utils = App.utils;
  var refreshSearch = null;

  function init() {
    /* Dựng rail ngay, không đợi Monaco: vẫn thấy đủ 12 công cụ
       (bấm sẽ báo "Editor chưa sẵn sàng" nếu CDN lỗi). */
    renderToolRail();

    if (typeof global.require === 'undefined') {
      utils.showError('Không tải được Monaco loader. Kiểm tra kết nối mạng/CDN.');
      return;
    }

    global.require.config({ paths: { vs: App.MONACO_VS } });
    global.require(['vs/editor/editor.main'], createEditor, function (err) {
      utils.showError('Lỗi khi tải Monaco: ' +
        (err && err.message ? err.message : String(err)));
    });
  }

  function createEditor() {
    try {
      var monaco = global.monaco;
      state.monaco = monaco;

      var editor = monaco.editor.create(dom.editorHost, {
        value: App.DEFAULT_CONTENT,
        language: 'html',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: state.editorTools.minimap },
        fontSize: state.fontSize,
        lineHeight: state.fontSize + 8,
        fontFamily: "'Droid Sans Mono', 'SF Mono', Menlo, Consolas, monospace",
        wordWrap: state.wordWrap,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        roundedSelection: true,
        padding: { top: 12, bottom: 12 },
        folding: state.editorTools.folding,
        glyphMargin: false,
        lineNumbers: state.editorTools.lineNumbers,
        lineNumbersMinChars: 3,
        renderLineHighlight: state.editorTools.lineHighlight,
        renderWhitespace: state.editorTools.whitespace ? 'all' : 'selection',
        guides: { indentation: state.editorTools.indentGuides },
        stickyScroll: { enabled: state.editorTools.stickyScroll },
        quickSuggestions: false,
        suggestOnTriggerCharacters: false,
        acceptSuggestionOnEnter: 'off',
        tabSize: 2,
        insertSpaces: true,
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8
        }
      });

      state.editor = editor;

      /* setValue không kích hoạt auto-preview / dirty khi mở file */
      editor.__setValueQuiet = function (value) {
        state.suppressAutoPreview = true;
        editor.setValue(value);
        state.suppressAutoPreview = false;
      };

      editor.onDidChangeModelContent(function () {
        if (state.suppressAutoPreview) return;

        App.ui.setDirty(true);
        App.preview.scheduleAutoPreview();

        if (refreshSearch) refreshSearch();
      });

      editor.onDidChangeCursorPosition(function (event) {
        App.ui.updateCursor(event.position);
      });

      monaco.editor.onDidChangeMarkers(function () {
        var model = editor.getModel();
        if (!model) return;
        App.ui.updateProblems(monaco.editor.getModelMarkers({ resource: model.uri }));
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {
        App.files.saveCurrentFile();
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO, function () {
        App.files.openFileFS();
      });

      refreshSearch = utils.debounce(function () {
        if (dom.searchInput.value) App.ui.searchInFile(dom.searchInput.value);
      }, 300);

      bindToolbar(editor, monaco);

      dom.language.value = 'html';
      App.ui.updateLanguage('html');
      App.ui.updateCursor(editor.getPosition());
      App.ui.setDirty(false);
      App.ui.updateViewportInsets();
      App.ui.updateDockHeight();

      utils.setStatus('Sẵn sàng — Monaco đã tải');
      editor.layout();
    } catch (err) {
      utils.showError('Không khởi tạo được editor: ' +
        (err && err.message ? err.message : err));
    }
  }

  function bindToolbar(editor, monaco) {
    dom.language.addEventListener('change', function () {
      var model = editor.getModel();
      var lang = dom.language.value;
      if (model) monaco.editor.setModelLanguage(model, lang);

      App.ui.updateLanguage(lang);
      App.ui.setActiveFile(state.currentFilePath, lang, { history: false });
      utils.focusEditor();
      App.preview.scheduleAutoPreview();
    });

    dom.theme.addEventListener('change', function () {
      monaco.editor.setTheme(dom.theme.value);
      utils.focusEditor();
    });

    dom.wrapBtn.addEventListener('click', toggleWordWrap);
  }

  /* ==========================================================
     GROUP 2 — 12 công cụ Monaco
     ========================================================== */

  function changeFontSize(delta) {
    var editor = state.editor;
    if (!editor) return 'Editor chưa sẵn sàng';

    var size = Math.max(10, Math.min(24, state.fontSize + delta));
    if (size === state.fontSize) return 'Cỡ chữ: ' + size + 'px (đã tới giới hạn)';

    state.fontSize = size;
    editor.updateOptions({ fontSize: size, lineHeight: size + 8 });
    return 'Cỡ chữ: ' + size + 'px';
  }

  function toggleWordWrap() {
    var editor = state.editor;
    if (!editor) {
      utils.setStatus('Editor chưa sẵn sàng');
      return;
    }

    state.wordWrap = state.wordWrap === 'on' ? 'off' : 'on';
    editor.updateOptions({ wordWrap: state.wordWrap });

    var label = dom.wrapBtn.querySelector('span');
    if (label) label.textContent = 'Word wrap: ' + (state.wordWrap === 'on' ? 'On' : 'Off');
    dom.wrapBtn.setAttribute('aria-pressed', String(state.wordWrap === 'on'));

    utils.focusEditor();
    utils.setStatus('Word wrap: ' + state.wordWrap);
  }

  var toolHandlers = {
    lineNumbers: function (editor) {
      var tools = state.editorTools;
      tools.lineNumbers = tools.lineNumbers === 'on' ? 'off' : 'on';
      editor.updateOptions({ lineNumbers: tools.lineNumbers });
      return 'Số dòng: ' + tools.lineNumbers;
    },

    fontUp: function () { return changeFontSize(1); },
    fontDown: function () { return changeFontSize(-1); },
    wordWrap: function () { return toggleWordWrap(); },

    minimap: function (editor) {
      var tools = state.editorTools;
      tools.minimap = !tools.minimap;
      editor.updateOptions({ minimap: { enabled: tools.minimap } });
      return 'Minimap: ' + (tools.minimap ? 'bật' : 'tắt');
    },

    whitespace: function (editor) {
      var tools = state.editorTools;
      tools.whitespace = !tools.whitespace;
      editor.updateOptions({ renderWhitespace: tools.whitespace ? 'all' : 'selection' });
      return 'Khoảng trắng: ' + (tools.whitespace ? 'hiện' : 'ẩn');
    },

    folding: function (editor) {
      var tools = state.editorTools;
      tools.folding = !tools.folding;
      editor.updateOptions({ folding: tools.folding });
      return 'Gấp code: ' + (tools.folding ? 'bật' : 'tắt');
    },

    lineHighlight: function (editor) {
      var tools = state.editorTools;
      tools.lineHighlight = tools.lineHighlight === 'line' ? 'none' : 'line';
      editor.updateOptions({ renderLineHighlight: tools.lineHighlight });
      return 'Highlight dòng: ' + tools.lineHighlight;
    },

    format: function (editor) {
      editor.focus();
      editor.trigger('tool', 'editor.action.formatDocument', null);
      return 'Đang format tài liệu…';
    },

    theme: function () {
      var order = ['vs-dark', 'vs', 'hc-black'];
      var current = order.indexOf(dom.theme.value);
      var next = order[(current + 1) % order.length];
      App.ui.setTheme(next);
      return 'Theme: ' + next;
    },

    indentGuides: function (editor) {
      var tools = state.editorTools;
      tools.indentGuides = !tools.indentGuides;
      editor.updateOptions({ guides: { indentation: tools.indentGuides } });
      return 'Đường gióng thụt lề: ' + (tools.indentGuides ? 'bật' : 'tắt');
    },

    stickyScroll: function (editor) {
      var tools = state.editorTools;
      tools.stickyScroll = !tools.stickyScroll;
      editor.updateOptions({ stickyScroll: { enabled: tools.stickyScroll } });
      return 'Sticky scroll: ' + (tools.stickyScroll ? 'bật' : 'tắt');
    }
  };

  function renderToolRail() {
    if (!dom.toolRailList) return;

    var tools = (App.commands && App.commands.tools) || [];
    dom.toolRailList.innerHTML = '';

    tools.forEach(function (tool) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'tool-icon-btn';
      button.title = tool.title;
      button.setAttribute('aria-label', tool.title);
      button.setAttribute('data-tool', tool.id);
      button.innerHTML = App.icons.markup(tool.icon);

      button.addEventListener('click', function () {
        runTool(tool.id);
      });

      dom.toolRailList.appendChild(button);
    });

    updateToolStates();
  }

  function updateToolStates() {
    if (!dom.toolRailList) return;

    var tools = state.editorTools;
    var states = {
      lineNumbers: tools.lineNumbers === 'on',
      minimap: tools.minimap,
      whitespace: tools.whitespace,
      folding: tools.folding,
      lineHighlight: tools.lineHighlight === 'line',
      indentGuides: tools.indentGuides,
      stickyScroll: tools.stickyScroll
    };

    dom.toolRailList.querySelectorAll('[data-tool]').forEach(function (button) {
      var id = button.getAttribute('data-tool');
      if (Object.prototype.hasOwnProperty.call(states, id)) {
        button.classList.toggle('active', !!states[id]);
      }
    });
  }

  function runTool(id) {
    var editor = state.editor;
    if (!editor) {
      utils.setStatus('Editor chưa sẵn sàng');
      return;
    }

    var handler = toolHandlers[id];
    if (!handler) return;

    try {
      var message = handler(editor, state.monaco);
      if (message) utils.setStatus(message);
      updateToolStates();
    } catch (err) {
      utils.setStatus('Lỗi công cụ: ' + (err && err.message ? err.message : err));
    }
  }

  App.editor = {
    init: init,
    focus: function () { utils.focusEditor(); },
    toggleWordWrap: toggleWordWrap,
    runTool: runTool,
    renderToolRail: renderToolRail
  };
})(window);
