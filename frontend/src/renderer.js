import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';
import { ACCENT_THEMES, normalizeAccentTheme, normalizeColorMode, readAppearanceStorage, resolveMacColorMode, temporaryMacColorModeAfterToggle } from './appearance.js';
import { previewWheelZoomDirection } from './font-wheel-zoom.js';
import { escapeMarkdownText, highlightExtension, nextFootnoteNumber, prepareFootnotes, renderFootnoteSection } from './markdown-formats.js';
import { scanMarkdownBlockStartLines } from './preview-line-map.js';
import { filesFromPreferencePaths, normalizeSidebarMode, sameDocumentPath } from './library-state.js';

const $ = selector => document.querySelector(selector);
const DOC_WIDTH_LEVELS = ['narrow', 'medium', 'wide', 'full'];
let codeEditor;
let editorExtensions = [];
let basicSetup;
let Compartment;
let EditorState;
let EditorView;
let keymap;
let undo;
let undoDepth;
let closeSearchPanel;
let openSearchPanel;
let searchPanelOpen;
let HighlightStyle;
let syntaxHighlighting;
let markdown;
let tags;
let editorLanguage;
let markdownHighlightStyle;
let editorDependenciesPromise;
let editorInitializationPromise;
let suppressEditorChanges = false;
let externalRefreshInProgress = false;

const initialAppearance = readAppearanceStorage(localStorage);

const state = {
  currentFile: null,
  root: null,
  files: [],
  explorerFiles: [],
  recentFiles: [],
  favoriteFiles: [],
  sidebarMode: normalizeSidebarMode(localStorage.getItem('sidebarMode')),
  accentTheme: initialAppearance.accentTheme,
  colorMode: initialAppearance.colorMode,
  fontScale: Number(localStorage.getItem('fontScale') || 1),
  docWidth: normalizeDocWidth(localStorage.getItem('docWidth')),
  language: localStorage.getItem('language') === 'en' ? 'en' : 'zh-CN',
  sidebarWidth: Number(localStorage.getItem('sidebarWidth') || 258),
  tocWidth: Number(localStorage.getItem('tocWidth') || 205),
  searchMatches: [],
  searchIndex: 0,
  editing: false,
  dirty: false,
  savedContent: '',
  updateInfo: null,
  saving: false
};

const translations = {
  'zh-CN': {
    appName: 'MD阅读助手', newFileTitle: '新建 Markdown 文件 (Ctrl+N)', newDocumentButton: '新建文档', openFileTitle: '打开文件 (Ctrl+O)', openDocument: '打开文档', openFolderTitle: '打开文件夹 (Ctrl+Shift+O)',
    toggleEditorTitle: '切换编辑/预览 (Ctrl+E)', edit: '编辑', preview: '预览', saveTitle: '保存 (Ctrl+S)', searchTitle: '在文档中查找 (Ctrl+F)',
    accentThemeTitle: '选择主题颜色', chooseAccentTheme: '选择主题颜色', colorModeTitle: '切换白天/黑夜模式', systemColorModeTitle: '临时切换白天/黑夜模式；系统下次切换时恢复自动跟随', temporaryColorModeChanged: '已临时切换为{mode}模式；系统下次切换时恢复自动跟随', lightModeName: '白天', darkModeName: '黑夜', moreTitle: '更多选项', searchPlaceholder: '在文档中查找…', previous: '上一个', next: '下一个', close: '关闭',
    library: '文档库', libraryViews: '文档库视图', recentReading: '最近阅读', favoriteDocuments: '收藏文档', resourceExplorer: '资源浏览器', recentTab: '最近', favoritesTab: '收藏', explorerTab: '资源', explorerTabTitle: '打开资源浏览器；再次点击可更改文件夹', refreshExplorer: '刷新资源浏览器', collapseSidebar: '收起侧栏', expandSidebar: '展开侧栏', openDocumentFolder: '打开文档文件夹',
    browseMarkdown: '集中浏览你的 Markdown', welcomeTitle: '阅读与编辑，都更简单',
    welcomeDescription: '一个专注、舒适的 Markdown 阅读与编辑空间。<br>打开文档，沉浸在文字本身。', openMarkdown: '打开 Markdown 文档',
    openFolder: '打开文件夹', quickOpenHint: '快速打开，也可以将文件拖到这里', revealFile: '定位文件', revealFileTitle: '在资源管理器中显示',
    print: '打印', printTitle: '打印文档', readingEnd: '阅读结束', livePreview: '实时预览', readingEffect: '阅读效果', markdownEditorLabel: 'MARKDOWN 编辑器',
    untitledDocument: '未命名文档', saved: '已保存', unsaved: '尚未保存', autoSaved: '已自动保存', saveAs: '另存为', exitEdit: '退出编辑', markdownEditorAria: 'Markdown 编辑器',
    codeLang: '选择编程语言', codeNoLang: '无语言（纯文本）',
    editorShortcut: '<kbd>Ctrl</kbd> + <kbd>S</kbd> 保存　 <kbd>Ctrl</kbd> + <kbd>E</kbd> 预览', backToTop: '回到顶部', backToTopAria: '回到文档顶部',
    toc: '本页目录', releaseToOpen: '松开以打开文档', interfaceLanguage: '界面语言', defaultApp: '设为默认 MD 应用', windowsSettings: 'Windows 设置',
    zoomIn: '放大文字', zoomOut: '缩小文字', zoomReset: '恢复字号', printDocument: '打印文档', copy: '复制', copied: '已复制',
    docWidth: '文档宽度', widthNarrow: '窄', widthMedium: '中', widthWide: '宽', widthFull: '全宽', docWidthChanged: '文档宽度：{level}',
    bodyFontScale: '文字字号 {percent}%', recentOpened: '最近打开', favorited: '已收藏', favoriteDocument: '收藏文档', unfavoriteDocument: '取消收藏', favoriteAdded: '已收藏文档', favoriteRemoved: '已取消收藏，原文件未删除', recentContextHint: '右键打开文档操作菜单', recentContextMenuTitle: '文档操作', recentEdit: '编辑', recentReveal: '打开所在文件夹', recentRemove: '移除', recentRevealFailed: '无法打开文件所在目录', recentMissing: '文件不存在', recentMissingTitle: '文件已删除、移动，或所在磁盘当前不可用', recentMissingAria: '{name}，文件不存在', recentRemoved: '已从最近阅读中移除，原文件未删除', emptyRecent: '还没有最近文档', emptyFavorites: '还没有收藏文档', emptyExplorer: '请先打开一个文件夹',
    markdownDocument: 'Markdown 文档', removeRecentTitle: '移除最近阅读记录', removeRecentAria: '从最近阅读中移除 {name}',
    discardConfirm: '当前文档有尚未保存的更改。\n\n确定要放弃更改并继续吗？', previewError: '暂时无法渲染当前内容',
    readingTime: '约 {minutes} 分钟 · {words} 字', renderFailed: 'Markdown 渲染失败', openFailed: '无法打开这个文件',
    editorPosition: '第 {line} 行，第 {column} 列', saveAsDone: '文档已另存为', saveDone: '文档已保存', saveFailed: '保存失败，请检查文件权限',
    folderOpenFailed: '无法打开文件夹中的文档', defaultAppHint: '请在“按文件类型指定默认应用”中选择 .md', dropUnsupported: '请拖入 Markdown 或文本文件',
    languageChanged: '界面语言已切换为简体中文', about: '关于', aboutProductLabel: 'MARKDOWN 阅读与编辑器',
    aboutVersion: '版本 2.4.1', aboutDescription: '一款专注、美观、跨平台的 Markdown 阅读与编辑工具，支持实时预览、语法高亮、目录导航、最近阅读和文档收藏。',
    authorEmail: '作者邮箱', openSourceAddress: '开源地址', aboutLicense: '基于 MIT 许可证开源', done: '完成',
    checkForUpdates: '检查更新', checkingForUpdates: '正在检查更新…', updateAvailableLabel: '软件更新', updateAvailable: '发现新版本',
    currentVersion: '当前版本', latestVersion: '最新版本', releaseNotes: '更新说明', noReleaseNotes: '此版本暂无更新说明。',
    remindLater: '稍后提醒', snooze30Days: '30 天内不再提醒', updateSnoozed: '未来 30 天不再自动提醒更新', openDownloadPage: '打开下载页面', alreadyLatest: '当前已是最新版本', updateCheckFailed: '检查更新失败，请稍后重试',
    downloadAndUpdate: '下载并更新', downloadingUpdate: '正在下载更新… {percent}%', preparingUpdate: '正在安装更新…', updateFailed: '更新失败，请稍后重试', updateBlockedByUnsavedChanges: '请先保存当前文档再更新',
    formatToolbar: 'Markdown 格式工具栏', undoTitle: '撤回 (Ctrl+Z)', heading: '标题', paragraph: '正文', heading1: '标题 1', heading2: '标题 2', heading3: '标题 3', heading4: '标题 4', heading5: '标题 5', heading6: '标题 6',
    boldTitle: '加粗 (Ctrl+B)', italicTitle: '斜体 (Ctrl+I)', strikethroughTitle: '删除线 (Ctrl+Shift+X)', highlightTitle: '高亮 (Ctrl+Shift+H)', linkTitle: '插入链接 (Ctrl+K)', inlineCode: '行内代码', codeBlock: '代码块', quote: '引用', unorderedList: '无序列表', orderedList: '有序列表', taskList: '任务列表', horizontalRule: '分隔线', insertTable: '插入表格', insertImage: '插入图片', imageAlt: '图片说明',
    moreFormats: '更多格式', toolbarOverflow: '折叠的工具栏格式', extendedFormats: '扩展格式', boldItalic: '粗斜体', underline: '下划线', superscript: '上标', subscript: '下标', hardBreak: '强制换行', footnote: '脚注', referenceLink: '引用式链接', collapsible: '折叠区块', keyboardKey: '键盘按键', autolink: '自动链接', escapeSyntax: '转义符号', htmlBlock: 'HTML 区块', comment: '注释', footnotes: '脚注', footnoteText: '脚注内容', referenceName: '引用名称', collapsibleTitle: '折叠标题',
    markdownTool: 'MARKDOWN 工具', tableDialogHint: '选择表格的行数和列数，表头占第一行。', rows: '行数', columns: '列数', cancel: '取消', insert: '插入', newFileFailed: '无法新建文档', imageSelectFailed: '无法选择图片', languageSaveFailed: '无法保存语言设置，请重试', imageDialogHint: '选择本地图片，或粘贴在线图片链接。', imageUrlLabel: '图片链接', imageUrlPlaceholder: 'https:// 或 http:// 链接', imageAltPlaceholder: '可选的图片说明', localImage: '本地图片…', imageUrlInvalid: '请输入有效的 http:// 或 https:// 链接',
    resizeSidebar: '拖动调整文档库宽度', resizeToc: '拖动调整目录宽度'
  },
  en: {
    appName: 'MD Reader Assistant', newFileTitle: 'New Markdown file (Ctrl+N)', newDocumentButton: 'New Document', openFileTitle: 'Open file (Ctrl+O)', openDocument: 'Open Document', openFolderTitle: 'Open folder (Ctrl+Shift+O)',
    toggleEditorTitle: 'Toggle editor/preview (Ctrl+E)', edit: 'Edit', preview: 'Preview', saveTitle: 'Save (Ctrl+S)', searchTitle: 'Find in document (Ctrl+F)',
    accentThemeTitle: 'Choose accent color', chooseAccentTheme: 'Choose accent color', colorModeTitle: 'Toggle light/dark mode', systemColorModeTitle: 'Temporarily switch light/dark mode; automatic following resumes at the next system appearance change', temporaryColorModeChanged: 'Temporarily switched to {mode} mode; automatic following resumes at the next system appearance change', lightModeName: 'light', darkModeName: 'dark', moreTitle: 'More options', searchPlaceholder: 'Find in document…', previous: 'Previous', next: 'Next', close: 'Close',
    library: 'LIBRARY', libraryViews: 'Library views', recentReading: 'Recent', favoriteDocuments: 'Favorites', resourceExplorer: 'Explorer', recentTab: 'Recent', favoritesTab: 'Favorites', explorerTab: 'Explorer', explorerTabTitle: 'Open the explorer; click again to choose another folder', refreshExplorer: 'Refresh explorer', collapseSidebar: 'Collapse sidebar', expandSidebar: 'Expand sidebar', openDocumentFolder: 'Open Document Folder',
    browseMarkdown: 'Browse your Markdown collection', welcomeTitle: 'Reading and editing, made simpler',
    welcomeDescription: 'A calm, focused space for reading and editing Markdown.<br>Open a document and stay with the words.', openMarkdown: 'Open Markdown Document',
    openFolder: 'Open Folder', quickOpenHint: 'Quick open, or drop a file here', revealFile: 'Show File', revealFileTitle: 'Show in File Explorer',
    print: 'Print', printTitle: 'Print document', readingEnd: 'End of document', livePreview: 'LIVE PREVIEW', readingEffect: 'Rendered document', markdownEditorLabel: 'MARKDOWN EDITOR',
    untitledDocument: 'Untitled document', saved: 'Saved', unsaved: 'Unsaved', autoSaved: 'Autosaved', saveAs: 'Save As', exitEdit: 'Exit editing', markdownEditorAria: 'Markdown editor',
    codeLang: 'Select a language', codeNoLang: 'No language (plain text)',
    editorShortcut: '<kbd>Ctrl</kbd> + <kbd>S</kbd> Save　 <kbd>Ctrl</kbd> + <kbd>E</kbd> Preview', backToTop: 'Back to top', backToTopAria: 'Back to document top',
    toc: 'ON THIS PAGE', releaseToOpen: 'Release to open document', interfaceLanguage: 'Interface language', defaultApp: 'Set as default MD app', windowsSettings: 'Windows Settings',
    zoomIn: 'Increase text size', zoomOut: 'Decrease text size', zoomReset: 'Reset text size', printDocument: 'Print document', copy: 'Copy', copied: 'Copied',
    docWidth: 'Document width', widthNarrow: 'Narrow', widthMedium: 'Medium', widthWide: 'Wide', widthFull: 'Full width', docWidthChanged: 'Document width: {level}',
    bodyFontScale: 'Text size {percent}%', recentOpened: 'Recently opened', favorited: 'Favorited', favoriteDocument: 'Add to Favorites', unfavoriteDocument: 'Remove from Favorites', favoriteAdded: 'Document added to Favorites', favoriteRemoved: 'Removed from Favorites. The original file was not deleted.', recentContextHint: 'Right-click for document actions', recentContextMenuTitle: 'Document actions', recentEdit: 'Edit', recentReveal: 'Show in Folder', recentRemove: 'Remove', recentRevealFailed: 'Unable to show the file in its folder', recentMissing: 'File unavailable', recentMissingTitle: 'The file was deleted, moved, or its disk is currently unavailable', recentMissingAria: '{name}, file unavailable', recentRemoved: 'Removed from Recent. The original file was not deleted.', emptyRecent: 'No recent documents', emptyFavorites: 'No favorite documents', emptyExplorer: 'Open a folder to browse files',
    markdownDocument: 'Markdown document', removeRecentTitle: 'Remove recent record', removeRecentAria: 'Remove {name} from Recent',
    discardConfirm: 'This document has unsaved changes.\n\nDiscard the changes and continue?', previewError: 'The current content cannot be rendered',
    readingTime: 'About {minutes} min · {words} words', renderFailed: 'Markdown rendering failed', openFailed: 'Unable to open this file',
    editorPosition: 'Line {line}, Column {column}', saveAsDone: 'Document saved as a new file', saveDone: 'Document saved', saveFailed: 'Save failed. Check file permissions.',
    folderOpenFailed: 'Unable to open a document from this folder', defaultAppHint: 'Choose this app for .md under “Choose defaults by file type”.', dropUnsupported: 'Drop a Markdown or text file',
    languageChanged: 'Interface language changed to English', about: 'About', aboutProductLabel: 'MARKDOWN READER & EDITOR',
    aboutVersion: 'Version 2.4.1', aboutDescription: 'A focused, beautiful, cross-platform Markdown reader and editor with live preview, syntax highlighting, navigation, recent reading, and document favorites.',
    authorEmail: 'Author email', openSourceAddress: 'Open-source repository', aboutLicense: 'Open source under the MIT License', done: 'Done',
    checkForUpdates: 'Check for updates', checkingForUpdates: 'Checking for updates…', updateAvailableLabel: 'SOFTWARE UPDATE', updateAvailable: 'A new version is available',
    currentVersion: 'Current version', latestVersion: 'Latest version', releaseNotes: 'What’s new', noReleaseNotes: 'No release notes are available for this version.',
    remindLater: 'Remind me later', snooze30Days: 'Don’t remind me for 30 days', updateSnoozed: 'Automatic update reminders paused for 30 days', openDownloadPage: 'Open download page', alreadyLatest: 'You’re using the latest version', updateCheckFailed: 'Unable to check for updates. Try again later.',
    downloadAndUpdate: 'Download & Update', downloadingUpdate: 'Downloading update… {percent}%', preparingUpdate: 'Installing update…', updateFailed: 'Update failed. Please try again.', updateBlockedByUnsavedChanges: 'Save the current document before updating',
    formatToolbar: 'Markdown formatting toolbar', undoTitle: 'Undo (Ctrl+Z)', heading: 'Heading', paragraph: 'Paragraph', heading1: 'Heading 1', heading2: 'Heading 2', heading3: 'Heading 3', heading4: 'Heading 4', heading5: 'Heading 5', heading6: 'Heading 6',
    boldTitle: 'Bold (Ctrl+B)', italicTitle: 'Italic (Ctrl+I)', strikethroughTitle: 'Strikethrough (Ctrl+Shift+X)', highlightTitle: 'Highlight (Ctrl+Shift+H)', linkTitle: 'Insert link (Ctrl+K)', inlineCode: 'Inline code', codeBlock: 'Code block', quote: 'Quote', unorderedList: 'Bulleted list', orderedList: 'Numbered list', taskList: 'Task list', horizontalRule: 'Horizontal rule', insertTable: 'Insert table', insertImage: 'Insert image', imageAlt: 'Image description',
    moreFormats: 'More formats', toolbarOverflow: 'Collapsed toolbar formats', extendedFormats: 'Extended formats', boldItalic: 'Bold italic', underline: 'Underline', superscript: 'Superscript', subscript: 'Subscript', hardBreak: 'Hard line break', footnote: 'Footnote', referenceLink: 'Reference link', collapsible: 'Collapsible section', keyboardKey: 'Keyboard key', autolink: 'Autolink', escapeSyntax: 'Escape syntax', htmlBlock: 'HTML block', comment: 'Comment', footnotes: 'Footnotes', footnoteText: 'Footnote text', referenceName: 'reference', collapsibleTitle: 'Section title',
    markdownTool: 'MARKDOWN TOOL', tableDialogHint: 'Choose the number of rows and columns. The first row is the header.', rows: 'Rows', columns: 'Columns', cancel: 'Cancel', insert: 'Insert', newFileFailed: 'Unable to create the document', imageSelectFailed: 'Unable to choose an image', languageSaveFailed: 'Unable to save the language setting. Please try again.', imageDialogHint: 'Pick a local image or paste an online image link.', imageUrlLabel: 'Image URL', imageUrlPlaceholder: 'https:// or http:// link', imageAltPlaceholder: 'Optional image description', localImage: 'Local image…', imageUrlInvalid: 'Enter a valid http:// or https:// link',
    resizeSidebar: 'Drag to resize the library', resizeToc: 'Drag to resize the outline'
  }
};

