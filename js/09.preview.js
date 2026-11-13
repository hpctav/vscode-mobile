/* ============================================================
   09. PREVIEW — Xem trước HTML trong iframe
   ------------------------------------------------------------
   Ý tưởng: đọc HTML đang mở, đổi các đường dẫn tương đối
   (css/js/ảnh/font/svg...) sang blob URL, rồi gán vào srcdoc.
   Nhờ vậy preview chạy được cả khi mở app bằng file://.
   ============================================================ */
(function (global) {
  'use strict';

  var App = global.ME = global.ME || {};
  var state = App.state;
  var dom = App.dom;
  var utils = App.utils;

  /* cache path -> blob URL (null = đang xử lý, tránh đệ quy vô hạn) */
  var blobUrlCache = new Map();

  function revokePreviewBlobs() {
    state.previewBlobUrls.forEach(function (url) {
      try { URL.revokeObjectURL(url); } catch (err) { /* ignore */ }
    });
    state.previewBlobUrls = [];
    blobUrlCache.clear();
  }

  async function createBlobUrlForPath(normPath) {
    var cacheKey = normPath;
    if (blobUrlCache.has(cacheKey)) return blobUrlCache.get(cacheKey);
    blobUrlCache.set(cacheKey, null);

    var entry = state.fileEntries.get(normPath);
    if (!entry) {
      var alt = normPath.replace(/^[^\/]+\//, '');
      entry = state.fileEntries.get(alt) ||
        state.fileEntries.get(normPath.split('/').pop()) ||
        null;
      if (entry) normPath = entry.path || normPath;
    }

    if (!entry) {
      blobUrlCache.delete(cacheKey);
      return null;
    }

    var file = await App.files.readEntryAsFile(entry);

    if (/\.css$/i.test(normPath)) {
      try {
        var css = await App.files.fileToText(file);
        var re = /url\(\s*(['"]?)([^'"\)]+)\1\s*\)/g;
        var out = '';
        var last = 0;
        var match;

        while ((match = re.exec(css)) !== null) {
          out += css.slice(last, match.index);
          var inner = match[2];
          var resolved = inner;

          if (!/^(https?:|data:|blob:|#)/i.test(inner)) {
            var childNorm = utils.normalizePath(normPath, inner);
            if (childNorm) {
              var childUrl = await createBlobUrlForPath(childNorm);
              if (childUrl) resolved = childUrl;
            }
          }

          out += 'url("' + resolved + '")';
          last = re.lastIndex;
        }
        out += css.slice(last);

        var out2 = '';
        last = 0;
        var ire = /@import\s+(?:url\(\s*(['"]?)([^'"\)]+)\1\s*\)|(['"])([^'"\)]+)\3)\s*;/g;

        while ((match = ire.exec(out)) !== null) {
          out2 += out.slice(last, match.index);
          var imported = match[2] || match[4];
          var importedResolved = imported;

          if (imported && !/^(https?:|data:|blob:)/i.test(imported)) {
            var importedNorm = utils.normalizePath(normPath, imported);
            if (importedNorm) {
              var importedUrl = await createBlobUrlForPath(importedNorm);
              if (importedUrl) importedResolved = importedUrl;
            }
          }

          out2 += '@import url("' + importedResolved + '");';
          last = ire.lastIndex;
        }
        out2 += out.slice(last);

        file = new Blob([out2], { type: 'text/css' });
      } catch (err) {
        /* lỗi đọc CSS thì dùng file gốc */
      }
    }

    var url = URL.createObjectURL(file);
    state.previewBlobUrls.push(url);
    blobUrlCache.set(cacheKey, url);
    return url;
  }

  async function resolveAssetUrl(rel, basePath) {
    var norm = utils.normalizePath(basePath, rel);
    if (!norm) return rel;
    var url = await createBlobUrlForPath(norm);
    return url || rel;
  }

  async function resolveSrcset(srcset, basePath) {
    if (!srcset) return srcset;

    var parts = srcset.split(',');
    var out = [];

    for (var i = 0; i < parts.length; i++) {
      var item = parts[i].trim();
      if (!item) continue;

      var segments = item.split(/\s+/);
      var url = segments.shift();
      var resolved = await resolveAssetUrl(url, basePath);
      segments.unshift(resolved);
      out.push(segments.join(' '));
    }

    return out.join(', ');
  }

  async function buildPreviewHtml() {
    var html = state.editor ? state.editor.getValue() : '';
    var basePath = state.currentFilePath || '';

    if (!utils.isHtmlPath(basePath, dom.language.value)) {
      throw new Error('File hiện tại không phải HTML. Hãy mở/chọn file .html để preview.');
    }

    revokePreviewBlobs();

    var doc = new DOMParser().parseFromString(html, 'text/html');
    var nodes = doc.querySelectorAll('[src], [href], [data], [poster], [srcset], [imagesrcset]');

    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var tag = el.tagName.toLowerCase();

      if (tag === 'a' && el.hasAttribute('href')) continue;

      if (el.hasAttribute('src')) {
        var srcValue = el.getAttribute('src');
        if (srcValue) el.setAttribute('src', await resolveAssetUrl(srcValue, basePath));
      }

      if (el.hasAttribute('href') && tag !== 'a') {
        var hrefValue = el.getAttribute('href');
        if (hrefValue) el.setAttribute('href', await resolveAssetUrl(hrefValue, basePath));
      }

      if (el.hasAttribute('data') && (tag === 'object' || tag === 'embed')) {
        var dataValue = el.getAttribute('data');
        if (dataValue) el.setAttribute('data', await resolveAssetUrl(dataValue, basePath));
      }

      if (el.hasAttribute('poster')) {
        var posterValue = el.getAttribute('poster');
        if (posterValue) el.setAttribute('poster', await resolveAssetUrl(posterValue, basePath));
      }

      if (el.hasAttribute('srcset')) {
        el.setAttribute('srcset', await resolveSrcset(el.getAttribute('srcset'), basePath));
      }

      if (el.hasAttribute('imagesrcset')) {
        el.setAttribute('imagesrcset', await resolveSrcset(el.getAttribute('imagesrcset'), basePath));
      }
    }

    var svgRefs = doc.querySelectorAll('use, image, feImage');
    for (var k = 0; k < svgRefs.length; k++) {
      var svgNode = svgRefs[k];
      var attrs = ['href', 'xlink:href'];

      for (var ai = 0; ai < attrs.length; ai++) {
        var attrName = attrs[ai];
        var value = svgNode.getAttribute(attrName);
        if (!value || value.charAt(0) === '#') continue;

        var hashIndex = value.indexOf('#');
        var partPath = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
        var fragment = hashIndex >= 0 ? value.slice(hashIndex) : '';
        var resolved = await resolveAssetUrl(partPath, basePath);
        svgNode.setAttribute(attrName, resolved + fragment);
      }
    }

    var styled = doc.querySelectorAll('[style]');
    for (var s = 0; s < styled.length; s++) {
      var styleText = styled[s].getAttribute('style') || '';
      var replaced = styleText;
      var styleRe = /url\((['"]?)([^'"\)]+)\1\)/g;
      var styleMatch;
      var tasks = [];

      while ((styleMatch = styleRe.exec(styleText)) !== null) {
        tasks.push(styleMatch[2]);
      }

      for (var t = 0; t < tasks.length; t++) {
        if (/^(https?:|data:|blob:|#)/i.test(tasks[t])) continue;
        var resolvedUrl = await resolveAssetUrl(tasks[t], basePath);
        replaced = replaced.split(tasks[t]).join(resolvedUrl);
      }

      styled[s].setAttribute('style', replaced);
    }

    var styleTags = doc.querySelectorAll('style');
    for (var si = 0; si < styleTags.length; si++) {
      var css = styleTags[si].textContent || '';
      var cssRe = /url\(\s*(['"]?)([^'"\)]+)\1\s*\)/g;
      var cssMatch;
      var last = 0;
      var outCss = '';

      while ((cssMatch = cssRe.exec(css)) !== null) {
        outCss += css.slice(last, cssMatch.index);
        var inner = cssMatch[2];
        var resolvedCss = inner;

        if (inner && !/^(https?:|data:|blob:|#)/i.test(inner)) {
          resolvedCss = await resolveAssetUrl(inner, basePath);
        }

        outCss += 'url("' + resolvedCss + '")';
        last = cssRe.lastIndex;
      }

      outCss += css.slice(last);
      styleTags[si].textContent = outCss;
    }

    var metas = doc.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"], meta[itemprop="image"]');
    for (var mi = 0; mi < metas.length; mi++) {
      var content = metas[mi].getAttribute('content');
      if (content && !/^(https?:|data:|blob:)/i.test(content)) {
        metas[mi].setAttribute('content', await resolveAssetUrl(content, basePath));
      }
    }

    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  }

  async function previewHtml(silent) {
    try {
      if (!silent) utils.setStatus('Đang tạo preview...');
      var out = await buildPreviewHtml();

      dom.previewTitle.textContent = 'HTML Preview' +
        (state.currentFilePath ? ' — ' + state.currentFilePath : '') +
        (dom.autoPreviewChk && dom.autoPreviewChk.checked ? ' (auto)' : '');

      dom.previewFrame.srcdoc = out;
      dom.previewWrap.classList.add('open');

      utils.setStatus(silent ? 'Preview đã cập nhật' : 'Đã mở preview');
    } catch (err) {
      var message = err && err.message ? err.message : String(err);
      utils.setStatus('Lỗi preview: ' + message);
    }
  }

  function scheduleAutoPreview() {
    if (!dom.autoPreviewChk || !dom.autoPreviewChk.checked) return;
    if (!dom.previewWrap.classList.contains('open')) return;

    if (state.autoPreviewTimer) clearTimeout(state.autoPreviewTimer);
    state.autoPreviewTimer = setTimeout(function () {
      state.autoPreviewTimer = null;
      if (utils.isHtmlPath(state.currentFilePath, dom.language.value)) {
        previewHtml(true);
      }
    }, 600);
  }

  function closePreview() {
    dom.previewWrap.classList.remove('open');
    dom.previewFrame.srcdoc = '';
    revokePreviewBlobs();
    if (state.autoPreviewTimer) {
      clearTimeout(state.autoPreviewTimer);
      state.autoPreviewTimer = null;
    }
  }

  function init() {
    /* Nút "Preview HTML" trong Explorer dùng data-action -> shortcuts.js.
       Ở đây chỉ gắn các nút riêng của panel preview. */
    dom.refreshPreviewBtn.addEventListener('click', function () { previewHtml(false); });
    dom.closePreviewBtn.addEventListener('click', closePreview);

    dom.autoPreviewChk.addEventListener('change', function () {
      if (dom.autoPreviewChk.checked) scheduleAutoPreview();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && dom.previewWrap.classList.contains('open')) {
        closePreview();
      }
    });
  }

  App.preview = {
    init: init,
    previewHtml: previewHtml,
    scheduleAutoPreview: scheduleAutoPreview,
    closePreview: closePreview,
    revokePreviewBlobs: revokePreviewBlobs,
    buildPreviewHtml: buildPreviewHtml
  };
})(window);
