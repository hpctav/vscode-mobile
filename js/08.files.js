/* ============================================================
   08. FILES — Mở, lưu, duyệt thư mục
   ------------------------------------------------------------
   Dùng File System Access API khi có, fallback về <input type=file>.
   Cây file được dựng từ Map<path, entry> trong App.state.
   ============================================================ */
(function (global) {
  'use strict';

  var App = global.ME = global.ME || {};
  var state = App.state;
  var dom = App.dom;
  var utils = App.utils;

  /* Đọc text từ File/Blob. File.text() có trên Chrome/Edge hiện đại;
     FileReader là fallback cho trình duyệt cũ (và môi trường test). */
  function fileToText(file) {
    if (file && typeof file.text === 'function') return file.text();

    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () {
        reject(reader.error || new Error('Không đọc được file'));
      };
      reader.readAsText(file);
    });
  }

  function readEntryAsText(entry) {
    if (entry.kind === 'handle') {
      return entry.handle.getFile().then(fileToText);
    }
    return fileToText(entry.file);
  }

  function readEntryAsFile(entry) {
    if (entry.kind === 'handle') return entry.handle.getFile();
    return Promise.resolve(entry.file);
  }

  async function openIntoEditor(entry, path, options) {
    try {
      var text = await readEntryAsText(entry);
      if (!state.editor) {
        utils.setStatus('Editor chưa sẵn sàng');
        return;
      }

      if (state.editor.__setValueQuiet) state.editor.__setValueQuiet(text);
      else state.editor.setValue(text);

      var lang = utils.extToLang(path);
      var model = state.editor.getModel();
      if (model && state.monaco) state.monaco.editor.setModelLanguage(model, lang);

      dom.language.value = lang;
      state.currentFileHandle = entry.kind === 'handle' ? entry.handle : null;
      state.currentFilePath = path || '';
      ensureExpandedForPath(state.currentFilePath);

      App.ui.setActiveFile(state.currentFilePath, lang, options);
      App.ui.setDirty(false);
      renderFileList();
      utils.setStatus('Đã mở: ' + (path || 'file'));
      utils.focusEditor();
      App.preview.scheduleAutoPreview();
    } catch (err) {
      utils.setStatus('Lỗi mở file: ' + (err && err.message ? err.message : err));
    }
  }

  async function saveCurrentFile() {
    if (!state.editor) {
      utils.setStatus('Editor chưa sẵn sàng');
      return;
    }

    var value = state.editor.getValue();
    var name = state.currentFilePath
      ? state.currentFilePath.split('/').pop()
      : 'untitled.txt';

    try {
      if (state.currentFileHandle && state.currentFileHandle.createWritable) {
        var writable = await state.currentFileHandle.createWritable();
        await writable.write(value);
        await writable.close();
      } else {
        var entry = state.currentFilePath ? state.fileEntries.get(state.currentFilePath) : null;
        if (entry && entry.kind === 'file') {
          entry.file = new File([value], name, { type: entry.file.type || 'text/plain' });
        }

        var blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = name;
        link.click();
        setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
      }

      App.ui.markSaved();
      App.ui.updateScm();
      utils.setStatus('Đã lưu: ' + (state.currentFilePath || name));
    } catch (err) {
      utils.setStatus('Lỗi lưu: ' + (err && err.message ? err.message : err));
    }
  }

  /* ---------- Dựng cây file ---------- */

  function buildTree() {
    var root = {
      name: state.dirName || 'root',
      path: '',
      type: 'dir',
      childrenMap: new Map(),
      children: []
    };
    var paths = Array.from(state.fileEntries.keys()).sort();

    paths.forEach(function (fullPath) {
      var parts = fullPath.split('/').filter(Boolean);
      var node = root;
      var acc = '';

      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        acc = acc ? (acc + '/' + part) : part;
        var isFile = i === parts.length - 1;

        if (!node.childrenMap.has(part)) {
          node.childrenMap.set(part, {
            name: part,
            path: acc,
            type: isFile ? 'file' : 'dir',
            childrenMap: new Map(),
            children: []
          });
          node.children.push(node.childrenMap.get(part));
        }

        node = node.childrenMap.get(part);
        if (!isFile) node.type = 'dir';
      }
    });

    function sortNode(node) {
      node.children.sort(function (a, b) {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortNode);
    }

    sortNode(root);
    return root;
  }

  function ensureExpandedForPath(path) {
    if (!path) return;
    var parts = path.split('/').filter(Boolean);
    var acc = '';
    for (var i = 0; i < parts.length - 1; i++) {
      acc = acc ? (acc + '/' + parts[i]) : parts[i];
      state.expandedDirs.add(acc);
    }
  }

  function renderTreeNode(node, container) {
    if (node.type === 'dir') {
      var isRoot = node.path === '';
      var expanded = isRoot
        ? !state.expandedDirs.has('__root_collapsed__')
        : state.expandedDirs.has(node.path);

      var wrap = document.createElement('div');
      wrap.className = 'tree-node';

      var row = document.createElement('div');
      row.className = 'tree-row tree-dir';
      row.title = node.path || (state.dirName || 'root');

      var toggle = document.createElement('span');
      toggle.className = 'tree-toggle';
      toggle.innerHTML = App.icons.markup(
        node.children.length ? (expanded ? 'chevron-down' : 'chevron-right') : 'circle-filled'
      );
      if (!node.children.length) toggle.classList.add('tree-toggle-empty');

      var folderIcon = document.createElement('span');
      folderIcon.className = 'tree-icon';
      folderIcon.innerHTML = App.icons.markup(expanded ? 'folder-opened' : 'folder');

      var label = document.createElement('span');
      label.className = 'tree-label';
      label.textContent = node.name || state.dirName || 'folder';

      row.appendChild(toggle);
      row.appendChild(folderIcon);
      row.appendChild(label);

      var kids = document.createElement('div');
      kids.className = 'tree-children' + (expanded ? '' : ' collapsed');

      row.addEventListener('click', function (event) {
        event.stopPropagation();
        if (!node.children.length) return;

        if (isRoot) {
          if (state.expandedDirs.has('__root_collapsed__')) state.expandedDirs.delete('__root_collapsed__');
          else state.expandedDirs.add('__root_collapsed__');
        } else if (state.expandedDirs.has(node.path)) {
          state.expandedDirs.delete(node.path);
        } else {
          state.expandedDirs.add(node.path);
        }
        renderFileList();
      });

      wrap.appendChild(row);
      wrap.appendChild(kids);
      container.appendChild(wrap);

      node.children.forEach(function (child) {
        renderTreeNode(child, kids);
      });
      return;
    }

    var fileRow = document.createElement('div');
    fileRow.className = 'tree-row tree-file' +
      (node.path === state.currentFilePath ? ' active' : '');
    fileRow.title = node.path;

    var fileSpacer = document.createElement('span');
    fileSpacer.className = 'tree-toggle tree-toggle-empty';

    var fileIcon = document.createElement('span');
    fileIcon.className = 'tree-icon';
    fileIcon.innerHTML = App.icons.markup(
      App.icons.fileSymbol(node.name),
      node.path === state.currentFilePath ? 'icon-accent' : ''
    );

    var fileLabel = document.createElement('span');
    fileLabel.className = 'tree-label';
    fileLabel.textContent = node.name;

    fileRow.appendChild(fileSpacer);
    fileRow.appendChild(fileIcon);
    fileRow.appendChild(fileLabel);

    fileRow.addEventListener('click', function (event) {
      event.stopPropagation();
      var entry = state.fileEntries.get(node.path);
      if (entry) openIntoEditor(entry, node.path);
    });

    container.appendChild(fileRow);
  }

  function renderFileList() {
    var listEl = dom.fileList;
    App.ui.setFileCount(state.fileEntries.size);

    if (!state.fileEntries.size) {
      listEl.hidden = true;
      listEl.innerHTML = '';
      return;
    }

    listEl.hidden = false;
    listEl.innerHTML = '';

    var tree = buildTree();
    var rootWrap = document.createElement('div');

    if (state.dirName) {
      renderTreeNode({
        name: state.dirName,
        path: '',
        type: 'dir',
        children: tree.children,
        childrenMap: tree.childrenMap
      }, rootWrap);
    } else {
      tree.children.forEach(function (child) {
        renderTreeNode(child, rootWrap);
      });
    }

    listEl.appendChild(rootWrap);
  }

  async function walkDirHandle(handle, prefix) {
    for await (var entry of handle.values()) {
      var path = prefix ? (prefix + '/' + entry.name) : entry.name;
      if (entry.kind === 'file') {
        state.fileEntries.set(path, { kind: 'handle', handle: entry, path: path });
      } else if (entry.kind === 'directory') {
        await walkDirHandle(entry, path);
      }
    }
  }

  async function openFirstHtml() {
    var keys = Array.from(state.fileEntries.keys()).sort();
    if (!keys.length) return;

    var firstHtml = keys.find(function (path) { return /\.html?$/i.test(path); });
    var firstPath = firstHtml || keys[0];
    await openIntoEditor(state.fileEntries.get(firstPath), firstPath);
  }

  async function openFolderFS() {
    if (!global.showDirectoryPicker) {
      dom.folderInput.click();
      return;
    }

    try {
      var handle = await global.showDirectoryPicker();
      state.dirHandle = handle;
      state.dirName = handle.name || 'folder';
      state.currentFileHandle = null;
      state.currentFilePath = '';
      state.fileEntries.clear();
      state.expandedDirs.clear();

      await walkDirHandle(handle, '');
      renderFileList();
      utils.setStatus('Đã mở thư mục: ' + state.dirName);
      App.ui.showView('explorer');
      await openFirstHtml();
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        utils.setStatus('Lỗi mở thư mục: ' + (err.message || err));
      }
    }
  }

  async function openFileFS() {
    if (!global.showOpenFilePicker) {
      dom.fileInput.click();
      return;
    }

    try {
      var picks = await global.showOpenFilePicker({ multiple: false });
      if (!picks || !picks[0]) return;

      var handle = picks[0];
      var entry = { kind: 'handle', handle: handle, path: handle.name };
      state.fileEntries.set(handle.name, entry);
      renderFileList();
      await openIntoEditor(entry, handle.name);
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        utils.setStatus('Lỗi mở file: ' + (err.message || err));
      }
    }
  }

  async function createNewFile() {
    var name = global.prompt('Tên file mới (ví dụ: index.html)');
    if (!name) return;

    name = name.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!name) return;

    try {
      var entry;

      if (state.dirHandle && state.dirHandle.getFileHandle) {
        var handle = await state.dirHandle.getFileHandle(name, { create: true });
        entry = { kind: 'handle', handle: handle, path: name };
      } else {
        entry = {
          kind: 'file',
          file: new File([''], name, { type: 'text/plain' }),
          path: name
        };
      }

      state.fileEntries.set(name, entry);
      renderFileList();
      await openIntoEditor(entry, name);
      utils.setStatus('Đã tạo file: ' + name);
    } catch (err) {
      utils.setStatus('Lỗi tạo file: ' + (err && err.message ? err.message : err));
    }
  }

  async function createNewFolder() {
    var name = global.prompt('Tên thư mục mới');
    if (!name) return;

    if (!state.dirHandle || !state.dirHandle.getDirectoryHandle) {
      utils.setStatus('Hãy mở thư mục bằng “Mở thư mục” trước khi tạo thư mục con.');
      return;
    }

    try {
      await state.dirHandle.getDirectoryHandle(name, { create: true });
      utils.setStatus('Đã tạo thư mục: ' + name +
        ' (thư mục rỗng chưa hiện trong cây file)');
    } catch (err) {
      utils.setStatus('Lỗi tạo thư mục: ' + (err && err.message ? err.message : err));
    }
  }

  async function refreshTree() {
    if (!state.dirHandle) {
      renderFileList();
      utils.setStatus('Đã làm mới Explorer');
      return;
    }

    try {
      state.fileEntries.clear();
      await walkDirHandle(state.dirHandle, '');
      renderFileList();
      utils.setStatus('Đã làm mới Explorer');
    } catch (err) {
      utils.setStatus('Lỗi làm mới: ' + (err && err.message ? err.message : err));
    }
  }

  function collapseAll() {
    state.expandedDirs.clear();
    state.expandedDirs.add('__root_collapsed__');
    renderFileList();
    utils.setStatus('Đã thu gọn cây file');
  }

  async function onFileInputChange() {
    var file = dom.fileInput.files && dom.fileInput.files[0];
    if (!file) return;

    var entry = { kind: 'file', file: file, path: file.name };
    state.fileEntries.set(file.name, entry);
    renderFileList();
    await openIntoEditor(entry, file.name);
    dom.fileInput.value = '';
  }

  async function onFolderInputChange() {
    var files = Array.from(dom.folderInput.files || []);
    if (!files.length) return;

    var rootName = files[0].webkitRelativePath
      ? files[0].webkitRelativePath.split('/')[0]
      : '';

    state.dirName = rootName || '(files)';
    state.currentFileHandle = null;
    state.currentFilePath = '';
    state.fileEntries.clear();
    state.expandedDirs.clear();

    files.forEach(function (file) {
      var rel = file.webkitRelativePath || file.name;
      /* Bỏ tên thư mục gốc để cây không bị lặp "site/site/..." */
      if (rootName && rel.indexOf(rootName + '/') === 0) {
        rel = rel.slice(rootName.length + 1);
      }
      state.fileEntries.set(rel, { kind: 'file', file: file, path: rel });
    });

    renderFileList();
    utils.setStatus('Đã mở thư mục: ' + state.dirName);
    await openFirstHtml();

    dom.folderInput.value = '';
    App.ui.showView('explorer');
  }

  function init() {
    dom.openFileBtn.addEventListener('click', openFileFS);
    dom.openFolderBtn.addEventListener('click', openFolderFS);
    dom.newFileBtn.addEventListener('click', createNewFile);
    dom.newFolderBtn.addEventListener('click', createNewFolder);
    dom.refreshTreeBtn.addEventListener('click', refreshTree);
    dom.collapseTreeBtn.addEventListener('click', collapseAll);
    dom.fileInput.addEventListener('change', onFileInputChange);
    dom.folderInput.addEventListener('change', onFolderInputChange);
  }

  App.files = {
    init: init,
    openIntoEditor: openIntoEditor,
    saveCurrentFile: saveCurrentFile,
    renderFileList: renderFileList,
    openFileFS: openFileFS,
    openFolderFS: openFolderFS,
    fileToText: fileToText,
    readEntryAsFile: readEntryAsFile,
    readEntryAsText: readEntryAsText
  };
})(window);