const codeMirrorTranslations = {
  'zh-CN': {
    Find: '查找内容', Replace: '替换为', next: '下一个', previous: '上一个', all: '全部选择',
    'match case': '区分大小写', regexp: '正则表达式', 'by word': '全字匹配', replace: '替换',
    'replace all': '全部替换', close: '关闭查找', 'current match': '当前匹配项', 'on line': '位于第',
    'replaced match on line $': '已替换第 $ 行的匹配项', 'replaced $ matches': '已替换 $ 个匹配项',
    'Go to line': '跳转到行', go: '跳转'
  },
  en: {}
};

function editorLanguageExtension() {
  return EditorState.phrases.of(codeMirrorTranslations[state.language] || codeMirrorTranslations.en);
}

function t(key, values = {}) {
  let template = translations[state.language]?.[key] ?? translations['zh-CN'][key] ?? key;
  if (document.documentElement.dataset.platform === 'darwin') template = template.replaceAll('Ctrl', '⌘');
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), template);
}

function applyStaticTranslations() {
  document.documentElement.lang = state.language === 'en' ? 'en' : 'zh-CN';
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(element => { element.innerHTML = t(element.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-title]').forEach(element => { element.title = t(element.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => { element.placeholder = t(element.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(element => { element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel)); });
  document.querySelectorAll('[data-i18n-label]').forEach(element => { element.label = t(element.dataset.i18nLabel); });
  document.querySelectorAll('[data-language]').forEach(button => button.classList.toggle('active', button.dataset.language === state.language));
  document.querySelectorAll('[data-accent-option]').forEach(button => {
    const name = ACCENT_THEMES[button.dataset.accentOption]?.[state.language === 'en' ? 'en' : 'zhCN'];
    const label = button.querySelector('.accent-option-name');
    if (label && name) label.textContent = name;
  });
  scheduleFormatToolbarLayout();
}

function setLanguage(language, silent = false, persist = true) {
  state.language = language === 'en' ? 'en' : 'zh-CN';
  localStorage.setItem('language', state.language);
  applyStaticTranslations();
  const persistence = persist ? window.leafMD.setLanguage(state.language) : Promise.resolve(state.language);
  els.editButtonLabel.textContent = t(state.editing ? 'preview' : 'edit');
  if (!state.currentFile) els.editorFileName.textContent = t('untitledDocument');
  updateLibraryHeading();
  if (codeEditor) {
    const reopenSearch = searchPanelOpen(codeEditor.state);
    if (reopenSearch) closeSearchPanel(codeEditor);
    codeEditor.dispatch({ effects: editorLanguage.reconfigure(editorLanguageExtension()) });
    if (reopenSearch) openSearchPanel(codeEditor);
    updateEditorPosition();
  }
  if (state.currentFile) {
    if (state.editing) renderEditorPreview(editorContent());
    else renderCurrentDocument();
  } else {
    renderFileList();
  }
  setDirty(state.dirty);
  if (!silent) showToast(t('languageChanged'));
  return persistence;
}

const els = {
  welcome: $('#welcome'), documentView: $('#documentView'), content: $('#markdownContent'),
  fileList: $('#fileList'), libraryName: $('#libraryName'), tocPanel: $('#tocPanel'), toc: $('#toc'),
  breadcrumb: $('#breadcrumb'), readingTime: $('#readingTime'), progressBar: $('#progressBar'),
  appShell: $('.app-shell'), sidebar: $('#sidebar'), expandSidebar: $('#expandSidebar'), sidebarResizer: $('#sidebarResizer'), tocResizer: $('#tocResizer'), searchBar: $('#searchBar'),
  searchInput: $('#searchInput'), searchCount: $('#searchCount'), dropOverlay: $('#dropOverlay'),
  moreMenu: $('#moreMenu'), accentMenu: $('#accentMenu'), recentContextMenu: $('#recentContextMenu'), toast: $('#toast'), editorView: $('#editorView'),
  editor: $('#markdownEditor'), editorPreview: $('#editorPreviewContent'), editorFileName: $('#editorFileName'), editorSaveState: $('#editorSaveState'),
  editorPosition: $('#editorPosition'), editButton: $('#editButton'), editButtonLabel: $('#editButtonLabel'),
  exitEditButton: $('#exitEditButton'), codeLangMenu: $('#codeLangMenu'),
  saveButton: $('#saveButton'), backToTop: $('#backToTop'), firstRunLanguageDialog: $('#firstRunLanguageDialog'), aboutDialog: $('#aboutDialog'), updateDialog: $('#updateDialog'),
  recentTab: $('#recentTab'), favoritesTab: $('#favoritesTab'), explorerTab: $('#explorerTab'), refreshExplorer: $('#refreshExplorer'), tableDialog: $('#tableDialog'), imageDialog: $('#imageDialog'), imageUrl: $('#imageUrl'), imageAltInput: $('#imageAltInput'),
  editorUndoButton: $('#editorUndoButton')
};

marked.use({
  gfm: true,
  breaks: false,
  extensions: [highlightExtension],
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const safeTitle = title ? ` title="${title}"` : '';
      return `<a href="${href}"${safeTitle} target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
    image({ href, title, text }) {
      const safeTitle = title ? ` title="${escapeHtml(title)}"` : '';
      const safeHref = escapeHtml(href || '');
      return `<img src="${safeHref}" data-markdown-src="${safeHref}" alt="${escapeHtml(text || '')}"${safeTitle}>`;
    },
    code({ text, lang }) {
      const valid = lang && hljs.getLanguage(lang);
      const highlighted = valid ? hljs.highlight(text, { language: lang }).value : hljs.highlightAuto(text).value;
      const label = lang || 'code';
      return `<div class="code-block"><div class="code-header"><span>${label}</span><button class="copy-code" type="button">${t('copy')}</button></div><pre><code class="hljs${valid ? ` language-${lang}` : ''}">${highlighted}</code></pre></div>`;
    }
  }
});

function createMarkdownHighlightStyle() {
  return HighlightStyle.define([
  { tag: tags.heading1, color: 'var(--syntax-heading)', fontWeight: '800', fontSize: '1.25em' },
  { tag: tags.heading2, color: 'var(--syntax-heading-2)', fontWeight: '750', fontSize: '1.14em' },
  { tag: [tags.heading3, tags.heading4, tags.heading5, tags.heading6], color: 'var(--syntax-heading-3)', fontWeight: '700' },
  { tag: tags.strong, color: 'var(--syntax-strong)', fontWeight: '750' },
  { tag: tags.emphasis, color: 'var(--syntax-emphasis)', fontStyle: 'italic' },
  { tag: tags.link, color: 'var(--syntax-link)', textDecoration: 'underline' },
  { tag: tags.url, color: 'var(--syntax-url)' },
  { tag: tags.quote, color: 'var(--syntax-quote)', fontStyle: 'italic' },
  { tag: tags.list, color: 'var(--syntax-list)', fontWeight: '700' },
  { tag: tags.monospace, color: 'var(--syntax-code)', fontFamily: '"Cascadia Code", Consolas, monospace' },
  { tag: [tags.meta, tags.processingInstruction], color: 'var(--syntax-meta)' },
  { tag: tags.contentSeparator, color: 'var(--syntax-separator)' },
  { tag: tags.comment, color: 'var(--syntax-comment)', fontStyle: 'italic' },
  { tag: tags.keyword, color: 'var(--syntax-keyword)' },
  { tag: tags.string, color: 'var(--syntax-string)' },
  { tag: tags.number, color: 'var(--syntax-number)' },
  { tag: tags.bool, color: 'var(--syntax-keyword)' },
  { tag: tags.punctuation, color: 'var(--syntax-punctuation)' }
  ]);
}

function loadEditorDependencies() {
  if (editorDependenciesPromise) return editorDependenciesPromise;
  editorDependenciesPromise = Promise.all([
    import('codemirror'),
    import('@codemirror/state'),
    import('@codemirror/view'),
    import('@codemirror/commands'),
    import('@codemirror/search'),
    import('@codemirror/language'),
    import('@codemirror/lang-markdown'),
    import('@lezer/highlight')
  ]).then(([codemirrorModule, stateModule, viewModule, commandsModule, searchModule, languageModule, markdownModule, highlightModule]) => {
    basicSetup = codemirrorModule.basicSetup;
    Compartment = stateModule.Compartment;
    EditorState = stateModule.EditorState;
    EditorView = viewModule.EditorView;
    keymap = viewModule.keymap;
    undo = commandsModule.undo;
    undoDepth = commandsModule.undoDepth;
    closeSearchPanel = searchModule.closeSearchPanel;
    openSearchPanel = searchModule.openSearchPanel;
    searchPanelOpen = searchModule.searchPanelOpen;
    HighlightStyle = languageModule.HighlightStyle;
    syntaxHighlighting = languageModule.syntaxHighlighting;
    markdown = markdownModule.markdown;
    tags = highlightModule.tags;
    editorLanguage = new Compartment();
    markdownHighlightStyle = createMarkdownHighlightStyle();
  });
  return editorDependenciesPromise;
}

function editorContent() {
  return codeEditor?.state.doc.toString() || '';
}

function isPlainTextFile(path) {
  return /\.txt$/i.test(path || '');
}

function createEditorState(content = '', moveToStart = true) {
  const language = isPlainTextFile(state.currentFile?.path)
    ? []
    : [markdown(), syntaxHighlighting(markdownHighlightStyle)];
  return EditorState.create({
    doc: content,
    selection: { anchor: moveToStart ? 0 : content.length },
    extensions: [...editorExtensions, ...language, editorLanguage.of(editorLanguageExtension())]
  });
}

function updateUndoButton(editorState = codeEditor?.state) {
  if (!els.editorUndoButton || !editorState) return;
  els.editorUndoButton.disabled = undoDepth(editorState) === 0;
}

// Opening another document creates a brand-new editor state. This is
// intentionally stronger than replacing the text: it discards the previous
// document's undo history, making the newly loaded content the undo baseline.
function replaceEditorContent(content, moveToStart = false) {
  if (!codeEditor) return;
  suppressEditorChanges = true;
  codeEditor.setState(createEditorState(content, moveToStart));
  suppressEditorChanges = false;
  updateUndoButton();
}

function focusCodeEditor() {
  if (!codeEditor) return;
  requestAnimationFrame(() => {
    codeEditor.requestMeasure();
    requestAnimationFrame(() => codeEditor.focus());
  });
}

function replaceSelection(insert, selectFrom = 0, selectLength = 0) {
  if (!codeEditor || !state.editing) return false;
  const selection = codeEditor.state.selection.main;
  codeEditor.dispatch({
    changes: { from: selection.from, to: selection.to, insert },
    selection: { anchor: selection.from + selectFrom, head: selection.from + selectFrom + selectLength },
    scrollIntoView: true
  });
  codeEditor.focus();
  return true;
}

function wrapSelection(before, after, placeholder) {
  const selection = codeEditor?.state.selection.main;
  if (!selection || !state.editing) return false;
  const selected = codeEditor.state.doc.sliceString(selection.from, selection.to) || placeholder;
  return replaceSelection(`${before}${selected}${after}`, before.length, selected.length);
}

function formatSelectedLines(kind, headingPrefix = '') {
  if (!codeEditor || !state.editing) return false;
  const selection = codeEditor.state.selection.main;
  const first = codeEditor.state.doc.lineAt(selection.from);
  const last = codeEditor.state.doc.lineAt(selection.to);
  const original = codeEditor.state.doc.sliceString(first.from, last.to);
  const lines = original.split('\n');
  const formatted = lines.map((line, index) => {
    if (kind === 'heading') return `${headingPrefix}${line.replace(/^#{1,6}\s+/, '')}`;
    if (kind === 'quote') return `> ${line}`;
    if (kind === 'unordered-list') return `- ${line.replace(/^[-*+]\s+/, '')}`;
    if (kind === 'ordered-list') return `${index + 1}. ${line.replace(/^\d+[.)]\s+/, '')}`;
    if (kind === 'task-list') return `- [ ] ${line.replace(/^[-*+]\s+(?:\[[ xX]\]\s+)?/, '')}`;
    return line;
  }).join('\n');
  codeEditor.dispatch({
    changes: { from: first.from, to: last.to, insert: formatted },
    selection: { anchor: first.from, head: first.from + formatted.length },
    scrollIntoView: true
  });
  codeEditor.focus();
  return true;
}

function runFormatCommand(command) {
  if (!state.editing) toggleEditor(true);
  if (!codeEditor || !state.currentFile) return false;
  if (command === 'bold') return wrapSelection('**', '**', t('boldTitle').split(' ')[0]);
  if (command === 'italic') return wrapSelection('*', '*', t('italicTitle').split(' ')[0]);
  if (command === 'bold-italic') return wrapSelection('***', '***', t('boldItalic'));
  if (command === 'strikethrough') return wrapSelection('~~', '~~', t('strikethroughTitle').split(' ')[0]);
  if (command === 'highlight') return wrapSelection('==', '==', t('highlightTitle').split(' ')[0]);
  if (command === 'underline') return wrapSelection('<u>', '</u>', t('underline'));
  if (command === 'superscript') return wrapSelection('<sup>', '</sup>', t('superscript'));
  if (command === 'subscript') return wrapSelection('<sub>', '</sub>', t('subscript'));
  if (command === 'keyboard-key') return wrapSelection('<kbd>', '</kbd>', state.language === 'en' ? 'Key' : '按键');
  if (command === 'comment') return wrapSelection('<!-- ', ' -->', state.language === 'en' ? 'comment' : '注释');
  if (command === 'autolink') return wrapSelection('<', '>', 'https://example.com');
  if (command === 'escape') {
    const selection = codeEditor.state.selection.main;
    const selected = codeEditor.state.doc.sliceString(selection.from, selection.to) || '*';
    const escaped = escapeMarkdownText(selected);
    return replaceSelection(escaped, 0, escaped.length);
  }
  if (command === 'html-block') {
    const selection = codeEditor.state.selection.main;
    const selected = codeEditor.state.doc.sliceString(selection.from, selection.to) || (state.language === 'en' ? 'Content' : '内容');
    return replaceSelection(`<div>\n${selected}\n</div>`, 6, selected.length);
  }
  if (command === 'link') {
    const selection = codeEditor.state.selection.main;
    const selected = codeEditor.state.doc.sliceString(selection.from, selection.to) || (state.language === 'en' ? 'link text' : '链接文字');
    const prefix = `[${selected}](`;
    return replaceSelection(`${prefix}https://)`, prefix.length, 8);
  }
  if (command === 'inline-code') return wrapSelection('`', '`', 'code');
  if (command === 'code-block') { openCodeLangMenu(); return true; }
  if (command === 'horizontal-rule') return replaceSelection('\n\n---\n\n', 5, 0);
  if (command === 'hard-break') return replaceSelection('  \n', 3, 0);
  if (command === 'footnote') {
    const selection = codeEditor.state.selection.main;
    const selected = codeEditor.state.doc.sliceString(selection.from, selection.to) || t('footnoteText');
    const number = nextFootnoteNumber(codeEditor.state.doc.toString());
    const reference = `[^${number}]`;
    return replaceSelection(`${reference}\n\n${reference}: ${selected}`, 0, reference.length);
  }
  if (command === 'reference-link') {
    const selection = codeEditor.state.selection.main;
    const selected = codeEditor.state.doc.sliceString(selection.from, selection.to) || (state.language === 'en' ? 'link text' : '链接文字');
    const name = t('referenceName');
    return replaceSelection(`[${selected}][${name}]\n\n[${name}]: https://`, 1, selected.length);
  }
  if (command === 'collapsible') {
    const selection = codeEditor.state.selection.main;
    const selected = codeEditor.state.doc.sliceString(selection.from, selection.to) || (state.language === 'en' ? 'Content' : '折叠内容');
    const summary = t('collapsibleTitle');
    return replaceSelection(`<details>\n<summary>${summary}</summary>\n\n${selected}\n\n</details>`, 19, summary.length);
  }
  if (['quote', 'unordered-list', 'ordered-list', 'task-list'].includes(command)) return formatSelectedLines(command);
  if (command === 'table') { openTableDialog(); return true; }
  if (command === 'image') { insertImage(); return true; }
  return false;
}

let formatToolbarLayoutFrame;
let formatToolbarResizeObserver;

// 代码块常用编程语言（value 为 highlight.js 可识别的语言别名）
const CODE_LANGUAGES = [
  { value: 'js', label: 'JavaScript' },
  { value: 'ts', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'rust', label: 'Rust' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'bash', label: 'Bash' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'markdown', label: 'Markdown' }
];

let codeLangMenuBuilt = false;

function buildCodeLangMenu() {
  if (codeLangMenuBuilt) return;
  codeLangMenuBuilt = true;
  const menu = els.codeLangMenu;
  for (const lang of CODE_LANGUAGES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.role = 'menuitem';
    button.dataset.codeLang = lang.value;
    button.textContent = lang.label;
    menu.append(button);
  }
  const plain = document.createElement('button');
  plain.type = 'button';
  plain.role = 'menuitem';
  plain.dataset.codeLang = '';
  plain.dataset.i18n = 'codeNoLang';
  plain.textContent = t('codeNoLang');
  menu.append(plain);
}

// 在代码块按钮下方弹出编程语言选择菜单；再次调用则关闭。
function openCodeLangMenu() {
  buildCodeLangMenu();
  const menu = els.codeLangMenu;
  const wasHidden = menu.classList.contains('hidden');
  menu.classList.add('hidden');
  if (!wasHidden) return;
  els.moreMenu.classList.add('hidden');
  closeAccentMenu();
  closeRecentContextMenu();
  const anchor = $('[data-format="code-block"]:not([hidden])') || $('#moreFormatSelect');
  const rect = anchor?.getBoundingClientRect();
  menu.classList.remove('hidden');
  menu.style.left = 'auto';
  menu.style.top = 'auto';
  menu.style.right = 'auto';
  if (rect) {
    const margin = 8;
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    let left = rect.left;
    if (left + width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - width - margin);
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - margin) top = Math.max(margin, rect.top - height - 6);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }
}

// 插入带指定语言的代码块；lang 为空时插入无语言围栏。
function insertCodeBlock(lang = '') {
  if (!codeEditor) return false;
  const selection = codeEditor.state.selection.main;
  const selected = codeEditor.state.doc.sliceString(selection.from, selection.to) || 'code';
  const fence = lang ? `\`\`\`${lang}\n${selected}\n\`\`\`` : `\`\`\`\n${selected}\n\`\`\``;
  const caret = lang ? 4 + lang.length : 4;
  return replaceSelection(fence, caret, selected.length);
}

function syncFormatDividers() {
  const bar = $('#editorFormatBar');
  if (!bar) return;
  const directFormats = [...bar.querySelectorAll('[data-format-overflow]')];
  bar.querySelectorAll('[data-divider-before]').forEach(divider => {
    const target = divider.dataset.dividerBefore;
    const hasVisibleTarget = target === 'more'
      ? directFormats.some(element => !element.hidden)
      : directFormats.some(element => element.dataset.formatGroup === target && !element.hidden);
    divider.hidden = !hasVisibleTarget;
  });
}

function rebuildOverflowFormatOptions() {
  const group = $('#overflowFormatGroup');
  const bar = $('#editorFormatBar');
  if (!group || !bar) return;
  group.replaceChildren();
  for (const element of bar.querySelectorAll('[data-format-overflow][hidden]')) {
    if (element.id === 'headingSelect') {
      for (const heading of element.options) {
        const option = document.createElement('option');
        option.value = `heading:${heading.value}`;
        option.textContent = t(heading.dataset.i18n);
        group.append(option);
      }
      continue;
    }
    const option = document.createElement('option');
    option.value = element.dataset.formatOverflow;
    option.textContent = t(element.dataset.formatLabel).replace(/\s+\([^)]*\)$/, '');
    group.append(option);
  }
  group.hidden = group.children.length === 0;
}

function layoutFormatToolbar() {
  const bar = $('#editorFormatBar');
  if (!bar || bar.clientWidth === 0) return;
  const candidates = [...bar.querySelectorAll('[data-format-overflow]')];
  candidates.forEach(element => { element.hidden = false; });
  syncFormatDividers();

  const byOverflowPriority = [...candidates].sort((first, second) =>
    Number(first.dataset.overflowPriority) - Number(second.dataset.overflowPriority)
  );
  for (const candidate of byOverflowPriority) {
    if (bar.scrollWidth <= bar.clientWidth + 1) break;
    candidate.hidden = true;
    syncFormatDividers();
  }
  rebuildOverflowFormatOptions();
}

function scheduleFormatToolbarLayout() {
  cancelAnimationFrame(formatToolbarLayoutFrame);
  formatToolbarLayoutFrame = requestAnimationFrame(layoutFormatToolbar);
}

function initializeFormatToolbarOverflow() {
  const bar = $('#editorFormatBar');
  if (!bar) return;
  if ('ResizeObserver' in window) {
    formatToolbarResizeObserver = new ResizeObserver(scheduleFormatToolbarLayout);
    formatToolbarResizeObserver.observe(bar);
  } else {
    window.addEventListener('resize', scheduleFormatToolbarLayout);
  }
  scheduleFormatToolbarLayout();
}

function openTableDialog() {
  if (!state.currentFile) return;
  els.tableDialog.classList.remove('hidden');
  document.body.classList.add('dialog-open');
  requestAnimationFrame(() => $('#tableRows').focus());
}

function closeTableDialog() {
  if (els.tableDialog.classList.contains('hidden')) return;
  els.tableDialog.classList.add('hidden');
  document.body.classList.remove('dialog-open');
  focusCodeEditor();
}

function insertTable() {
  const rows = Math.max(2, Math.min(20, Number($('#tableRows').value) || 3));
  const columns = Math.max(1, Math.min(12, Number($('#tableColumns').value) || 3));
  const header = `| ${Array.from({ length: columns }, (_, index) => `${t('columns')} ${index + 1}`).join(' | ')} |`;
  const divider = `| ${Array(columns).fill('---').join(' | ')} |`;
  const body = Array.from({ length: rows - 1 }, () => `| ${Array(columns).fill(' ').join(' | ')} |`);
  replaceSelection(`${header}\n${divider}\n${body.join('\n')}\n`, 2, Math.max(1, t('columns').length + 2));
  closeTableDialog();
}

function openImageDialog() {
  if (!state.currentFile) return;
  els.imageUrl.value = '';
  const selection = codeEditor.state.selection.main;
  els.imageAltInput.value = codeEditor.state.doc.sliceString(selection.from, selection.to) || '';
  els.imageDialog.classList.remove('hidden');
  document.body.classList.add('dialog-open');
  requestAnimationFrame(() => els.imageUrl.focus());
}

function closeImageDialog() {
  if (els.imageDialog.classList.contains('hidden')) return;
  els.imageDialog.classList.add('hidden');
  document.body.classList.remove('dialog-open');
  focusCodeEditor();
}

function selectedImageAlt() {
  if (codeEditor && !codeEditor.state.selection.main.empty) {
    return codeEditor.state.doc.sliceString(codeEditor.state.selection.main.from, codeEditor.state.selection.main.to).replaceAll('[', '\\[').replaceAll(']', '\\]');
  }
  return '';
}

function insertImage() {
  openImageDialog();
}

async function insertLocalImage() {
  if (!state.currentFile) return;
  try {
    const imagePath = await window.leafMD.selectImage(state.currentFile.path);
    if (!imagePath) return;
    const selected = els.imageAltInput.value.trim().replaceAll('[', '\\[').replaceAll(']', '\\]') || selectedImageAlt() || t('imageAlt');
    const markdownPath = /[\s()]/.test(imagePath) ? `<${imagePath.replaceAll('>', '%3E')}>` : imagePath;
    replaceSelection(`![${selected}](${markdownPath})`, 2, selected.length);
  } catch (error) {
    console.error(error);
    showToast(t('imageSelectFailed'));
  }
}

function insertImageFromUrl() {
  if (!state.currentFile) return;
  const url = els.imageUrl.value.trim();
  if (!/^https?:\/\/\S+$/i.test(url)) {
    showToast(t('imageUrlInvalid'));
    els.imageUrl.focus();
    return;
  }
  const selected = els.imageAltInput.value.trim().replaceAll('[', '\\[').replaceAll(']', '\\]') || selectedImageAlt() || t('imageAlt');
  const markdownPath = /[\s()]/.test(url) ? `<${url.replaceAll('>', '%3E')}>` : url;
  replaceSelection(`![${selected}](${markdownPath})`, 2, selected.length);
  closeImageDialog();
}

async function initializeCodeEditor() {
  if (codeEditor) return codeEditor;
  if (editorInitializationPromise) return editorInitializationPromise;
  editorInitializationPromise = (async () => {
    await loadEditorDependencies();
    const saveKeymap = keymap.of([
    { key: 'Mod-s', run: () => { saveDocument(false); return true; } },
    { key: 'Mod-Shift-s', run: () => { saveDocument(true); return true; } },
    { key: 'Mod-e', run: () => { toggleEditor(false); return true; } },
    { key: 'Mod-f', run: view => openSearchPanel(view) },
    { key: 'Mod-b', run: () => runFormatCommand('bold') },
    { key: 'Mod-i', run: () => runFormatCommand('italic') },
    { key: 'Mod-k', run: () => runFormatCommand('link') },
    { key: 'Mod-Shift-x', run: () => runFormatCommand('strikethrough') },
    { key: 'Mod-Shift-h', run: () => runFormatCommand('highlight') }
  ]);
    const editorTheme = EditorView.theme({
    '&': { height: '100%', backgroundColor: 'transparent', color: 'var(--text)' },
    '.cm-scroller': { overflow: 'auto', fontFamily: '"Cascadia Code", "Microsoft YaHei UI", Consolas, monospace' },
    '.cm-content': { padding: '24px 32px 60px', caretColor: 'var(--accent-strong)', lineHeight: '1.75' },
    '.cm-line': { padding: '0 4px' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent-strong)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'color-mix(in srgb, var(--accent) 28%, transparent)' },
    '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--accent-soft) 34%, transparent)' },
    '.cm-gutters': { backgroundColor: 'var(--paper)', color: 'var(--faint)', borderRight: '1px solid var(--line)', minWidth: '48px' },
    '.cm-activeLineGutter': { backgroundColor: 'var(--accent-soft)', color: 'var(--accent-strong)' },
    '.cm-foldPlaceholder': { backgroundColor: 'var(--accent-soft)', border: '1px solid var(--line)', color: 'var(--accent-strong)' },
    '.cm-panels': { backgroundColor: 'transparent', color: 'var(--text)' },
    '.cm-panels-bottom': { borderTop: '0' },
    '.cm-panel.cm-search': {
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px',
      padding: '12px 48px 12px 14px',
      backgroundColor: 'color-mix(in srgb, var(--paper) 94%, var(--accent-soft))',
      borderTop: '1px solid var(--line)', boxShadow: '0 -12px 30px rgba(32, 49, 39, .09)',
      fontFamily: '"Microsoft YaHei UI", "PingFang SC", system-ui, sans-serif'
    },
    '.cm-panel.cm-search br': { display: 'block', flexBasis: '100%', width: '0', height: '0' },
    '.cm-panel.cm-search .cm-textfield': {
      boxSizing: 'border-box', flex: '0 1 320px', width: 'min(320px, 34vw)', minWidth: '180px', height: '34px',
      padding: '0 12px', border: '1px solid var(--line)', borderRadius: '9px',
      backgroundColor: 'var(--paper)', color: 'var(--text)', fontSize: '12px', outline: 'none',
      boxShadow: 'inset 0 1px 2px rgba(32, 49, 39, .04)', transition: 'border-color .15s, box-shadow .15s'
    },
    '.cm-panel.cm-search .cm-textfield:focus': {
      borderColor: 'var(--accent)', boxShadow: '0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent)'
    },
    '.cm-panel.cm-search .cm-button': {
      boxSizing: 'border-box', height: '32px', padding: '0 13px', border: '1px solid var(--line)',
      borderRadius: '8px', backgroundImage: 'none', backgroundColor: 'var(--panel)', color: 'var(--text)',
      fontSize: '11.5px', fontWeight: '650', cursor: 'pointer', transition: 'background .15s, border-color .15s, color .15s, transform .15s'
    },
    '.cm-panel.cm-search .cm-button:hover': {
      backgroundImage: 'none', backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent)', color: 'var(--accent-strong)'
    },
    '.cm-panel.cm-search .cm-button:active': { transform: 'translateY(1px)' },
    '.cm-panel.cm-search button[name="next"], .cm-panel.cm-search button[name="replace"]': {
      backgroundImage: 'none', backgroundColor: 'var(--accent-strong)', borderColor: 'var(--accent-strong)', color: 'var(--accent-contrast)'
    },
    '.cm-panel.cm-search button[name="next"]:hover, .cm-panel.cm-search button[name="replace"]:hover': {
      backgroundImage: 'none', backgroundColor: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-contrast)'
    },
    '.cm-panel.cm-search label': {
      display: 'inline-flex', alignItems: 'center', gap: '5px', minHeight: '28px',
      color: 'var(--muted)', fontSize: '11px', fontWeight: '550', whiteSpace: 'nowrap', cursor: 'pointer'
    },
    '.cm-panel.cm-search input[type="checkbox"]': { width: '14px', height: '14px', margin: '0', accentColor: 'var(--accent-strong)' },
    '.cm-panel.cm-search button[name="close"]': {
      position: 'absolute', top: '11px', right: '12px', display: 'grid', placeItems: 'center',
      width: '28px', height: '28px', padding: '0', border: '0', borderRadius: '8px',
      backgroundColor: 'transparent', color: 'var(--muted)', fontSize: '20px', lineHeight: '1', cursor: 'pointer'
    },
    '.cm-panel.cm-search button[name="close"]:hover': { backgroundColor: 'var(--accent-soft)', color: 'var(--accent-strong)' },
    '.cm-searchMatch': { backgroundColor: '#eadc7a66', outline: '1px solid #c7ad42' },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: '#e2a64d88' }
  });
    editorExtensions = [
    basicSetup,
    editorTheme,
    saveKeymap,
    EditorView.lineWrapping,
    EditorView.updateListener.of(update => {
      if (update.docChanged && !suppressEditorChanges && state.currentFile) {
        state.currentFile.content = update.state.doc.toString();
        setDirty(state.currentFile.content !== state.savedContent);
        clearTimeout(renderEditorPreview.timer);
        renderEditorPreview.timer = setTimeout(() => renderEditorPreview(state.currentFile.content), 90);
      }
      if (update.docChanged || update.selectionSet) {
        updateEditorPosition();
        scrollPreviewToCursor();
      }
      updateUndoButton(update.state);
    })
  ];
    codeEditor = new EditorView({
      state: createEditorState(''),
      parent: els.editor
    });
    els.editor.addEventListener('pointerdown', () => {
      if (state.editing && !codeEditor.hasFocus) codeEditor.focus();
    }, true);
    return codeEditor;
  })();
  return editorInitializationPromise;
}

