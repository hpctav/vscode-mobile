/* ============================================================
   07. UI — Workbench shell
   ------------------------------------------------------------
   Phụ trách phần "khung" giống VS Code:
   - Sidebar (chứa activity bar dọc bên trong)
   - Tabs, breadcrumbs, status bar
   - Command Palette (đọc dữ liệu từ 06.commands.js)
   - Group 1: hàng phím ảo cuộn ngang
   - Group 2: cột công cụ Monaco trượt lên
   - Kích thước bottom area / bàn phím ảo
   Không chứa logic đọc/ghi file hay Monaco.
   ============================================================ */
(function (global) {
  'use strict';

  var App = global.ME = global.ME || {};
  var state = App.state;
  var dom = App.dom;
  var utils = App.utils;

  var VIEWS = {
    explorer: 'EXPLORER',
    search: 'SEARCH',
    scm: 'SOURCE CONTROL',
    run: 'RUN AND DEBUG',
    extensions: 'EXTENSIONS',
    settings: 'SETTINGS'
  };

  var visibleCommands = [];
  var dockObserver = null;

  /* ==========================================================
     SIDEBAR
     ========================================================== */

  function setSidebarOpen(open) {
    state.sidebarOpen = !!open;
    dom.sidebar.classList.toggle('open', state.sidebarOpen);
    dom.sidebarScrim.hidden = !state.sidebarOpen;
    dom.menuBtn.setAttribute('aria-expanded', String(state.sidebarOpen));
    dom.toggleSidebarBtn.setAttribute('aria-pressed', String(state.sidebarOpen));

    if (state.editor && typeof state.editor.layout === 'function') {
      setTimeout(function () { state.editor.layout(); }, 0);
    }
  }

  function toggleSidebar() {
    setSidebarOpen(!state.sidebarOpen);
  }

  /* Đổi view trong sidebar: explorer / search / scm / run / extensions / settings. */
  function showView(name, options) {
    if (!VIEWS[name]) name = 'explorer';
    state.activeView = name;

    dom.activityItems.forEach(function (button) {
      var active = button.getAttribute('data-view') === name;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });

    dom.viewPanels.forEach(function (panel) {
      var active = panel.getAttribute('data-view-panel') === name;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });

    dom.sidebarTitle.textContent = VIEWS[name];
    dom.explorerActions.hidden = name !== 'explorer';

    if (!options || options.open !== false) setSidebarOpen(true);

    if (name === 'search') {
      setTimeout(function () { dom.searchInput.focus(); }, 220);
    }
  }

  /* Tương thích với code cũ: mở panel công cụ = mở Explorer. */
  function setToolsOpen(open) {
    if (open) showView('explorer');
    else setSidebarOpen(false);
  }

  function toggleTools() {
    if (state.sidebarOpen) setSidebarOpen(false);
    else showView(state.activeView || 'explorer');
  }

  /* ==========================================================
     GROUP 1 — phím ảo cuộn ngang (dữ liệu ở 06.commands.js)
     ========================================================== */

  function renderVkeyBar() {
    if (!dom.vkeyBar) return;

    var keys = (App.commands && App.commands.vkeys) || [];
    dom.vkeyBar.innerHTML = '';

    keys.forEach(function (key) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'vkey';
      button.textContent = key.label;
      button.title = key.title || key.label;
      button.setAttribute('aria-label', key.title || key.label);

      if (key.action) button.setAttribute('data-action', key.action);
      if (typeof key.text === 'string') button.setAttribute('data-text', key.text);

      dom.vkeyBar.appendChild(button);
    });
  }

  function setVkeyBarOpen(open) {
    state.vkeysOpen = !!open;
    if (dom.vkeyBar) dom.vkeyBar.hidden = !state.vkeysOpen;

    if (dom.vkeyToggleBtn) {
      dom.vkeyToggleBtn.classList.toggle('active', state.vkeysOpen);
      dom.vkeyToggleBtn.setAttribute('aria-pressed', String(state.vkeysOpen));
    }

    updateDockHeight();
  }

  function toggleVkeyBar() {
    setVkeyBarOpen(!state.vkeysOpen);
  }

  /* ==========================================================
     GROUP 2 — cột công cụ Monaco, trượt lên từ đáy phải
     ========================================================== */

  function setToolRailOpen(open) {
    state.toolRailOpen = !!open;
    if (dom.toolRail) {
      dom.toolRail.classList.toggle('open', state.toolRailOpen);
      dom.toolRail.setAttribute('aria-hidden', String(!state.toolRailOpen));
    }

    if (dom.toolRailToggleBtn) {
      dom.toolRailToggleBtn.classList.toggle('active', state.toolRailOpen);
      dom.toolRailToggleBtn.setAttribute('aria-pressed', String(state.toolRailOpen));
    }

    if (state.editor && typeof state.editor.layout === 'function') {
      state.editor.layout();
    }
  }

  function toggleToolRail() {
    setToolRailOpen(!state.toolRailOpen);
  }

  /* ==========================================================
     KÍCH THƯỚC — bottom area và bàn phím ảo
     ========================================================== */

  function updateDockHeight() {
    var area = dom.bottomArea || dom.dock;
    if (!area) return;

    var height = area.offsetHeight || 0;
    document.documentElement.style.setProperty('--dock-h', height + 'px');
    if (state.editor && typeof state.editor.layout === 'function') {
      state.editor.layout();
    }
  }

  function updateViewportInsets() {
    var keyboardHeight = 0;

    if (global.visualViewport) {
      var viewport = global.visualViewport;
      keyboardHeight = global.innerHeight - viewport.height - viewport.offsetTop;
      if (!isFinite(keyboardHeight) || keyboardHeight < 20) keyboardHeight = 0;
    }

    document.documentElement.style.setProperty('--vkbd', keyboardHeight + 'px');
    updateDockHeight();
  }

  /* ==========================================================
     TABS + BREADCRUMBS + STATUS BAR
     ========================================================== */

  function setActiveFile(path, lang, options) {
    var name = path ? utils.basename(path) : 'Welcome';
    var language = lang || utils.extToLang(path);
    var symbol = path ? App.icons.fileSymbol(name) : 'file-code';
    var iconUse = dom.fileIcon.querySelector('use');

    state.currentFilePath = path || '';
    state.currentLanguage = language;

    dom.tabLabel.textContent = name;
    dom.breadcrumbFile.textContent = path || 'Welcome';
    dom.breadcrumbLang.textContent = utils.langLabel(language);
    dom.statusLangText.textContent = utils.langLabel(language);
    dom.commandCenterLabel.textContent = state.dirName || 'monaco-mobile';
    document.title = name + ' — VS Code Mobile';

    if (iconUse) iconUse.setAttribute('href', '#i-' + symbol);

    if (!options || options.history !== false) pushHistory(path);
    updateScm();
  }

  function setDirty(dirty) {
    state.dirty = !!dirty;
    dom.tabDirty.hidden = !state.dirty;
    updateScm();
  }

  function markSaved() {
    setDirty(false);
  }

  function updateScm() {
    var name = state.currentFilePath ? utils.basename(state.currentFilePath) : 'Chưa mở file';
    dom.scmFile.textContent = name;
    dom.scmStatus.textContent = state.dirty ? 'M' : '—';
    dom.scmStatus.classList.toggle('modified', state.dirty);
    dom.scmBadge.hidden = !state.dirty;
    dom.scmBadge.textContent = state.dirty ? '1' : '0';
  }

  function updateCursor(position) {
    if (!position) return;
    var text = 'Ln ' + position.lineNumber + ', Col ' + position.column;
    dom.statusCursor.textContent = text;
  }

  function updateLanguage(lang) {
    state.currentLanguage = lang;
    dom.statusLangText.textContent = utils.langLabel(lang);
    dom.breadcrumbLang.textContent = utils.langLabel(lang);
  }

  function updateProblems(markers) {
    var errors = 0;
    var warnings = 0;

    (markers || []).forEach(function (marker) {
      /* Monaco: Error = 8, Warning = 4 */
      if (marker.severity === 8) errors += 1;
      else if (marker.severity === 4) warnings += 1;
    });

    dom.statusErrorCount.textContent = String(errors);
    dom.statusWarningCount.textContent = String(warnings);
    dom.statusProblems.title = errors + ' lỗi, ' + warnings + ' cảnh báo';
  }

  function setFileCount(count) {
    dom.fileCount.textContent = String(count);
    document.getElementById('explorerBadge').hidden = count === 0;
    document.getElementById('explorerBadge').textContent = String(count);
  }

  /* ==========================================================
     LỊCH SỬ MỞ FILE (back / forward)
     ========================================================== */

  function pushHistory(path) {
    if (!path) return;
    var history = state.fileHistory;

    if (state.historyIndex >= 0 && history[state.historyIndex] === path) {
      updateNavButtons();
      return;
    }

    history = history.slice(0, state.historyIndex + 1);
    history.push(path);
    if (history.length > 30) history.shift();

    state.fileHistory = history;
    state.historyIndex = history.length - 1;
    updateNavButtons();
  }

  function openHistoryAt(index) {
    var path = state.fileHistory[index];
    if (!path) return;
    var entry = state.fileEntries.get(path);
    if (!entry) {
      utils.setStatus('Không tìm thấy file trong lịch sử: ' + path);
      return;
    }

    state.historyIndex = index;
    updateNavButtons();
    App.files.openIntoEditor(entry, path, { history: false });
  }

  function goBack() {
    if (state.historyIndex > 0) openHistoryAt(state.historyIndex - 1);
  }

  function goForward() {
    if (state.historyIndex < state.fileHistory.length - 1) {
      openHistoryAt(state.historyIndex + 1);
    }
  }

  function updateNavButtons() {
    dom.backBtn.disabled = state.historyIndex <= 0;
    dom.forwardBtn.disabled = state.historyIndex >= state.fileHistory.length - 1;
  }

  /* ==========================================================
     COMMAND PALETTE
     ----------------------------------------------------------
     Dữ liệu nằm ở 06.commands.js dưới dạng JSON-shaped.
     UI chỉ làm 2 việc: hiển thị + tra action tương ứng.
     ========================================================== */

  function commandList() {
    return (App.commands && App.commands.data) || [];
  }

  function setTheme(value) {
    dom.theme.value = value;
    dom.theme.dispatchEvent(new Event('change'));
  }

  function filterCommands(query) {
    var text = String(query || '').trim().toLowerCase();
    var list = commandList();

    if (!text) return list;

    return list.filter(function (command) {
      return (command.label + ' ' + command.id + ' ' +
        (command.key || '') + ' ' + (command.category || ''))
        .toLowerCase()
        .indexOf(text) >= 0;
    });
  }

  function renderPalette(query) {
    visibleCommands = filterCommands(query);
    dom.paletteList.innerHTML = '';

    if (!visibleCommands.length) {
      var empty = document.createElement('p');
      empty.className = 'hint palette-empty';
      empty.textContent = 'Không có lệnh phù hợp.';
      dom.paletteList.appendChild(empty);
      return;
    }

    if (state.paletteIndex >= visibleCommands.length) {
      state.paletteIndex = visibleCommands.length - 1;
    }

    visibleCommands.forEach(function (command, index) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'palette-item' + (index === state.paletteIndex ? ' active' : '');
      item.setAttribute('role', 'option');
      item.setAttribute('data-index', String(index));

      item.innerHTML =
        App.icons.markup(command.icon || 'chevron-right') +
        '<span class="palette-label">' + utils.escapeHtml(command.label) + '</span>' +
        (command.key ? '<kbd>' + utils.escapeHtml(command.key) + '</kbd>' : '');

      item.addEventListener('click', function () { runCommand(command); });
      item.addEventListener('mousemove', function () {
        if (state.paletteIndex !== index) {
          state.paletteIndex = index;
          updatePaletteActive();
        }
      });

      dom.paletteList.appendChild(item);
    });

    updatePaletteActive();
  }

  function updatePaletteActive() {
    var items = dom.paletteList.querySelectorAll('.palette-item');
    items.forEach(function (item, index) {
      item.classList.toggle('active', index === state.paletteIndex);
    });

    var active = items[state.paletteIndex];
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ block: 'nearest' });
    }
  }

  function openPalette(prefill) {
    state.paletteOpen = true;
    state.paletteIndex = 0;
    dom.palette.hidden = false;
    dom.paletteInput.value = prefill || '';
    renderPalette(dom.paletteInput.value);

    setTimeout(function () {
      dom.paletteInput.focus();
      dom.paletteInput.select();
    }, 0);
  }

  function closePalette() {
    state.paletteOpen = false;
    dom.palette.hidden = true;
    utils.focusEditor();
  }

  function runCommand(command) {
    if (!command) return;
    closePalette();

    var action = App.commands.getAction(command.action);
    if (!action) {
      utils.setStatus('Lệnh chưa có hành vi: ' + (command.action || command.id));
      return;
    }

    try {
      var result = action();
      if (result && typeof result.catch === 'function') {
        result.catch(function (err) {
          utils.setStatus('Lỗi lệnh: ' + (err && err.message ? err.message : err));
        });
      }
    } catch (err) {
      utils.setStatus('Lỗi lệnh: ' + (err && err.message ? err.message : err));
    }
  }

  function onPaletteKeydown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      state.paletteIndex = Math.min(state.paletteIndex + 1, visibleCommands.length - 1);
      updatePaletteActive();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      state.paletteIndex = Math.max(state.paletteIndex - 1, 0);
      updatePaletteActive();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runCommand(visibleCommands[state.paletteIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
    }
  }

  /* ==========================================================
     SEARCH TRONG FILE
     ========================================================== */

  function revealMatch(match) {
    var editor = state.editor;
    if (!editor) return;

    editor.setPosition({ lineNumber: match.line, column: match.column });
    editor.revealLineInCenter(match.line);

    if (state.monaco && state.monaco.Range) {
      editor.setSelection(new state.monaco.Range(
        match.line, match.column,
        match.line, match.column + match.length
      ));
    }

    editor.focus();
    if (global.innerWidth < 900) setSidebarOpen(false);
  }

  function searchInFile(rawQuery) {
    var query = String(rawQuery || '');
    var resultsEl = dom.searchResults;

    if (!query) {
      resultsEl.innerHTML = '<p class="hint">Nhập từ khóa để tìm trong file đang mở.</p>';
      return;
    }

    if (!state.editor) {
      resultsEl.innerHTML = '<p class="hint">Editor chưa sẵn sàng.</p>';
      return;
    }

    var model = state.editor.getModel();
    if (!model) return;

    var flags = state.searchCaseSensitive ? 'g' : 'gi';
    var re = new RegExp(utils.escapeRegExp(query), flags);
    var matches = [];
    var limit = 500;

    for (var line = 1; line <= model.getLineCount() && matches.length < limit; line++) {
      var text = model.getLineContent(line);
      var found;
      re.lastIndex = 0;

      while ((found = re.exec(text)) !== null) {
        matches.push({
          line: line,
          column: found.index + 1,
          length: query.length,
          text: text
        });

        if (found.index === re.lastIndex) re.lastIndex += 1;
        if (matches.length >= limit) break;
      }
    }

    if (!matches.length) {
      resultsEl.innerHTML = '<p class="hint">Không tìm thấy “' +
        utils.escapeHtml(query) + '”.</p>';
      return;
    }

    resultsEl.innerHTML = '<p class="hint">' +
      matches.length + (matches.length >= limit ? '+' : '') + ' kết quả</p>';

    matches.forEach(function (match) {
      var before = match.text.slice(0, match.column - 1);
      var hit = match.text.slice(match.column - 1, match.column - 1 + match.length);
      var after = match.text.slice(match.column - 1 + match.length);

      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'search-result';
      row.innerHTML =
        '<span class="search-line">' + match.line + '</span>' +
        '<span class="search-text">' + utils.escapeHtml(before) +
        '<mark>' + utils.escapeHtml(hit) + '</mark>' +
        utils.escapeHtml(after) + '</span>';

      row.addEventListener('click', function () { revealMatch(match); });
      resultsEl.appendChild(row);
    });
  }

  /* ==========================================================
     TIỆN ÍCH GIAO DIỆN KHÁC
     ========================================================== */

  function closeTab() {
    if (state.dirty && !global.confirm('Tab có thay đổi chưa lưu. Đóng và bỏ thay đổi?')) {
      return;
    }

    state.currentFilePath = '';
    state.currentFileHandle = null;
    state.dirty = false;

    if (state.editor) {
      if (state.editor.__setValueQuiet) state.editor.__setValueQuiet(App.DEFAULT_CONTENT);
      else state.editor.setValue(App.DEFAULT_CONTENT);

      if (state.monaco) {
        var model = state.editor.getModel();
        if (model) state.monaco.editor.setModelLanguage(model, 'html');
      }
    }

    dom.language.value = 'html';
    setActiveFile('', 'html');
    setDirty(false);
    if (App.preview) App.preview.closePreview();
    utils.setStatus('Đã đóng tab');
  }

  function filterExtensions(query) {
    var text = String(query || '').toLowerCase();
    var cards = dom.extensionList.querySelectorAll('.extension-card');

    cards.forEach(function (card) {
      var name = card.getAttribute('data-name') || '';
      card.hidden = text !== '' && name.indexOf(text) === -1;
    });
  }

  function onGlobalKeydown(event) {
    var modifier = event.ctrlKey || event.metaKey;

    if (modifier && event.shiftKey && (event.key === 'p' || event.key === 'P')) {
      event.preventDefault();
      event.stopPropagation();
      openPalette('');
    } else if (event.key === 'F1') {
      event.preventDefault();
      event.stopPropagation();
      openPalette('');
    } else if (event.key === 'Escape') {
      if (state.paletteOpen) {
        event.preventDefault();
        closePalette();
      } else if (state.toolRailOpen) {
        event.preventDefault();
        setToolRailOpen(false);
      } else if (state.sidebarOpen) {
        event.preventDefault();
        setSidebarOpen(false);
      }
    }
  }

  /* ==========================================================
     INIT
     ========================================================== */

  function init() {
    /* Title bar + sidebar */
    dom.menuBtn.addEventListener('click', toggleSidebar);
    dom.dockMenu.addEventListener('click', toggleSidebar);
    dom.toggleSidebarBtn.addEventListener('click', toggleSidebar);
    dom.sidebarScrim.addEventListener('click', function () { setSidebarOpen(false); });

    dom.activityItems.forEach(function (button) {
      button.addEventListener('click', function () {
        showView(button.getAttribute('data-view'));
      });
    });

    /* Command palette */
    dom.commandCenter.addEventListener('click', function () { openPalette(''); });
    dom.moreBtn.addEventListener('click', function () { openPalette(''); });
    dom.dockPaletteBtn.addEventListener('click', function () { openPalette(''); });
    dom.paletteClose.addEventListener('click', closePalette);
    dom.palette.addEventListener('click', function (event) {
      if (event.target === dom.palette) closePalette();
    });
    dom.paletteInput.addEventListener('input', function () {
      state.paletteIndex = 0;
      renderPalette(dom.paletteInput.value);
    });
    dom.paletteInput.addEventListener('keydown', onPaletteKeydown);

    /* Tab + breadcrumbs */
    dom.tabClose.addEventListener('click', closeTab);
    dom.newTabBtn.addEventListener('click', function () { App.files.openFileFS(); });
    dom.tabs.addEventListener('click', function (event) {
      if (event.target.closest('.tab')) utils.focusEditor();
    });

    /* Search */
    dom.searchInput.addEventListener('input', utils.debounce(function () {
      searchInFile(dom.searchInput.value);
    }, 180));
    dom.searchCase.addEventListener('change', function () {
      state.searchCaseSensitive = dom.searchCase.checked;
      searchInFile(dom.searchInput.value);
    });

    /* Extensions */
    dom.extensionSearch.addEventListener('input', function () {
      filterExtensions(dom.extensionSearch.value);
    });

    /* Source control (chỉ minh hoạ) */
    dom.initGitBtn.addEventListener('click', function () {
      utils.setStatus('Bản offline chưa kết nối Git — hãy dùng Git trên máy tính.');
    });

    /* Status bar */
    dom.statusBranch.addEventListener('click', function () { showView('scm'); });
    dom.statusLang.addEventListener('click', function () {
      showView('settings');
      setTimeout(function () { dom.language.focus(); }, 220);
    });
    dom.statusCursor.addEventListener('click', function () {
      App.shortcuts.runAction('gotoLine');
    });
    dom.statusProblems.addEventListener('click', function () {
      utils.setStatus('Problems: ' + dom.statusErrorCount.textContent + ' lỗi, ' +
        dom.statusWarningCount.textContent + ' cảnh báo');
    });
    dom.statusSpaces.addEventListener('click', function () {
      utils.setStatus('Indentation: 2 spaces');
    });

    /* Dock: focus bàn phím */
    dom.keyboardBtn.addEventListener('click', function () {
      utils.focusEditor();
      utils.setStatus('Bàn phím đã mở — gõ trực tiếp vào editor');
    });

    /* Group 1: phím ảo + nút ẩn/hiện */
    renderVkeyBar();
    dom.vkeyToggleBtn.addEventListener('click', toggleVkeyBar);

    /* Group 2: rail công cụ Monaco + nút ẩn/hiện */
    dom.toolRailToggleBtn.addEventListener('click', toggleToolRail);
    dom.toolRailCloseBtn.addEventListener('click', function () { setToolRailOpen(false); });

    /* Phím toàn cục */
    document.addEventListener('keydown', onGlobalKeydown, true);

    /* Kích thước */
    if (global.ResizeObserver && dom.bottomArea) {
      dockObserver = new ResizeObserver(updateDockHeight);
      dockObserver.observe(dom.bottomArea);
    }

    if (global.visualViewport) {
      global.visualViewport.addEventListener('resize', updateViewportInsets);
      global.visualViewport.addEventListener('scroll', updateViewportInsets);
    }

    global.addEventListener('resize', updateViewportInsets);
    global.addEventListener('orientationchange', function () {
      setTimeout(updateViewportInsets, 200);
      setTimeout(updateViewportInsets, 500);
    });

    /* Trạng thái ban đầu */
    showView('explorer', { open: false });
    setActiveFile('', 'html', { history: false });
    updateNavButtons();
    updateScm();
    setVkeyBarOpen(state.vkeysOpen);
    setToolRailOpen(state.toolRailOpen);
    updateViewportInsets();
    updateDockHeight();
    renderPalette('');
  }

  App.ui = {
    init: init,
    showView: showView,
    setSidebarOpen: setSidebarOpen,
    toggleSidebar: toggleSidebar,
    setToolsOpen: setToolsOpen,
    toggleTools: toggleTools,
    updateDockHeight: updateDockHeight,
    updateViewportInsets: updateViewportInsets,
    setActiveFile: setActiveFile,
    setDirty: setDirty,
    markSaved: markSaved,
    updateScm: updateScm,
    updateCursor: updateCursor,
    updateLanguage: updateLanguage,
    updateProblems: updateProblems,
    setFileCount: setFileCount,
    renderVkeyBar: renderVkeyBar,
    setVkeyBarOpen: setVkeyBarOpen,
    toggleVkeyBar: toggleVkeyBar,
    setToolRailOpen: setToolRailOpen,
    toggleToolRail: toggleToolRail,
    setTheme: setTheme,
    openPalette: openPalette,
    closePalette: closePalette,
    searchInFile: searchInFile,
    closeTab: closeTab,
    goBack: goBack,
    goForward: goForward
  };
})(window);
