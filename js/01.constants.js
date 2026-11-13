/* ============================================================
   01. CONSTANTS — Hằng số dùng chung
   ------------------------------------------------------------
   Nơi duy nhất chứa cấu hình và dữ liệu tĩnh.
   Các module khác chỉ đọc, không sửa.
   ============================================================ */
(function (global) {
  'use strict';

  var App = global.ME = global.ME || {};

  /* Phiên bản Monaco (lõi editor của VS Code). */
  App.MONACO_VERSION = '0.52.2';
  App.MONACO_VS = 'https://cdn.jsdelivr.net/npm/monaco-editor@' + App.MONACO_VERSION + '/min/vs';

  /* Phần mở rộng -> ngôn ngữ của Monaco. */
  App.EXT_LANG = {
    js: 'javascript', mjs: 'javascript', cjs: 'javascript',
    jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    html: 'html', htm: 'html',
    css: 'css', scss: 'scss', less: 'less',
    json: 'json', jsonc: 'json',
    py: 'python', md: 'markdown', txt: 'plaintext',
    svg: 'xml', xml: 'xml', yml: 'yaml', yaml: 'yaml',
    sh: 'shell', bash: 'shell',
    php: 'php', java: 'java',
    c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp',
    cs: 'csharp', go: 'go', rs: 'rust', sql: 'sql'
  };

  /* Tên hiển thị trên status bar. */
  App.LANG_LABELS = {
    javascript: 'JavaScript', typescript: 'TypeScript', html: 'HTML',
    css: 'CSS', scss: 'SCSS', less: 'Less', json: 'JSON',
    python: 'Python', markdown: 'Markdown', xml: 'XML', yaml: 'YAML',
    shell: 'Shell', php: 'PHP', java: 'Java', c: 'C', cpp: 'C++',
    csharp: 'C#', go: 'Go', rust: 'Rust', sql: 'SQL', plaintext: 'Plain Text'
  };

  /* Nội dung mở đầu — cố tình nhỏ để dễ đọc. */
  App.DEFAULT_CONTENT = [
    '<!DOCTYPE html>',
    '<html lang="vi">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>Hello mobile</title>',
    '  <link rel="stylesheet" href="style.css">',
    '</head>',
    '<body>',
    '  <h1>Xin chào từ VS Code Mobile</h1>',
    '  <button id="hello">Bấm thử</button>',
    '  <script src="app.js"><\/script>',
    '</body>',
    '</html>',
    ''
  ].join('\n');
})(window);