function slugify(text, index) {
  return `${text.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section'}-${index}`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.add('hidden'), 1800);
}

function updateAccentSelection() {
  document.querySelectorAll('[data-accent-option]').forEach(button => {
    const active = button.dataset.accentOption === state.accentTheme;
    button.classList.toggle('active', active);
    button.setAttribute('aria-checked', String(active));
  });
}

function updateThemedLogos() {
  const logo = ACCENT_THEMES[state.accentTheme].logo;
  document.querySelectorAll('[data-themed-logo]').forEach(image => { image.src = logo; });
}

function setAccentTheme(accentId) {
  state.accentTheme = normalizeAccentTheme(accentId);
  document.documentElement.dataset.accent = state.accentTheme;
  localStorage.setItem('accentTheme', state.accentTheme);
  updateAccentSelection();
  updateThemedLogos();
}

function setColorMode(mode, persist = true) {
  state.colorMode = normalizeColorMode(mode);
  document.documentElement.dataset.colorMode = state.colorMode;
  if (persist) localStorage.setItem('colorMode', state.colorMode);
  $('#colorModeButton').setAttribute('aria-pressed', String(state.colorMode === 'dark'));
  window.leafMD.setTheme(state.colorMode === 'dark');
}

function toggleColorMode() {
  if (document.documentElement.dataset.platform === 'darwin' && macSystemColorScheme) {
    macTemporaryColorMode = temporaryMacColorModeAfterToggle(state.colorMode, macSystemColorScheme.matches);
    const nextMode = resolveMacColorMode(macSystemColorScheme.matches, macTemporaryColorMode);
    setColorMode(nextMode, false);
    if (macTemporaryColorMode) {
      showToast(t('temporaryColorModeChanged', { mode: t(`${nextMode}ModeName`) }));
    } else {
      showToast(t('systemColorModeTitle'));
    }
    return;
  }
  setColorMode(state.colorMode === 'dark' ? 'light' : 'dark');
}

