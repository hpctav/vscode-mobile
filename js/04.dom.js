/* ============================================================
   04. DOM — Lấy tham chiếu DOM một lần
   ------------------------------------------------------------
   Gom mọi getElementById vào một chỗ để các module khác dùng lại.
   Nếu đổi id trong HTML, chỉ cần sửa file này.
   ============================================================ */
(function (global) {
  'use strict';

  var App = global.ME = global.ME || {};

  function byId(id) {
    return document.getElementById(id);
  }

  function all(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  App.dom = {
    /* Khung chính */
    workbench: byId('workbench'),
    editorHost: byId('editor'),
    fallback: byId('fallback'),
    status: byId('status'),

    /* Title bar */
    menuBtn: byId('menuBtn'),
    backBtn: byId('backBtn'),
    forwardBtn: byId('forwardBtn'),
    commandCenter: byId('commandCenter'),
    commandCenterLabel: byId('commandCenterLabel'),
    toggleSidebarBtn: byId('toggleSidebarBtn'),
    moreBtn: byId('moreBtn'),

    /* Activity bar + sidebar */
    activityBar: byId('activityBar'),
    activityItems: all('.activity-item[data-view]'),
    sidebar: byId('sidebar'),
    sidebarTitle: byId('sidebarTitle'),
    sidebarScrim: byId('sidebarScrim'),
    explorerActions: byId('explorerActions'),
    viewPanels: all('[data-view-panel]'),

    /* Explorer */
    group2Wrap: byId('group2Wrap'),
    newFileBtn: byId('newFileBtn'),
    newFolderBtn: byId('newFolderBtn'),
    refreshTreeBtn: byId('refreshTreeBtn'),
    collapseTreeBtn: byId('collapseTreeBtn'),
    openFileBtn: byId('openFileBtn'),
    openFolderBtn: byId('openFolderBtn'),
    previewHtmlBtn: byId('previewHtmlBtn'),
    saveFileBtn: byId('saveFileBtn'),
    fileList: byId('fileList'),
    fileCount: byId('fileCount'),
    fsHint: byId('fsHint'),

    /* Search */
    searchInput: byId('searchInput'),
    searchCase: byId('searchCase'),
    searchResults: byId('searchResults'),

    /* Source control */
    scmFile: byId('scmFile'),
    scmStatus: byId('scmStatus'),
    initGitBtn: byId('initGitBtn'),
    scmBadge: byId('scmBadge'),

    /* Run */
    runPreviewBtn: byId('runPreviewBtn'),

    /* Extensions */
    extensionSearch: byId('extensionSearch'),
    extensionList: byId('extensionList'),

    /* Settings */
    language: byId('language'),
    theme: byId('theme'),
    wrapBtn: byId('wrapBtn'),

    /* Editor tabs + breadcrumbs */
    tabs: byId('tabs'),
    tabLabel: byId('tabLabel'),
    tabDirty: byId('tabDirty'),
    tabClose: byId('tabClose'),
    newTabBtn: byId('newTabBtn'),
    fileIcon: byId('fileIcon'),
    breadcrumbs: byId('breadcrumbs'),
    breadcrumbFile: byId('breadcrumbFile'),
    breadcrumbLang: byId('breadcrumbLang'),
    saveBtn: byId('saveBtn'),
    previewBtn: byId('previewBtn'),

    /* Status bar */
    statusRemote: byId('statusRemote'),
    statusBranch: byId('statusBranch'),
    statusProblems: byId('statusProblems'),
    statusErrorCount: byId('statusErrorCount'),
    statusWarningCount: byId('statusWarningCount'),
    statusCursor: byId('statusCursor'),
    statusSpaces: byId('statusSpaces'),
    statusLang: byId('statusLang'),
    statusLangText: byId('statusLangText'),

    /* Bottom area: group 1 (phím ảo) + dock */
    bottomArea: byId('bottomArea'),
    vkeyBar: byId('vkeyBar'),
    vkeyToggleBtn: byId('vkeyToggleBtn'),
    dock: byId('bottomDock'),
    dockMenu: byId('dockMenu'),
    keyboardBtn: byId('keyboardBtn'),
    dockPaletteBtn: byId('dockPaletteBtn'),
    dockSaveBtn: byId('dockSaveBtn'),
    dockPreviewBtn: byId('dockPreviewBtn'),
    undoBtn: byId('undoBtn'),
    redoBtn: byId('redoBtn'),
    toolRailToggleBtn: byId('toolRailToggleBtn'),

    /* Group 2: cột công cụ Monaco */
    toolRail: byId('toolRail'),
    toolRailList: byId('toolRailList'),
    toolRailCloseBtn: byId('toolRailCloseBtn'),

    /* Command palette */
    palette: byId('palette'),
    paletteInput: byId('paletteInput'),
    paletteList: byId('paletteList'),
    paletteClose: byId('paletteClose'),

    /* Preview */
    previewWrap: byId('previewWrap'),
    previewFrame: byId('previewFrame'),
    previewTitle: byId('previewTitle'),
    closePreviewBtn: byId('closePreviewBtn'),
    refreshPreviewBtn: byId('refreshPreviewBtn'),
    autoPreviewChk: byId('autoPreviewChk'),

    /* Input ẩn */
    fileInput: byId('fileInput'),
    folderInput: byId('folderInput')
  };
})(window);