let macSystemColorScheme;
let macTemporaryColorMode = null;

function syncMacSystemColorMode(clearTemporaryOverride = false) {
  if (!macSystemColorScheme) return;
  if (clearTemporaryOverride) macTemporaryColorMode = null;
  setColorMode(resolveMacColorMode(macSystemColorScheme.matches, macTemporaryColorMode), false);
}

function initializeMacSystemColorMode() {
  if (document.documentElement.dataset.platform !== 'darwin' || !window.matchMedia) return false;
  macSystemColorScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const button = $('#colorModeButton');
  button.dataset.i18nTitle = 'systemColorModeTitle';
  button.dataset.i18nAriaLabel = 'systemColorModeTitle';
  button.title = t('systemColorModeTitle');
  button.setAttribute('aria-label', t('systemColorModeTitle'));
  button.dataset.systemManaged = 'true';
  const handleSystemColorModeChange = () => syncMacSystemColorMode(true);
  if (macSystemColorScheme.addEventListener) macSystemColorScheme.addEventListener('change', handleSystemColorModeChange);
  else macSystemColorScheme.addListener(handleSystemColorModeChange);
  syncMacSystemColorMode();
  return true;
}

let macWindowModePollTimer;
let macWindowModePollDeadline = 0;

async function syncMacWindowFullscreen() {
  if (document.documentElement.dataset.platform !== 'darwin') return;
  try {
    const fullscreen = await window.leafMD.isWindowFullscreen();
    document.documentElement.dataset.windowFullscreen = fullscreen ? 'true' : 'false';
  } catch (error) {
    console.warn('Unable to read macOS fullscreen state', error);
  }
}

function scheduleMacWindowModeSync() {
  if (document.documentElement.dataset.platform !== 'darwin') return;
  macWindowModePollDeadline = performance.now() + 1800;
  if (macWindowModePollTimer) return;

  const poll = async () => {
    await syncMacWindowFullscreen();
    if (performance.now() < macWindowModePollDeadline) {
      macWindowModePollTimer = setTimeout(poll, 32);
    } else {
      macWindowModePollTimer = undefined;
    }
  };
  macWindowModePollTimer = setTimeout(poll, 0);
}

function closeAccentMenu() {
  els.accentMenu.classList.add('hidden');
  $('#accentButton').setAttribute('aria-expanded', 'false');
}

function closeRecentContextMenu() {
  els.recentContextMenu.classList.add('hidden');
  delete els.recentContextMenu.dataset.path;
}

function openRecentContextMenu(event, filePath, missing) {
  event.preventDefault();
  event.stopPropagation();
  els.moreMenu.classList.add('hidden');
  closeAccentMenu();

  els.recentContextMenu.dataset.path = encodeURIComponent(filePath);
  const isFavorite = state.favoriteFiles.some(file => sameDocumentPath(file.path, filePath));
  const favoriteButton = $('#favoriteContextAction');
  favoriteButton.dataset.favoriteState = isFavorite ? 'remove' : 'add';
  $('#favoriteContextLabel').textContent = t(isFavorite ? 'unfavoriteDocument' : 'favoriteDocument');
  $('#recentRemoveDivider').classList.toggle('hidden', state.sidebarMode !== 'recent');
  $('#recentRemoveAction').classList.toggle('hidden', state.sidebarMode !== 'recent');
  els.recentContextMenu.querySelectorAll('[data-recent-action]').forEach(button => {
    const favoriteRemoval = button.dataset.recentAction === 'favorite' && isFavorite;
    const disabled = missing && button.dataset.recentAction !== 'remove' && !favoriteRemoval;
    button.disabled = disabled;
    button.setAttribute('aria-disabled', String(disabled));
  });
  els.recentContextMenu.classList.remove('hidden');

  const menuRect = els.recentContextMenu.getBoundingClientRect();
  const left = Math.max(8, Math.min(event.clientX, window.innerWidth - menuRect.width - 8));
  const top = Math.max(8, Math.min(event.clientY, window.innerHeight - menuRect.height - 8));
  els.recentContextMenu.style.left = `${left}px`;
  els.recentContextMenu.style.top = `${top}px`;
  requestAnimationFrame(() => els.recentContextMenu.querySelector('button:not(:disabled)')?.focus());
}

function toggleAccentMenu() {
  const opening = els.accentMenu.classList.contains('hidden');
  els.moreMenu.classList.add('hidden');
  closeRecentContextMenu();
  els.accentMenu.classList.toggle('hidden', !opening);
  $('#accentButton').setAttribute('aria-expanded', String(opening));
  if (opening) requestAnimationFrame(() => els.accentMenu.querySelector('[aria-checked="true"]')?.focus());
}

function setFontScale(scale, silent = false) {
  state.fontScale = Math.max(.82, Math.min(2, scale));
  document.documentElement.style.setProperty('--font-scale', state.fontScale);
  localStorage.setItem('fontScale', state.fontScale);
  if (!silent) showToast(t('bodyFontScale', { percent: Math.round(state.fontScale * 100) }));
}

function normalizeDocWidth(value) {
  return DOC_WIDTH_LEVELS.includes(value) ? value : 'medium';
}

function setDocumentWidth(level, silent = false) {
  state.docWidth = normalizeDocWidth(level);
  document.body.dataset.docWidth = state.docWidth;
  localStorage.setItem('docWidth', state.docWidth);
  document.querySelectorAll('#moreMenu button[data-doc-width]').forEach(button => {
    const active = button.dataset.docWidth === state.docWidth;
    button.classList.toggle('active', active);
    button.setAttribute('aria-checked', String(active));
  });
  if (!silent) showToast(t('docWidthChanged', { level: t(`width${state.docWidth.charAt(0).toUpperCase()}${state.docWidth.slice(1)}`) }));
}

function handlePreviewWheelZoom(event) {
  const direction = previewWheelZoomDirection({
    platform: document.documentElement.dataset.platform,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    deltaY: event.deltaY,
  });
  if (!direction) return;
  event.preventDefault();
  setFontScale(state.fontScale + direction * .08);
}

function fileIcon() {
  return '<svg viewBox="0 0 24 24"><path d="M6 3.5h8l4 4v13H6v-17Z"/><path d="M14 3.5v4h4M9 12h6M9 15h6"/></svg>';
}

function recentEntry(doc) {
  return { path: doc.path, name: doc.name, directory: null, exists: true };
}

function recentFilesFromPreferences(prefs) {
  return filesFromPreferencePaths(prefs.recentFiles, prefs.recentFileStatuses);
}

function favoriteFilesFromPreferences(prefs) {
  return filesFromPreferencePaths(prefs.favoriteFiles, prefs.favoriteFileStatuses);
}

function applyLibraryPreferences(prefs) {
  state.recentFiles = recentFilesFromPreferences(prefs);
  state.favoriteFiles = favoriteFilesFromPreferences(prefs);
  if (state.sidebarMode === 'recent') state.files = [...state.recentFiles];
  if (state.sidebarMode === 'favorites') state.files = [...state.favoriteFiles];
}

async function refreshLibraryFileStatuses() {
  try {
    applyLibraryPreferences(await window.leafMD.getPreferences());
    renderFileList();
  } catch (error) {
    console.warn('Unable to refresh library file statuses', error);
  }
}

function addRecentDocument(doc) {
  const existingIndex = state.recentFiles.findIndex(file => sameDocumentPath(file.path, doc.path));
  if (existingIndex >= 0) {
    state.recentFiles[existingIndex] = recentEntry(doc);
  } else {
    state.recentFiles = [recentEntry(doc), ...state.recentFiles].slice(0, 10);
  }
  if (state.sidebarMode === 'recent') state.files = [...state.recentFiles];
}

async function removeRecentRecord(filePath) {
  await window.leafMD.removeRecent(filePath);
  state.recentFiles = state.recentFiles.filter(file => !sameDocumentPath(file.path, filePath));
  if (state.sidebarMode === 'recent') state.files = [...state.recentFiles];
  renderFileList();
  showToast(t('recentRemoved'));
}

async function setFavoriteRecord(filePath, shouldFavorite) {
  if (shouldFavorite) await window.leafMD.addFavorite(filePath);
  else await window.leafMD.removeFavorite(filePath);
  applyLibraryPreferences(await window.leafMD.getPreferences());
  renderFileList();
  showToast(t(shouldFavorite ? 'favoriteAdded' : 'favoriteRemoved'));
}

function updateLibraryHeading() {
  if (state.sidebarMode === 'explorer') {
    els.libraryName.textContent = state.root ? state.root.split(/[\\/]/).pop() : t('resourceExplorer');
  } else {
    els.libraryName.textContent = t(state.sidebarMode === 'favorites' ? 'favoriteDocuments' : 'recentReading');
  }
}

function setSidebarMode(mode) {
  state.sidebarMode = normalizeSidebarMode(mode);
  localStorage.setItem('sidebarMode', state.sidebarMode);
  const explorer = state.sidebarMode === 'explorer';
  const favorites = state.sidebarMode === 'favorites';
  state.files = explorer ? [...state.explorerFiles] : favorites ? [...state.favoriteFiles] : [...state.recentFiles];
  els.recentTab.classList.toggle('active', state.sidebarMode === 'recent');
  els.favoritesTab.classList.toggle('active', favorites);
  els.explorerTab.classList.toggle('active', explorer);
  els.recentTab.setAttribute('aria-selected', String(state.sidebarMode === 'recent'));
  els.favoritesTab.setAttribute('aria-selected', String(favorites));
  els.explorerTab.setAttribute('aria-selected', String(explorer));
  els.refreshExplorer.classList.toggle('hidden', !explorer || !state.root);
  updateLibraryHeading();
  renderFileList();
}

function pathIsInsideRoot(filePath) {
  if (!state.root || !filePath) return false;
  const root = state.root.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
  const target = filePath.replace(/\\/g, '/').toLowerCase();
  return target === root || target.startsWith(`${root}/`);
}

async function refreshExplorer() {
  if (!state.root) {
    await openFolder();
    return;
  }
  try {
    const previousMode = state.sidebarMode;
    const folder = await window.leafMD.listFolder(state.root);
    state.explorerFiles = folder?.files || [];
    setSidebarMode(previousMode);
  } catch (error) {
    console.error(error);
    showToast(t('folderOpenFailed'));
  }
}

function restoreExplorerAfterFirstPaint(savedRoot) {
  if (!savedRoot) return;
  requestAnimationFrame(() => requestAnimationFrame(async () => {
    if (state.root !== savedRoot) return;
    try {
      const folder = await window.leafMD.listFolder(savedRoot);
      if (state.root !== savedRoot) return;
      state.root = folder?.root || savedRoot;
      state.explorerFiles = folder?.files || [];
      if (state.sidebarMode === 'explorer') setSidebarMode('explorer');
    } catch (error) {
      console.warn('Unable to restore resource explorer folder', error);
      if (state.root === savedRoot) {
        state.root = null;
        state.explorerFiles = [];
        setSidebarMode('recent');
      }
    }
  }));
}

function renderFileList() {
  closeRecentContextMenu();
  if (!state.files.length) {
    const emptyKey = state.sidebarMode === 'explorer' ? 'emptyExplorer' : state.sidebarMode === 'favorites' ? 'emptyFavorites' : 'emptyRecent';
    els.fileList.innerHTML = `<div class="empty-list">${t(emptyKey)}</div>`;
    return;
  }
  els.fileList.innerHTML = state.files.map(file => {
    const active = sameDocumentPath(state.currentFile?.path, file.path) ? ' active' : '';
    const missing = state.sidebarMode !== 'explorer' && file.exists === false;
    const favorited = state.favoriteFiles.some(favorite => sameDocumentPath(favorite.path, file.path));
    const sub = state.sidebarMode === 'explorer'
      ? (file.directory && file.directory !== '.' ? file.directory : t('markdownDocument'))
      : t(missing ? 'recentMissing' : state.sidebarMode === 'favorites' ? 'favorited' : 'recentOpened');
    const favoriteMarker = favorited
      ? `<span class="favorite-marker" title="${escapeHtml(t('favorited'))}" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg></span>`
      : '';
    const removeButton = state.sidebarMode === 'recent'
      ? `<button class="recent-remove" data-path="${encodeURIComponent(file.path)}" title="${t('removeRecentTitle')}" aria-label="${escapeHtml(t('removeRecentAria', { name: file.name }))}"><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4h6v3M8 10v8M12 10v8M16 10v8M7 7l1 14h8l1-14"/></svg></button>`
      : '';
    const itemAttributes = missing
      ? ` aria-disabled="true" data-missing="true" title="${escapeHtml(t('recentMissingTitle'))}" aria-label="${escapeHtml(t('recentMissingAria', { name: file.name }))}"`
      : ` title="${escapeHtml(t('recentContextHint'))}"`;
    return `<div class="file-row${missing ? ' missing' : ''}" data-path="${encodeURIComponent(file.path)}"><button class="file-item${active}" data-path="${encodeURIComponent(file.path)}"${itemAttributes}><span class="file-icon">${fileIcon()}</span><span class="file-copy"><span class="file-title-line">${favoriteMarker}<strong>${escapeHtml(file.name)}</strong></span><small>${escapeHtml(sub)}</small></span></button>${removeButton}</div>`;
  }).join('');
  els.fileList.querySelectorAll('.file-item').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.missing === 'true') return;
      loadFile(decodeURIComponent(button.dataset.path));
    });
  });
  els.fileList.querySelectorAll('.file-row').forEach(row => {
    row.addEventListener('contextmenu', event => {
      openRecentContextMenu(event, decodeURIComponent(row.dataset.path), row.classList.contains('missing'));
    });
  });
  els.fileList.querySelectorAll('.recent-remove').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      removeRecentRecord(decodeURIComponent(button.dataset.path));
    });
  });
}

function escapeHtml(value = '') {
  return value.replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

async function revealFileInFolder(filePath) {
  try {
    await window.leafMD.showInFolder(filePath);
  } catch (error) {
    console.warn('Unable to show file in folder', error);
    showToast(t('recentRevealFailed'));
  }
}

async function editRecentDocument(filePath) {
  if (!maybeDiscardChanges()) return;
  try {
    displayDocument(await window.leafMD.readFile(filePath));
    await toggleEditor(true);
  } catch (error) {
    showToast(t('openFailed'));
    console.error(error);
  }
}

function renderToc() {
  const headings = [...els.content.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  headings.forEach((heading, index) => heading.id = slugify(heading.textContent, index));
  els.toc.innerHTML = headings.map(heading => `<a href="#${heading.id}" data-target="${heading.id}" class="level-${heading.tagName.slice(1)}">${escapeHtml(heading.textContent)}</a>`).join('');
  els.tocPanel.classList.toggle('hidden', headings.length < 2);
  updatePaneResizerVisibility();
  els.toc.querySelectorAll('a').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const heading = document.getElementById(link.dataset.target);
    const reader = $('.reader-pane');
    if (!heading || !reader) return;
    const top = reader.scrollTop + heading.getBoundingClientRect().top - reader.getBoundingClientRect().top - 28;
    reader.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    els.toc.querySelectorAll('a').forEach(item => item.classList.toggle('active', item === link));
  }));
  updateActiveToc();
}

function updateActiveToc() {
  const headings = [...els.content.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  const reader = $('.reader-pane');
  const max = reader.scrollHeight - reader.clientHeight;
  let active = headings[0];
  for (const heading of headings) {
    if (heading.getBoundingClientRect().top <= reader.getBoundingClientRect().top + 42) active = heading;
  }
  if (max > 0 && reader.scrollTop >= max - 2) active = headings.at(-1);
  let activeLink = null;
  els.toc.querySelectorAll('a').forEach(a => {
    const isActive = active && a.dataset.target === active.id;
    a.classList.toggle('active', isActive);
    if (isActive) activeLink = a;
  });
  if (activeLink) {
    const linkRect = activeLink.getBoundingClientRect();
    const panelRect = els.tocPanel.getBoundingClientRect();
    if (linkRect.top < panelRect.top + 38) els.tocPanel.scrollTop -= panelRect.top + 38 - linkRect.top;
    else if (linkRect.bottom > panelRect.bottom - 34) els.tocPanel.scrollTop += linkRect.bottom - panelRect.bottom + 34;
  }
  const progress = max > 0 ? (reader.scrollTop / max) * 100 : 100;
  els.progressBar.style.width = `${progress}%`;
  els.backToTop.classList.toggle('visible', !state.editing && reader.scrollTop > Math.min(460, reader.clientHeight * .55));
}

function updateWindowTitle() {
  const name = state.currentFile?.name || t('appName');
  document.title = `${state.dirty ? '● ' : ''}${name} · ${t('appName')}`;
}

function setDirty(dirty) {
  state.dirty = Boolean(dirty);
  window.leafMD.setDirty(state.dirty);
  els.editorSaveState.textContent = t(state.dirty ? 'unsaved' : 'saved');
  els.editorSaveState.classList.toggle('dirty', state.dirty);
  updateWindowTitle();
}

function maybeDiscardChanges() {
  if (!state.dirty) return true;
  return window.confirm(t('discardConfirm'));
}

function renderMarkdownTo(container, doc, content) {
  if (isPlainTextFile(doc.path)) {
    container.innerHTML = `<div class="plain-text">${escapeHtml(content)}</div>`;
    return;
  }
  const prepared = prepareFootnotes(content);
  let html = marked.parse(prepared.markdown);
  html += renderFootnoteSection(prepared.notes, text => marked.parseInline(text), t('footnotes'));
  html = DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] });
  container.innerHTML = html;
  container.querySelectorAll('img').forEach(img => {
    const markdownSrc = img.dataset.markdownSrc || img.getAttribute('src') || '';
    delete img.dataset.markdownSrc;
    if (/^(https?:|data:)/i.test(markdownSrc)) return;
    img.removeAttribute('src');
    img.classList.add('local-image-loading');
    window.leafMD.readImageData(markdownSrc, doc.directory).then(dataUrl => {
      if (!img.isConnected) return;
      if (!dataUrl) throw new Error('Local image returned no data');
      img.src = dataUrl;
      img.classList.remove('local-image-loading', 'local-image-error');
    }).catch(error => {
      if (!img.isConnected) return;
      img.classList.remove('local-image-loading');
      img.classList.add('local-image-error');
      console.error(`Unable to preview local image: ${markdownSrc}`, error);
    });
  });
  bindDocumentActions(container);
  injectPreviewLineNumbers(container, prepared);
}

// 为渲染后的每个顶层块元素注入 data-line（该块在源文档中的起始行号，1-based）。
// 编辑模式下根据 CodeMirror 光标行号找到对应块，实现预览跟随光标滚动。
function injectPreviewLineNumbers(container, prepared) {
  const starts = scanMarkdownBlockStartLines(prepared.markdown);
  const children = [...container.children].filter(el => !el.classList?.contains('footnotes'));
  if (!children.length || starts.length === 0) return;
  // 保险：顶层元素数与扫描块数偏差过大说明无法可靠对齐，放弃注入而不是错位滚动
  if (Math.abs(children.length - starts.length) > 2) return;
  const lineMap = prepared.lineMap;
  children.forEach((el, index) => {
    const processedLine = starts[index];
    if (!processedLine) return;
    const sourceLine = lineMap ? lineMap[processedLine - 1] + 1 : processedLine;
    el.dataset.line = String(sourceLine);
  });
}

function renderEditorPreview(content = state.currentFile?.content || '') {
  if (!state.currentFile) return;
  try {
    renderMarkdownTo(els.editorPreview, state.currentFile, content);
    scrollPreviewToCursor(true);
  } catch (error) {
    els.editorPreview.innerHTML = `<p class="preview-error">${t('previewError')}</p>`;
    console.error(error);
  }
}

function renderCurrentDocument() {
  const doc = state.currentFile;
  if (!doc) return;
  try {
    renderMarkdownTo(els.content, doc, doc.content);
    els.breadcrumb.innerHTML = `<span>${escapeHtml(doc.directory)}</span><i>›</i><strong>${escapeHtml(doc.name)}</strong>`;
    const cjkCount = (doc.content.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).length;
    const latinWords = (doc.content.replace(/[\u3400-\u9fff\uf900-\ufaff]/g, ' ').match(/[\p{L}\p{N}]+/gu) || []).length;
    const words = cjkCount + latinWords;
    const minutes = Math.max(1, Math.ceil(words / 300));
    els.readingTime.textContent = t('readingTime', {
      minutes,
      words: words.toLocaleString(state.language === 'en' ? 'en-US' : 'zh-CN')
    });
    renderToc();
    renderFileList();
  } catch (error) {
    showToast(t('renderFailed'));
    console.error(error);
  }
}

function displayDocument(doc) {
  if (!doc?.path) return;
  state.currentFile = doc;
  state.savedContent = doc.content;
  addRecentDocument(doc);
  state.editing = false;
  replaceEditorContent(doc.content, true);
  renderEditorPreview(doc.content);
  els.editorFileName.textContent = doc.name;
  els.welcome.classList.add('hidden');
  els.editorView.classList.add('hidden');
  els.documentView.classList.remove('hidden');
  els.editButton.disabled = false;
  els.saveButton.disabled = false;
  els.editButton.classList.remove('active');
  els.editButtonLabel.textContent = t('edit');
  renderCurrentDocument();
  setDirty(false);
  $('.reader-pane').scrollTo({ top: 0 });
}

async function newFile() {
  if (!maybeDiscardChanges()) return;
  try {
    const doc = await window.leafMD.newFile();
    if (!doc?.path) return;
    displayDocument(doc);
    await toggleEditor(true);
    if (pathIsInsideRoot(doc.path)) await refreshExplorer();
  } catch (error) {
    console.error(error);
    showToast(t('newFileFailed'));
  }
}

async function loadFile(filePath) {
  if (!maybeDiscardChanges()) return;
  try {
    displayDocument(await window.leafMD.readFile(filePath));
  } catch (error) {
    showToast(t('openFailed'));
    console.error(error);
  }
}

async function refreshCurrentFileFromDisk() {
  if (!state.currentFile?.path || state.dirty || state.saving || externalRefreshInProgress) return;
  const requestedPath = state.currentFile.path;
  externalRefreshInProgress = true;
  try {
    const refreshed = await window.leafMD.readFile(requestedPath);
    if (!state.currentFile || !sameDocumentPath(state.currentFile.path, requestedPath) || state.dirty || state.saving) return;
    if (!refreshed?.path || refreshed.content === state.currentFile.content) return;

    const reader = $('.reader-pane');
    const scrollTop = reader.scrollTop;
    state.currentFile = refreshed;
    state.savedContent = refreshed.content;
    els.editorFileName.textContent = refreshed.name;
    renderEditorPreview(refreshed.content);
    if (state.editing) {
      replaceEditorContent(refreshed.content, true);
      updateEditorPosition();
    } else {
      renderCurrentDocument();
      reader.scrollTop = scrollTop;
      if (!els.searchBar.classList.contains('hidden')) performSearch();
    }
    setDirty(false);
  } catch (error) {
    console.warn('Unable to refresh the current document from disk:', error);
  } finally {
    externalRefreshInProgress = false;
  }
}

function updateEditorPosition() {
  if (!codeEditor) return;
  const cursor = codeEditor.state.selection.main.head;
  const line = codeEditor.state.doc.lineAt(cursor);
  els.editorPosition.textContent = t('editorPosition', { line: line.number, column: cursor - line.from + 1 });
}

// 根据编辑器光标行号，把左侧预览滚动到对应的块元素（编辑/预览滚动同步）。
// 只取“最后一个起始行 <= 光标行的块”，光标在同一行内移动时不重复滚动；
// force 用于预览重新渲染后强制校正一次。
function scrollPreviewToCursor(force = false) {
  if (!codeEditor || !state.editing) return;
  const scroller = $('.editor-preview-scroll');
  const preview = els.editorPreview;
  if (!scroller || !preview?.children.length) return;
  const cursorLine = codeEditor.state.doc.lineAt(codeEditor.state.selection.main.head).number;
  if (!force && cursorLine === scrollPreviewToCursor.lastLine) return;
  scrollPreviewToCursor.lastLine = cursorLine;
  let target = null;
  for (const el of preview.children) {
    const line = Number(el.dataset.line);
    if (Number.isFinite(line) && line <= cursorLine) target = el;
  }
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();
  const top = Math.max(0, scroller.scrollTop + rect.top - scrollerRect.top - 12);
  if (Math.abs(top - scroller.scrollTop) < 48) return;
  scroller.scrollTo({ top, behavior: 'smooth' });
}

async function toggleEditor(forceEditing) {
  if (!state.currentFile) return;
  const nextEditing = typeof forceEditing === 'boolean' ? forceEditing : !state.editing;
  if (nextEditing) {
    try {
      await initializeCodeEditor();
    } catch (error) {
      console.error('Unable to load the Markdown editor:', error);
      showToast(t('previewError'));
      return;
    }
    if (!state.currentFile) return;
  }
  state.editing = nextEditing;
  if (state.editing) {
    if (editorContent() !== state.currentFile.content) replaceEditorContent(state.currentFile.content, true);
    renderEditorPreview(state.currentFile.content);
    els.documentView.classList.add('hidden');
    els.editorView.classList.remove('hidden');
    els.tocPanel.classList.add('hidden');
    updatePaneResizerVisibility();
    els.backToTop.classList.remove('visible');
    els.editButton.classList.add('active');
    els.editButtonLabel.textContent = t('preview');
    focusCodeEditor();
    updateEditorPosition();
  } else {
    state.currentFile.content = editorContent();
    renderCurrentDocument();
    els.editorView.classList.add('hidden');
    els.documentView.classList.remove('hidden');
    els.editButton.classList.remove('active');
    els.editButtonLabel.textContent = t('edit');
    updatePaneResizerVisibility();
    $('.reader-pane').scrollTo({ top: 0 });
  }
}

async function saveDocument(saveAs = false, options = {}) {
  if (!state.currentFile || state.saving) return;
  const editingContent = state.editing ? editorContent() : state.currentFile.content;
  const originalPath = state.currentFile.path;
  state.saving = true;
  try {
    const saved = saveAs
      ? await window.leafMD.saveAs(originalPath, editingContent)
      : await window.leafMD.saveFile(originalPath, editingContent);
    if (!saved) return;
    const unchangedSinceSave = !state.editing || editorContent() === editingContent;
    if (saved.replacedPath) {
      state.recentFiles = state.recentFiles.filter(file => !sameDocumentPath(file.path, saved.replacedPath));
      state.explorerFiles = state.explorerFiles.filter(file => !sameDocumentPath(file.path, saved.replacedPath));
      state.favoriteFiles = state.favoriteFiles.map(file => sameDocumentPath(file.path, saved.replacedPath)
        ? { ...file, path: saved.path, name: saved.name, exists: true }
        : file);
      if (state.sidebarMode === 'explorer') state.files = [...state.explorerFiles];
      if (state.sidebarMode === 'favorites') state.files = [...state.favoriteFiles];
    }
    state.currentFile = saved;
    state.currentFile.content = unchangedSinceSave ? editingContent : editorContent();
    state.savedContent = editingContent;
    addRecentDocument(saved);
    renderEditorPreview(state.currentFile.content);
    els.editorFileName.textContent = saved.name;
    if (state.sidebarMode === 'recent') state.files = [...state.recentFiles];
    renderFileList();
    setDirty(!unchangedSinceSave);
    if (pathIsInsideRoot(saved.path)) await refreshExplorer();
    if (options.auto && unchangedSinceSave) {
      els.editorSaveState.textContent = t('autoSaved');
      clearTimeout(saveDocument.statusTimer);
      saveDocument.statusTimer = setTimeout(() => { if (!state.dirty) els.editorSaveState.textContent = t('saved'); }, 1800);
    } else if (!options.silent) {
      showToast(t(saveAs ? 'saveAsDone' : 'saveDone'));
    }
  } catch (error) {
    if (!options.auto) showToast(t('saveFailed'));
    console.error(error);
  } finally {
    state.saving = false;
  }
}

function bindDocumentActions(container = els.content) {
  container.querySelectorAll('.copy-code').forEach(button => button.addEventListener('click', async () => {
    const code = button.closest('.code-block').querySelector('code').textContent;
    await navigator.clipboard.writeText(code);
    button.textContent = t('copied');
    setTimeout(() => button.textContent = t('copy'), 1200);
  }));
  container.querySelectorAll('a').forEach(link => link.addEventListener('click', event => {
    const href = link.getAttribute('href') || '';
    if (/^https?:\/\//i.test(href)) {
      event.preventDefault();
      window.leafMD.openExternal(href);
    }
  }));
}

async function openFile() {
  if (!maybeDiscardChanges()) return;
  const doc = await window.leafMD.openFile();
  if (doc) {
    setSidebarMode('recent');
    displayDocument(doc);
  }
}

async function openFolder() {
  if (!maybeDiscardChanges()) return;
  const folder = await window.leafMD.openFolder();
  if (!folder) return;
  state.root = folder.root;
  state.explorerFiles = folder.files;
  setSidebarMode('explorer');
  if (folder.files[0]) {
    try {
      displayDocument(await window.leafMD.readFile(folder.files[0].path));
    } catch {
      showToast(t('folderOpenFailed'));
    }
  }
}

function openSearch() {
  if (!state.currentFile) return;
  if (state.editing) {
    els.searchBar.classList.add('hidden');
    clearSearchHighlights();
    openSearchPanel(codeEditor);
    return;
  }
  els.searchBar.classList.remove('hidden');
  els.searchInput.focus();
  els.searchInput.select();
}

function closeSearch() {
  els.searchBar.classList.add('hidden');
  clearSearchHighlights();
}

function clearSearchHighlights() {
  els.content.querySelectorAll('mark.search-hit').forEach(mark => mark.replaceWith(document.createTextNode(mark.textContent)));
  els.content.normalize();
  state.searchMatches = [];
  els.searchCount.textContent = '0 / 0';
}

function performSearch() {
  clearSearchHighlights();
  const term = els.searchInput.value.trim();
  if (!term) return;
  const walker = document.createTreeWalker(els.content, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement.closest('script, style, mark') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  const needle = term.toLocaleLowerCase();
  nodes.forEach(node => {
    const text = node.textContent;
    const lower = text.toLocaleLowerCase();
    let cursor = 0;
    let index = lower.indexOf(needle);
    if (index < 0) return;
    const fragment = document.createDocumentFragment();
    while (index >= 0) {
      fragment.append(text.slice(cursor, index));
      const mark = document.createElement('mark');
      mark.className = 'search-hit';
      mark.textContent = text.slice(index, index + term.length);
      fragment.append(mark);
      cursor = index + term.length;
      index = lower.indexOf(needle, cursor);
    }
    fragment.append(text.slice(cursor));
    node.replaceWith(fragment);
  });
  state.searchMatches = [...els.content.querySelectorAll('mark.search-hit')];
  state.searchIndex = 0;
  goToSearch(0);
}

function goToSearch(delta) {
  if (!state.searchMatches.length) {
    els.searchCount.textContent = '0 / 0';
    return;
  }
  state.searchMatches[state.searchIndex]?.classList.remove('current');
  state.searchIndex = (state.searchIndex + delta + state.searchMatches.length) % state.searchMatches.length;
  const target = state.searchMatches[state.searchIndex];
  target.classList.add('current');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  els.searchCount.textContent = `${state.searchIndex + 1} / ${state.searchMatches.length}`;
}

function toggleSidebar(collapsed) {
  els.sidebar.classList.toggle('collapsed', collapsed);
  els.expandSidebar.classList.toggle('hidden', !collapsed);
  updatePaneResizerVisibility();
}

const panelSizeLimits = {
  sidebar: { min: 210, max: 420, fallback: 258 },
  toc: { min: 170, max: 360, fallback: 205 }
};

function clampPanelWidth(value, limits) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return limits.fallback;
  return Math.min(limits.max, Math.max(limits.min, Math.round(parsed)));
}

function applyPaneWidths() {
  state.sidebarWidth = clampPanelWidth(state.sidebarWidth, panelSizeLimits.sidebar);
  state.tocWidth = clampPanelWidth(state.tocWidth, panelSizeLimits.toc);
  document.documentElement.style.setProperty('--sidebar-width', `${state.sidebarWidth}px`);
  document.documentElement.style.setProperty('--toc-width', `${state.tocWidth}px`);
  els.sidebarResizer?.setAttribute('aria-valuenow', String(state.sidebarWidth));
  els.tocResizer?.setAttribute('aria-valuenow', String(state.tocWidth));
}

function updatePaneResizerVisibility() {
  if (!els.sidebarResizer || !els.tocResizer) return;
  els.sidebarResizer.classList.toggle('hidden', els.sidebar.classList.contains('collapsed'));
  els.tocResizer.classList.toggle('hidden', state.editing || els.tocPanel.classList.contains('hidden'));
}

function persistPaneWidth(panelName) {
  const storageKey = panelName === 'sidebar' ? 'sidebarWidth' : 'tocWidth';
  localStorage.setItem(storageKey, String(state[storageKey]));
}

function maximumPaneWidth(panelName) {
  const limits = panelSizeLimits[panelName];
  const otherWidth = panelName === 'sidebar'
    ? (getComputedStyle(els.tocResizer).display === 'none' ? 0 : state.tocWidth + 7)
    : (getComputedStyle(els.sidebarResizer).display === 'none' ? 0 : state.sidebarWidth + 7);
  return Math.max(limits.min, Math.min(limits.max, els.appShell.clientWidth - otherWidth - 427));
}

function setPaneWidth(panelName, width, persist = false) {
  const limits = panelSizeLimits[panelName];
  const storageKey = panelName === 'sidebar' ? 'sidebarWidth' : 'tocWidth';
  state[storageKey] = Math.min(maximumPaneWidth(panelName), clampPanelWidth(width, limits));
  applyPaneWidths();
  if (persist) persistPaneWidth(panelName);
}

function initializePaneResizers() {
  applyPaneWidths();
  updatePaneResizerVisibility();
  const configure = (handle, panelName, direction) => {
    if (!handle) return;
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || handle.classList.contains('hidden')) return;
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = panelName === 'sidebar' ? state.sidebarWidth : state.tocWidth;
      handle.setPointerCapture?.(event.pointerId);
      handle.classList.add('active');
      document.body.classList.add('resizing-panes');
      const move = moveEvent => {
        const delta = direction === 1 ? moveEvent.clientX - startX : startX - moveEvent.clientX;
        setPaneWidth(panelName, startWidth + delta);
      };
      const finish = () => {
        handle.classList.remove('active');
        document.body.classList.remove('resizing-panes');
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', finish);
        handle.removeEventListener('pointercancel', finish);
        persistPaneWidth(panelName);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', finish);
      handle.addEventListener('pointercancel', finish);
    });
    handle.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const change = (event.key === 'ArrowRight' ? 10 : -10) * direction;
      const current = panelName === 'sidebar' ? state.sidebarWidth : state.tocWidth;
      setPaneWidth(panelName, current + change, true);
    });
  };
  configure(els.sidebarResizer, 'sidebar', 1);
  configure(els.tocResizer, 'toc', -1);
}

function openAbout() {
  els.aboutDialog.classList.remove('hidden');
  document.body.classList.add('dialog-open');
  requestAnimationFrame(() => $('#closeAbout').focus());
}

function closeAbout() {
  if (els.aboutDialog.classList.contains('hidden')) return;
  els.aboutDialog.classList.add('hidden');
  document.body.classList.remove('dialog-open');
  $('#moreButton').focus();
}

function openUpdateDialog(info) {
  state.updateInfo = info;
  $('#currentVersion').textContent = info.currentVersion || '2.4.1';
  $('#latestVersion').textContent = info.latestVersion || '';
  $('#updateReleaseName').textContent = info.releaseName || `v${info.latestVersion || ''}`;
  const notesElement = $('#releaseNotes');
  const releaseNotes = (info.releaseNotes || t('noReleaseNotes')).slice(0, 5000);
  notesElement.innerHTML = DOMPurify.sanitize(marked.parse(releaseNotes));
  notesElement.querySelectorAll('a').forEach(link => link.addEventListener('click', event => {
    const href = link.getAttribute('href') || '';
    if (!/^https?:\/\//i.test(href)) return;
    event.preventDefault();
    window.leafMD.openExternal(href);
  }));
  els.updateDialog.classList.remove('hidden');
  document.body.classList.add('dialog-open');
  const platform = document.documentElement.dataset.platform;
  $('#applyUpdate').classList.toggle('hidden', platform !== 'darwin' && platform !== 'windows');
  $('#updateProgress').classList.add('hidden');
  $('#applyUpdate').disabled = false;
  requestAnimationFrame(() => $('#openUpdatePage').focus());
}

function closeUpdate() {
  if (els.updateDialog.classList.contains('hidden')) return;
  els.updateDialog.classList.add('hidden');
  document.body.classList.remove('dialog-open');
  $('#moreButton').focus();
}

async function checkForUpdates(manual = false) {
  if (manual) showToast(t('checkingForUpdates'));
  try {
    const info = await window.leafMD.checkForUpdates(manual);
    if (info?.available) openUpdateDialog(info);
    else if (manual && info?.checked) showToast(t('alreadyLatest'));
  } catch (error) {
    console.warn('Update check failed:', error);
    if (manual) showToast(t('updateCheckFailed'));
  }
}

let automaticUpdateScheduled = false;

function scheduleAutomaticUpdateCheck() {
  if (automaticUpdateScheduled) return;
  automaticUpdateScheduled = true;
  setTimeout(() => checkForUpdates(false), 1200);
}

function openFirstRunLanguageDialog() {
  els.firstRunLanguageDialog.classList.remove('hidden');
  document.body.classList.add('dialog-open');
  requestAnimationFrame(() => els.firstRunLanguageDialog.querySelector('[data-first-run-language="zh-CN"]')?.focus());
}

async function completeFirstRunLanguage(language) {
  const buttons = els.firstRunLanguageDialog.querySelectorAll('[data-first-run-language]');
  buttons.forEach(button => { button.disabled = true; });
  try {
    await setLanguage(language, true, true);
    els.firstRunLanguageDialog.classList.add('hidden');
    document.body.classList.remove('dialog-open');
    showToast(t('languageChanged'));
    scheduleAutomaticUpdateCheck();
  } catch (error) {
    console.warn('Unable to save first-run language:', error);
    buttons.forEach(button => { button.disabled = false; });
    showToast(t('languageSaveFailed'));
  }
}

async function snoozeUpdates() {
  try {
    await window.leafMD.snoozeUpdates(30);
    closeUpdate();
    showToast(t('updateSnoozed'));
  } catch (error) {
    console.warn('Unable to save update reminder preference:', error);
  }
}

let applyingUpdate = false;

function setUpdateProgress(done, total) {
  const percent = total > 0 ? Math.min(100, Math.round((done * 100) / total)) : 0;
  $('#updateProgressBar').style.width = `${percent}%`;
  $('#updateProgressLabel').textContent = t('downloadingUpdate', { percent });
}

async function startDownloadAndUpdate() {
  if (applyingUpdate) return;
  if (state.dirty && state.currentFile?.path) {
    await saveDocument(false, { auto: true, silent: true });
  }
  if (state.dirty) {
    showToast(t('updateBlockedByUnsavedChanges'));
    return;
  }
  applyingUpdate = true;
  $('#applyUpdate').disabled = true;
  $('#openUpdatePage').disabled = true;
  $('#updateLater').disabled = true;
  $('#updateSnooze').disabled = true;
  $('#updateProgress').classList.remove('hidden');
  setUpdateProgress(0, 1);
  try {
    await window.leafMD.downloadAndApplyUpdate();
    $('#updateProgressLabel').textContent = t('preparingUpdate');
    $('#updateProgressBar').style.width = '100%';
    setTimeout(() => window.leafMD.closeWindow(), 500);
  } catch (error) {
    console.warn('In-app update failed:', error);
    applyingUpdate = false;
    $('#updateProgress').classList.add('hidden');
    $('#applyUpdate').disabled = false;
    $('#openUpdatePage').disabled = false;
    $('#updateLater').disabled = false;
    $('#updateSnooze').disabled = false;
    showToast(t('updateFailed'));
  }
}

async function initialize() {
  setAccentTheme(state.accentTheme);
  if (!initializeMacSystemColorMode()) setColorMode(state.colorMode);
  setFontScale(state.fontScale, true);
  setDocumentWidth(state.docWidth, true);
  scheduleMacWindowModeSync();
  const prefs = await window.leafMD.getPreferences();
  const needsLanguageSelection = await window.leafMD.needsLanguageSelection();
  setLanguage(prefs.language || state.language, true, !needsLanguageSelection);
  applyLibraryPreferences(prefs);
  const savedExplorerRoot = String(prefs.explorerRoot || '').trim();
  state.root = savedExplorerRoot || null;
  state.explorerFiles = [];
  setSidebarMode(state.sidebarMode === 'explorer' && !state.root ? 'recent' : state.sidebarMode);
  const initialFile = await window.leafMD.getInitialFile();
  if (initialFile?.path) {
    displayDocument(initialFile);
    if (await window.leafMD.getStartupMode() === 'edit') await toggleEditor(true);
  }
  restoreExplorerAfterFirstPaint(savedExplorerRoot);
  if (needsLanguageSelection) openFirstRunLanguageDialog();
  else scheduleAutomaticUpdateCheck();
}

$('#newFileButton').addEventListener('click', newFile);
['#openFileButton', '#welcomeOpenFile'].forEach(id => $(id).addEventListener('click', openFile));
['#openFolderButton', '#welcomeOpenFolder', '#folderCta'].forEach(id => $(id).addEventListener('click', openFolder));
$('#accentButton').addEventListener('click', event => {
  event.stopPropagation();
  toggleAccentMenu();
});
$('#colorModeButton').addEventListener('click', toggleColorMode);
els.accentMenu.addEventListener('click', event => {
  event.stopPropagation();
  const button = event.target.closest('[data-accent-option]');
  if (!button) return;
  setAccentTheme(button.dataset.accentOption);
  closeAccentMenu();
  $('#accentButton').focus();
});
els.backToTop.addEventListener('click', () => $('.reader-pane').scrollTo({ top: 0, behavior: 'smooth' }));
els.editButton.addEventListener('click', () => toggleEditor());
els.saveButton.addEventListener('click', () => saveDocument(false));
$('#saveAsButton').addEventListener('click', () => saveDocument(true));
els.recentTab.addEventListener('click', () => {
  setSidebarMode('recent');
  refreshLibraryFileStatuses();
});
els.favoritesTab.addEventListener('click', () => {
  setSidebarMode('favorites');
  refreshLibraryFileStatuses();
});
els.explorerTab.addEventListener('click', () => {
  if (!state.root || state.sidebarMode === 'explorer') openFolder();
  else setSidebarMode('explorer');
});
els.refreshExplorer.addEventListener('click', refreshExplorer);
$('#collapseSidebar').addEventListener('click', () => toggleSidebar(true));
$('#expandSidebar').addEventListener('click', () => toggleSidebar(false));
$('#searchButton').addEventListener('click', openSearch);
$('#closeSearch').addEventListener('click', closeSearch);
$('#searchPrev').addEventListener('click', () => goToSearch(-1));
$('#searchNext').addEventListener('click', () => goToSearch(1));
els.searchInput.addEventListener('input', performSearch);
els.searchInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') goToSearch(event.shiftKey ? -1 : 1);
  if (event.key === 'Escape') closeSearch();
});
$('#revealButton').addEventListener('click', () => state.currentFile && revealFileInFolder(state.currentFile.path));
$('#printButton').addEventListener('click', () => {
  if (state.editing) toggleEditor(false);
  window.leafMD.print();
});
$('#moreButton').addEventListener('click', event => {
  event.stopPropagation();
  closeAccentMenu();
  closeRecentContextMenu();
  els.codeLangMenu.classList.add('hidden');
  els.moreMenu.classList.toggle('hidden');
});
$('#windowMinimise').addEventListener('click', () => window.leafMD.minimiseWindow());
$('#windowMaximise').addEventListener('click', () => window.leafMD.toggleMaximiseWindow());
$('#windowClose').addEventListener('click', () => window.leafMD.closeWindow());
$('#windowMaximise').addEventListener('dblclick', event => event.stopPropagation());
$('.titlebar').addEventListener('dblclick', event => {
  if (!event.target.closest('button, input')) window.leafMD.toggleMaximiseWindow();
});
$('#closeAbout').addEventListener('click', closeAbout);
$('#aboutDone').addEventListener('click', closeAbout);
els.firstRunLanguageDialog.querySelectorAll('[data-first-run-language]').forEach(button => {
  button.addEventListener('click', () => completeFirstRunLanguage(button.dataset.firstRunLanguage));
});
els.aboutDialog.addEventListener('click', event => {
  if (event.target === els.aboutDialog) closeAbout();
});
els.aboutDialog.querySelectorAll('[data-external]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  window.leafMD.openExternal(link.dataset.external);
}));
$('#closeUpdate').addEventListener('click', closeUpdate);
$('#updateLater').addEventListener('click', closeUpdate);
$('#updateSnooze').addEventListener('click', snoozeUpdates);
$('#applyUpdate').addEventListener('click', startDownloadAndUpdate);
window.leafMD.onUpdateProgress(progress => {
  if (applyingUpdate) setUpdateProgress(Number(progress?.done) || 0, Number(progress?.total) || 0);
});
$('#openUpdatePage').addEventListener('click', () => {
  const releaseURL = state.updateInfo?.releaseUrl;
  if (releaseURL) window.leafMD.openExternal(releaseURL);
  closeUpdate();
});
els.updateDialog.addEventListener('click', event => {
  if (event.target === els.updateDialog) closeUpdate();
});
$('#closeTableDialog').addEventListener('click', closeTableDialog);
$('#cancelTable').addEventListener('click', closeTableDialog);
$('#confirmTable').addEventListener('click', insertTable);
els.tableDialog.addEventListener('click', event => {
  if (event.target === els.tableDialog) closeTableDialog();
});
$('#closeImageDialog').addEventListener('click', closeImageDialog);
$('#cancelImage').addEventListener('click', closeImageDialog);
$('#confirmImage').addEventListener('click', insertImageFromUrl);
$('#pickLocalImage').addEventListener('click', () => { closeImageDialog(); insertLocalImage(); });
els.imageDialog.addEventListener('click', event => {
  if (event.target === els.imageDialog) closeImageDialog();
});
els.imageUrl.addEventListener('keydown', event => {
  if (event.key === 'Enter') insertImageFromUrl();
});
$('#headingSelect').addEventListener('change', event => {
  formatSelectedLines('heading', event.target.value);
  event.target.value = '';
});
$('#moreFormatSelect').addEventListener('change', event => {
  if (event.target.value.startsWith('heading:')) formatSelectedLines('heading', event.target.value.slice(8));
  else if (event.target.value) runFormatCommand(event.target.value);
  event.target.value = '';
});
els.editorUndoButton.addEventListener('click', () => {
  if (codeEditor && state.editing) {
    undo(codeEditor);
    focusCodeEditor();
  }
});
els.exitEditButton.addEventListener('click', () => {
  if (state.editing) toggleEditor(false);
});
els.codeLangMenu.addEventListener('click', event => {
  event.stopPropagation();
  const button = event.target.closest('[data-code-lang]');
  if (!button) return;
  els.codeLangMenu.classList.add('hidden');
  if (insertCodeBlock(button.dataset.codeLang)) focusCodeEditor();
});
$('#editorFormatBar').addEventListener('click', event => {
  const button = event.target.closest('[data-format]');
  if (!button) return;
  if (button.dataset.format === 'code-block') event.stopPropagation();
  runFormatCommand(button.dataset.format);
});
els.moreMenu.addEventListener('click', event => {
  const button = event.target.closest('button');
  const action = button?.dataset.action;
  const language = button?.dataset.language;
  if (language) setLanguage(language);
  if (action === 'zoom-in') setFontScale(state.fontScale + .08);
  if (action === 'zoom-out') setFontScale(state.fontScale - .08);
  if (action === 'zoom-reset') setFontScale(1);
  if (button?.dataset.docWidth) setDocumentWidth(button.dataset.docWidth);
  if (action === 'default-app') {
    window.leafMD.openDefaultApps();
    showToast(t('defaultAppHint'));
  }
  if (action === 'print') {
    if (state.editing) toggleEditor(false);
    window.leafMD.print();
  }
  if (action === 'check-update') checkForUpdates(true);
  if (action === 'about') openAbout();
  els.moreMenu.classList.add('hidden');
});
els.recentContextMenu.addEventListener('click', async event => {
  event.stopPropagation();
  const button = event.target.closest('[data-recent-action]');
  const encodedPath = els.recentContextMenu.dataset.path;
  if (!button || button.disabled || !encodedPath) return;
  const action = button.dataset.recentAction;
  const filePath = decodeURIComponent(encodedPath);
  closeRecentContextMenu();
  if (action === 'edit') await editRecentDocument(filePath);
  else if (action === 'favorite') await setFavoriteRecord(filePath, button.dataset.favoriteState === 'add');
  else if (action === 'reveal') await revealFileInFolder(filePath);
  else if (action === 'remove') await removeRecentRecord(filePath);
});
document.addEventListener('click', () => {
  els.moreMenu.classList.add('hidden');
  els.codeLangMenu.classList.add('hidden');
  closeAccentMenu();
  closeRecentContextMenu();
});
els.fileList.addEventListener('scroll', closeRecentContextMenu, { passive: true });
window.addEventListener('resize', closeRecentContextMenu);
$('.reader-pane').addEventListener('scroll', updateActiveToc, { passive: true });
$('.reader-pane').addEventListener('wheel', handlePreviewWheelZoom, { passive: false });
$('.editor-preview-scroll').addEventListener('wheel', handlePreviewWheelZoom, { passive: false });

document.addEventListener('keydown', event => {
  const primaryModifier = event.ctrlKey || event.metaKey;
  if (primaryModifier && event.key.toLowerCase() === 'n') { event.preventDefault(); newFile(); }
  else if (primaryModifier && event.shiftKey && event.key.toLowerCase() === 'o') { event.preventDefault(); openFolder(); }
  else if (primaryModifier && event.shiftKey && event.key.toLowerCase() === 's') { event.preventDefault(); saveDocument(true); }
  else if (primaryModifier && event.key.toLowerCase() === 's') { event.preventDefault(); saveDocument(false); }
  else if (primaryModifier && event.key.toLowerCase() === 'e') { event.preventDefault(); toggleEditor(); }
  else if (primaryModifier && event.key.toLowerCase() === 'o') { event.preventDefault(); openFile(); }
  else if (primaryModifier && event.key.toLowerCase() === 'f') { event.preventDefault(); openSearch(); }
  else if (primaryModifier && event.key.toLowerCase() === 'p') { event.preventDefault(); window.leafMD.print(); }
  else if (primaryModifier && (event.key === '+' || event.key === '=')) { event.preventDefault(); setFontScale(state.fontScale + .08); }
  else if (primaryModifier && event.key === '-') { event.preventDefault(); setFontScale(state.fontScale - .08); }
  else if (primaryModifier && event.key === '0') { event.preventDefault(); setFontScale(1); }
  else if (event.key === 'Escape' && !els.recentContextMenu.classList.contains('hidden')) closeRecentContextMenu();
  else if (event.key === 'Escape' && !els.codeLangMenu.classList.contains('hidden')) { els.codeLangMenu.classList.add('hidden'); focusCodeEditor(); }
  else if (event.key === 'Escape' && !els.accentMenu.classList.contains('hidden')) { closeAccentMenu(); $('#accentButton').focus(); }
  else if (event.key === 'Escape' && !els.tableDialog.classList.contains('hidden')) closeTableDialog();
  else if (event.key === 'Escape' && !els.imageDialog.classList.contains('hidden')) closeImageDialog();
  else if (event.key === 'Escape' && !els.updateDialog.classList.contains('hidden')) closeUpdate();
  else if (event.key === 'Escape' && !els.aboutDialog.classList.contains('hidden')) closeAbout();
  else if (event.key === 'Escape' && !els.searchBar.classList.contains('hidden')) closeSearch();
});

let dragDepth = 0;
document.addEventListener('dragenter', event => { event.preventDefault(); dragDepth++; els.dropOverlay.classList.remove('hidden'); });
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragleave', event => { event.preventDefault(); dragDepth--; if (dragDepth <= 0) { dragDepth = 0; els.dropOverlay.classList.add('hidden'); } });
document.addEventListener('drop', async event => {
  event.preventDefault();
  dragDepth = 0;
  els.dropOverlay.classList.add('hidden');
  const file = event.dataTransfer.files[0];
  if (!file) return;
  const filePath = window.leafMD.pathForFile(file);
  if (!filePath) return;
  if (/\.(md|markdown|mdown|mkd|txt)$/i.test(filePath)) loadFile(filePath);
  else showToast(t('dropUnsupported'));
});

window.leafMD.onFileDrop(paths => {
  dragDepth = 0;
  els.dropOverlay.classList.add('hidden');
  const filePath = paths[0];
  if (!filePath) return;
  if (/\.(md|markdown|mdown|mkd|txt)$/i.test(filePath)) loadFile(filePath);
  else showToast(t('dropUnsupported'));
});

initializeFormatToolbarOverflow();
initializePaneResizers();
window.addEventListener('resize', scheduleMacWindowModeSync);
window.addEventListener('focus', () => {
  scheduleMacWindowModeSync();
  refreshCurrentFileFromDisk();
});
initialize();
setInterval(() => {
  if (state.editing && state.dirty && state.currentFile?.path && !state.saving) saveDocument(false, { auto: true, silent: true });
}, 10000);
window.leafMD.onOpenFile(doc => {
  setSidebarMode('recent');
  displayDocument(doc);
});
