import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { tags } from '@lezer/highlight';

const $ = selector => document.querySelector(selector);
let codeEditor;
let suppressEditorChanges = false;
const state = {
  currentFile: null,
  root: null,
  files: [],
  recentFiles: [],
  dark: localStorage.getItem('theme') === 'dark',
  fontScale: Number(localStorage.getItem('fontScale') || 1),
  language: localStorage.getItem('language') === 'en' ? 'en' : 'zh-CN',
  searchMatches: [],
  searchIndex: 0,
  editing: false,
  dirty: false,
  updateInfo: null
};

const translations = {
  'zh-CN': {
    appName: 'MD阅读助手', openFileTitle: '打开文件 (Ctrl+O)', openDocument: '打开文档', openFolderTitle: '打开文件夹 (Ctrl+Shift+O)',
    toggleEditorTitle: '切换编辑/预览 (Ctrl+E)', edit: '编辑', preview: '预览', saveTitle: '保存 (Ctrl+S)', searchTitle: '在文档中查找 (Ctrl+F)',
    themeTitle: '切换明暗主题', moreTitle: '更多选项', searchPlaceholder: '在文档中查找…', previous: '上一个', next: '下一个', close: '关闭',
    library: '文档库', recentReading: '最近阅读', collapseSidebar: '收起侧栏', expandSidebar: '展开侧栏', openDocumentFolder: '打开文档文件夹',
    browseMarkdown: '集中浏览你的 Markdown', welcomeTitle: '阅读与编辑，都更简单',
    welcomeDescription: '一个专注、舒适的 Markdown 阅读与编辑空间。<br>打开文档，沉浸在文字本身。', openMarkdown: '打开 Markdown 文档',
    openFolder: '打开文件夹', quickOpenHint: '快速打开，也可以将文件拖到这里', revealFile: '定位文件', revealFileTitle: '在资源管理器中显示',
    print: '打印', printTitle: '打印文档', readingEnd: '阅读结束', livePreview: '实时预览', readingEffect: '阅读效果', markdownEditorLabel: 'MARKDOWN 编辑器',
    untitledDocument: '未命名文档', saved: '已保存', unsaved: '尚未保存', saveAs: '另存为', markdownEditorAria: 'Markdown 编辑器',
    editorShortcut: '<kbd>Ctrl</kbd> + <kbd>S</kbd> 保存　 <kbd>Ctrl</kbd> + <kbd>E</kbd> 预览', backToTop: '回到顶部', backToTopAria: '回到文档顶部',
    toc: '本页目录', releaseToOpen: '松开以打开文档', interfaceLanguage: '界面语言', defaultApp: '设为默认 MD 应用', windowsSettings: 'Windows 设置',
    zoomIn: '放大文字', zoomOut: '缩小文字', zoomReset: '恢复字号', printDocument: '打印文档', copy: '复制', copied: '已复制',
    bodyFontScale: '正文字号 {percent}%', recentOpened: '最近打开', recentRemoved: '已从最近阅读中移除，原文件未删除', emptyRecent: '还没有最近文档',
    markdownDocument: 'Markdown 文档', removeRecentTitle: '删除最近阅读记录', removeRecentAria: '删除 {name} 的最近阅读记录',
    discardConfirm: '当前文档有尚未保存的更改。\n\n确定要放弃更改并继续吗？', previewError: '暂时无法渲染当前内容',
    readingTime: '约 {minutes} 分钟 · {words} 字', renderFailed: 'Markdown 渲染失败', openFailed: '无法打开这个文件',
    editorPosition: '第 {line} 行，第 {column} 列', saveAsDone: '文档已另存为', saveDone: '文档已保存', saveFailed: '保存失败，请检查文件权限',
    folderOpenFailed: '无法打开文件夹中的文档', defaultAppHint: '请在“按文件类型指定默认应用”中选择 .md', dropUnsupported: '请拖入 Markdown 或文本文件',
    languageChanged: '界面语言已切换为简体中文', about: '关于', aboutProductLabel: 'MARKDOWN 阅读与编辑器',
    aboutVersion: '版本 2.2.1', aboutDescription: '一款专注、美观、跨平台的 Markdown 阅读与编辑工具，支持实时预览、语法高亮、目录导航和最近阅读。',
    authorEmail: '作者邮箱', openSourceAddress: '开源地址', aboutLicense: '基于 MIT 许可证开源', done: '完成',
    checkForUpdates: '检查更新', checkingForUpdates: '正在检查更新…', updateAvailableLabel: '软件更新', updateAvailable: '发现新版本',
    currentVersion: '当前版本', latestVersion: '最新版本', releaseNotes: '更新说明', noReleaseNotes: '此版本暂无更新说明。',
    remindLater: '稍后提醒', openDownloadPage: '打开下载页面', alreadyLatest: '当前已是最新版本', updateCheckFailed: '检查更新失败，请稍后重试'
  },
  en: {
    appName: 'MD Reader Assistant', openFileTitle: 'Open file (Ctrl+O)', openDocument: 'Open Document', openFolderTitle: 'Open folder (Ctrl+Shift+O)',
    toggleEditorTitle: 'Toggle editor/preview (Ctrl+E)', edit: 'Edit', preview: 'Preview', saveTitle: 'Save (Ctrl+S)', searchTitle: 'Find in document (Ctrl+F)',
    themeTitle: 'Toggle light/dark theme', moreTitle: 'More options', searchPlaceholder: 'Find in document…', previous: 'Previous', next: 'Next', close: 'Close',
    library: 'LIBRARY', recentReading: 'Recent', collapseSidebar: 'Collapse sidebar', expandSidebar: 'Expand sidebar', openDocumentFolder: 'Open Document Folder',
    browseMarkdown: 'Browse your Markdown collection', welcomeTitle: 'Reading and editing, made simpler',
    welcomeDescription: 'A calm, focused space for reading and editing Markdown.<br>Open a document and stay with the words.', openMarkdown: 'Open Markdown Document',
    openFolder: 'Open Folder', quickOpenHint: 'Quick open, or drop a file here', revealFile: 'Show File', revealFileTitle: 'Show in File Explorer',
    print: 'Print', printTitle: 'Print document', readingEnd: 'End of document', livePreview: 'LIVE PREVIEW', readingEffect: 'Rendered document', markdownEditorLabel: 'MARKDOWN EDITOR',
    untitledDocument: 'Untitled document', saved: 'Saved', unsaved: 'Unsaved', saveAs: 'Save As', markdownEditorAria: 'Markdown editor',
    editorShortcut: '<kbd>Ctrl</kbd> + <kbd>S</kbd> Save　 <kbd>Ctrl</kbd> + <kbd>E</kbd> Preview', backToTop: 'Back to top', backToTopAria: 'Back to document top',
    toc: 'ON THIS PAGE', releaseToOpen: 'Release to open document', interfaceLanguage: 'Interface language', defaultApp: 'Set as default MD app', windowsSettings: 'Windows Settings',
    zoomIn: 'Increase text size', zoomOut: 'Decrease text size', zoomReset: 'Reset text size', printDocument: 'Print document', copy: 'Copy', copied: 'Copied',
    bodyFontScale: 'Reading text {percent}%', recentOpened: 'Recently opened', recentRemoved: 'Removed from Recent. The original file was not deleted.', emptyRecent: 'No recent documents',
    markdownDocument: 'Markdown document', removeRecentTitle: 'Remove recent record', removeRecentAria: 'Remove {name} from Recent',
    discardConfirm: 'This document has unsaved changes.\n\nDiscard the changes and continue?', previewError: 'The current content cannot be rendered',
    readingTime: 'About {minutes} min · {words} words', renderFailed: 'Markdown rendering failed', openFailed: 'Unable to open this file',
    editorPosition: 'Line {line}, Column {column}', saveAsDone: 'Document saved as a new file', saveDone: 'Document saved', saveFailed: 'Save failed. Check file permissions.',
    folderOpenFailed: 'Unable to open a document from this folder', defaultAppHint: 'Choose this app for .md under “Choose defaults by file type”.', dropUnsupported: 'Drop a Markdown or text file',
    languageChanged: 'Interface language changed to English', about: 'About', aboutProductLabel: 'MARKDOWN READER & EDITOR',
    aboutVersion: 'Version 2.2.1', aboutDescription: 'A focused, beautiful, cross-platform Markdown reader and editor with live preview, syntax highlighting, document navigation, and recent reading.',
    authorEmail: 'Author email', openSourceAddress: 'Open-source repository', aboutLicense: 'Open source under the MIT License', done: 'Done',
    checkForUpdates: 'Check for updates', checkingForUpdates: 'Checking for updates…', updateAvailableLabel: 'SOFTWARE UPDATE', updateAvailable: 'A new version is available',
    currentVersion: 'Current version', latestVersion: 'Latest version', releaseNotes: 'What’s new', noReleaseNotes: 'No release notes are available for this version.',
    remindLater: 'Remind me later', openDownloadPage: 'Open download page', alreadyLatest: 'You’re using the latest version', updateCheckFailed: 'Unable to check for updates. Try again later.'
  }
};

function t(key, values = {}) {
  const template = translations[state.language]?.[key] ?? translations['zh-CN'][key] ?? key;
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), template);
}

function applyStaticTranslations() {
  document.documentElement.lang = state.language === 'en' ? 'en' : 'zh-CN';
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(element => { element.innerHTML = t(element.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-title]').forEach(element => { element.title = t(element.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => { element.placeholder = t(element.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(element => { element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel)); });
  document.querySelectorAll('[data-language]').forEach(button => button.classList.toggle('active', button.dataset.language === state.language));
}

function setLanguage(language, silent = false) {
  state.language = language === 'en' ? 'en' : 'zh-CN';
  localStorage.setItem('language', state.language);
  applyStaticTranslations();
  window.leafMD.setLanguage(state.language);
  els.editButtonLabel.textContent = t(state.editing ? 'preview' : 'edit');
  if (!state.currentFile) els.editorFileName.textContent = t('untitledDocument');
  if (!state.root) els.libraryName.textContent = t('recentReading');
  if (codeEditor) updateEditorPosition();
  if (state.currentFile) {
    if (state.editing) renderEditorPreview(editorContent());
    else renderCurrentDocument();
  } else {
    renderFileList();
  }
  setDirty(state.dirty);
  if (!silent) showToast(t('languageChanged'));
}

const els = {
  welcome: $('#welcome'), documentView: $('#documentView'), content: $('#markdownContent'),
  fileList: $('#fileList'), libraryName: $('#libraryName'), tocPanel: $('#tocPanel'), toc: $('#toc'),
  breadcrumb: $('#breadcrumb'), readingTime: $('#readingTime'), progressBar: $('#progressBar'),
  sidebar: $('#sidebar'), expandSidebar: $('#expandSidebar'), searchBar: $('#searchBar'),
  searchInput: $('#searchInput'), searchCount: $('#searchCount'), dropOverlay: $('#dropOverlay'),
  moreMenu: $('#moreMenu'), toast: $('#toast'), editorView: $('#editorView'),
  editor: $('#markdownEditor'), editorPreview: $('#editorPreviewContent'), editorFileName: $('#editorFileName'), editorSaveState: $('#editorSaveState'),
  editorPosition: $('#editorPosition'), editButton: $('#editButton'), editButtonLabel: $('#editButtonLabel'),
  saveButton: $('#saveButton'), backToTop: $('#backToTop'), aboutDialog: $('#aboutDialog'), updateDialog: $('#updateDialog')
};

marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const safeTitle = title ? ` title="${title}"` : '';
      return `<a href="${href}"${safeTitle} target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
    code({ text, lang }) {
      const valid = lang && hljs.getLanguage(lang);
      const highlighted = valid ? hljs.highlight(text, { language: lang }).value : hljs.highlightAuto(text).value;
      const label = lang || 'code';
      return `<div class="code-block"><div class="code-header"><span>${label}</span><button class="copy-code" type="button">${t('copy')}</button></div><pre><code class="hljs${valid ? ` language-${lang}` : ''}">${highlighted}</code></pre></div>`;
    }
  }
});

const markdownHighlightStyle = HighlightStyle.define([
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

function editorContent() {
  return codeEditor?.state.doc.toString() || '';
}

function replaceEditorContent(content, moveToStart = false) {
  if (!codeEditor) return;
  suppressEditorChanges = true;
  codeEditor.dispatch({
    changes: { from: 0, to: codeEditor.state.doc.length, insert: content },
    selection: moveToStart ? { anchor: 0 } : undefined,
    scrollIntoView: moveToStart
  });
  suppressEditorChanges = false;
}

function focusCodeEditor() {
  requestAnimationFrame(() => {
    codeEditor.requestMeasure();
    requestAnimationFrame(() => codeEditor.focus());
  });
}

function initializeCodeEditor() {
  const saveKeymap = keymap.of([
    { key: 'Ctrl-s', run: () => { saveDocument(false); return true; } },
    { key: 'Ctrl-Shift-s', run: () => { saveDocument(true); return true; } },
    { key: 'Ctrl-e', run: () => { toggleEditor(false); return true; } }
  ]);
  const editorTheme = EditorView.theme({
    '&': { height: '100%', backgroundColor: 'transparent', color: 'var(--text)' },
    '.cm-scroller': { overflow: 'auto', fontFamily: '"Cascadia Code", "Microsoft YaHei UI", Consolas, monospace' },
    '.cm-content': { padding: '24px 32px 60px', caretColor: 'var(--green-deep)', lineHeight: '1.75' },
    '.cm-line': { padding: '0 4px' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--green-deep)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'color-mix(in srgb, var(--green) 28%, transparent)' },
    '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--green-soft) 34%, transparent)' },
    '.cm-gutters': { backgroundColor: 'var(--paper)', color: 'var(--faint)', borderRight: '1px solid var(--line)', minWidth: '48px' },
    '.cm-activeLineGutter': { backgroundColor: 'var(--green-soft)', color: 'var(--green-deep)' },
    '.cm-foldPlaceholder': { backgroundColor: 'var(--green-soft)', border: '1px solid var(--line)', color: 'var(--green-deep)' },
    '.cm-panels': { backgroundColor: 'var(--panel)', color: 'var(--text)' },
    '.cm-searchMatch': { backgroundColor: '#eadc7a66', outline: '1px solid #c7ad42' },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: '#e2a64d88' }
  });
  codeEditor = new EditorView({
    state: EditorState.create({
      doc: '',
      extensions: [
        basicSetup,
        markdown(),
        syntaxHighlighting(markdownHighlightStyle),
        editorTheme,
        saveKeymap,
        EditorView.lineWrapping,
        EditorView.updateListener.of(update => {
          if (update.docChanged && !suppressEditorChanges && state.currentFile) {
            state.currentFile.content = update.state.doc.toString();
            if (!state.dirty) setDirty(true);
            clearTimeout(renderEditorPreview.timer);
            renderEditorPreview.timer = setTimeout(() => renderEditorPreview(state.currentFile.content), 90);
          }
          if (update.docChanged || update.selectionSet) updateEditorPosition();
        })
      ]
    }),
    parent: els.editor
  });
  els.editor.addEventListener('pointerdown', () => {
    if (state.editing && !codeEditor.hasFocus) codeEditor.focus();
  }, true);
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

function setTheme(dark) {
  state.dark = dark;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  window.leafMD.setTheme(dark);
}

function setFontScale(scale, silent = false) {
  state.fontScale = Math.max(.82, Math.min(1.35, scale));
  document.documentElement.style.setProperty('--font-scale', state.fontScale);
  localStorage.setItem('fontScale', state.fontScale);
  if (!silent) showToast(t('bodyFontScale', { percent: Math.round(state.fontScale * 100) }));
}

function fileIcon() {
  return '<svg viewBox="0 0 24 24"><path d="M6 3.5h8l4 4v13H6v-17Z"/><path d="M14 3.5v4h4M9 12h6M9 15h6"/></svg>';
}

function recentEntry(doc) {
  return { path: doc.path, name: doc.name, directory: null };
}

function addRecentDocument(doc) {
  state.recentFiles = [recentEntry(doc), ...state.recentFiles.filter(file => file.path !== doc.path)].slice(0, 10);
  if (!state.root) state.files = [...state.recentFiles];
}

async function removeRecentRecord(filePath) {
  await window.leafMD.removeRecent(filePath);
  state.recentFiles = state.recentFiles.filter(file => file.path !== filePath);
  if (!state.root) state.files = [...state.recentFiles];
  renderFileList();
  showToast(t('recentRemoved'));
}

function renderFileList() {
  if (!state.files.length) {
    els.fileList.innerHTML = `<div class="empty-list">${t('emptyRecent')}</div>`;
    return;
  }
  els.fileList.innerHTML = state.files.map(file => {
    const active = state.currentFile?.path === file.path ? ' active' : '';
    const sub = state.root
      ? (file.directory && file.directory !== '.' ? file.directory : t('markdownDocument'))
      : t('recentOpened');
    const removeButton = !state.root
      ? `<button class="recent-remove" data-path="${encodeURIComponent(file.path)}" title="${t('removeRecentTitle')}" aria-label="${escapeHtml(t('removeRecentAria', { name: file.name }))}"><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4h6v3M8 10v8M12 10v8M16 10v8M7 7l1 14h8l1-14"/></svg></button>`
      : '';
    return `<div class="file-row"><button class="file-item${active}" data-path="${encodeURIComponent(file.path)}"><span class="file-icon">${fileIcon()}</span><span class="file-copy"><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(sub)}</small></span></button>${removeButton}</div>`;
  }).join('');
  els.fileList.querySelectorAll('.file-item').forEach(button => {
    button.addEventListener('click', () => loadFile(decodeURIComponent(button.dataset.path)));
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

function renderToc() {
  const headings = [...els.content.querySelectorAll('h1, h2, h3, h4')];
  headings.forEach((heading, index) => heading.id = slugify(heading.textContent, index));
  els.toc.innerHTML = headings.map(heading => `<a href="#${heading.id}" data-target="${heading.id}" class="level-${heading.tagName.slice(1)}">${escapeHtml(heading.textContent)}</a>`).join('');
  els.tocPanel.classList.toggle('hidden', headings.length < 2);
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
  const headings = [...els.content.querySelectorAll('h1, h2, h3, h4')];
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
  let html = marked.parse(content);
  html = DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] });
  container.innerHTML = html;
  container.querySelectorAll('img').forEach(img => {
    if (img.getAttribute('src') && !/^(https?:|data:|file:)/i.test(img.getAttribute('src'))) {
      const normalized = `${doc.directory.replace(/\\/g, '/')}/${img.getAttribute('src')}`;
      img.src = `file:///${normalized}`;
    }
  });
  bindDocumentActions(container);
}

function renderEditorPreview(content = state.currentFile?.content || '') {
  if (!state.currentFile) return;
  try {
    renderMarkdownTo(els.editorPreview, state.currentFile, content);
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

async function loadFile(filePath) {
  if (!maybeDiscardChanges()) return;
  try {
    displayDocument(await window.leafMD.readFile(filePath));
  } catch (error) {
    showToast(t('openFailed'));
    console.error(error);
  }
}

function updateEditorPosition() {
  if (!codeEditor) return;
  const cursor = codeEditor.state.selection.main.head;
  const line = codeEditor.state.doc.lineAt(cursor);
  els.editorPosition.textContent = t('editorPosition', { line: line.number, column: cursor - line.from + 1 });
}

function toggleEditor(forceEditing) {
  if (!state.currentFile) return;
  state.editing = typeof forceEditing === 'boolean' ? forceEditing : !state.editing;
  if (state.editing) {
    replaceEditorContent(state.currentFile.content, true);
    renderEditorPreview(state.currentFile.content);
    els.documentView.classList.add('hidden');
    els.editorView.classList.remove('hidden');
    els.tocPanel.classList.add('hidden');
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
    $('.reader-pane').scrollTo({ top: 0 });
  }
}

async function saveDocument(saveAs = false) {
  if (!state.currentFile) return;
  if (state.editing) state.currentFile.content = editorContent();
  try {
    const saved = saveAs
      ? await window.leafMD.saveAs(state.currentFile.path, state.currentFile.content)
      : await window.leafMD.saveFile(state.currentFile.path, state.currentFile.content);
    if (!saved) return;
    state.currentFile = saved;
    addRecentDocument(saved);
    replaceEditorContent(saved.content);
    renderEditorPreview(saved.content);
    els.editorFileName.textContent = saved.name;
    if (!state.files.some(file => file.path === saved.path)) {
      state.files.unshift({ path: saved.path, name: saved.name, directory: null });
    }
    renderFileList();
    setDirty(false);
    showToast(t(saveAs ? 'saveAsDone' : 'saveDone'));
  } catch (error) {
    showToast(t('saveFailed'));
    console.error(error);
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
    state.root = null;
    els.libraryName.textContent = t('recentReading');
    displayDocument(doc);
  }
}

async function openFolder() {
  if (!maybeDiscardChanges()) return;
  const folder = await window.leafMD.openFolder();
  if (!folder) return;
  state.root = folder.root;
  state.files = folder.files;
  els.libraryName.textContent = folder.name;
  renderFileList();
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
  if (state.editing) toggleEditor(false);
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
      return node.parentElement.closest('code, script, style, mark') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
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
  $('#currentVersion').textContent = info.currentVersion || '2.2.1';
  $('#latestVersion').textContent = info.latestVersion || '';
  $('#updateReleaseName').textContent = info.releaseName || `v${info.latestVersion || ''}`;
  $('#releaseNotes').textContent = (info.releaseNotes || t('noReleaseNotes')).slice(0, 5000);
  els.updateDialog.classList.remove('hidden');
  document.body.classList.add('dialog-open');
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

async function initialize() {
  setTheme(state.dark);
  setFontScale(state.fontScale, true);
  const prefs = await window.leafMD.getPreferences();
  setLanguage(prefs.language || state.language, true);
  state.recentFiles = (prefs.recentFiles || []).map(filePath => ({
    path: filePath,
    name: filePath.split(/[\\/]/).pop(),
    directory: null
  }));
  state.files = [...state.recentFiles];
  renderFileList();
  const initialFile = await window.leafMD.getInitialFile();
  if (initialFile?.path) {
    displayDocument(initialFile);
    if (await window.leafMD.getStartupMode() === 'edit') toggleEditor(true);
  }
  setTimeout(() => checkForUpdates(false), 1200);
}

['#openFileButton', '#welcomeOpenFile'].forEach(id => $(id).addEventListener('click', openFile));
['#openFolderButton', '#welcomeOpenFolder', '#folderCta'].forEach(id => $(id).addEventListener('click', openFolder));
$('#themeButton').addEventListener('click', () => setTheme(!state.dark));
els.backToTop.addEventListener('click', () => $('.reader-pane').scrollTo({ top: 0, behavior: 'smooth' }));
els.editButton.addEventListener('click', () => toggleEditor());
els.saveButton.addEventListener('click', () => saveDocument(false));
$('#saveAsButton').addEventListener('click', () => saveDocument(true));
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
$('#revealButton').addEventListener('click', () => state.currentFile && window.leafMD.showInFolder(state.currentFile.path));
$('#printButton').addEventListener('click', () => {
  if (state.editing) toggleEditor(false);
  window.leafMD.print();
});
$('#moreButton').addEventListener('click', event => {
  event.stopPropagation();
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
els.aboutDialog.addEventListener('click', event => {
  if (event.target === els.aboutDialog) closeAbout();
});
els.aboutDialog.querySelectorAll('[data-external]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  window.leafMD.openExternal(link.dataset.external);
}));
$('#closeUpdate').addEventListener('click', closeUpdate);
$('#updateLater').addEventListener('click', closeUpdate);
$('#openUpdatePage').addEventListener('click', () => {
  const releaseURL = state.updateInfo?.releaseUrl;
  if (releaseURL) window.leafMD.openExternal(releaseURL);
  closeUpdate();
});
els.updateDialog.addEventListener('click', event => {
  if (event.target === els.updateDialog) closeUpdate();
});
els.moreMenu.addEventListener('click', event => {
  const button = event.target.closest('button');
  const action = button?.dataset.action;
  const language = button?.dataset.language;
  if (language) setLanguage(language);
  if (action === 'zoom-in') setFontScale(state.fontScale + .08);
  if (action === 'zoom-out') setFontScale(state.fontScale - .08);
  if (action === 'zoom-reset') setFontScale(1);
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
document.addEventListener('click', () => els.moreMenu.classList.add('hidden'));
$('.reader-pane').addEventListener('scroll', updateActiveToc, { passive: true });

document.addEventListener('keydown', event => {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'o') { event.preventDefault(); openFolder(); }
  else if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 's') { event.preventDefault(); saveDocument(true); }
  else if (event.ctrlKey && event.key.toLowerCase() === 's') { event.preventDefault(); saveDocument(false); }
  else if (event.ctrlKey && event.key.toLowerCase() === 'e') { event.preventDefault(); toggleEditor(); }
  else if (event.ctrlKey && event.key.toLowerCase() === 'o') { event.preventDefault(); openFile(); }
  else if (event.ctrlKey && event.key.toLowerCase() === 'f') { event.preventDefault(); openSearch(); }
  else if (event.ctrlKey && event.key.toLowerCase() === 'p') { event.preventDefault(); window.leafMD.print(); }
  else if (event.ctrlKey && (event.key === '+' || event.key === '=')) { event.preventDefault(); setFontScale(state.fontScale + .08); }
  else if (event.ctrlKey && event.key === '-') { event.preventDefault(); setFontScale(state.fontScale - .08); }
  else if (event.ctrlKey && event.key === '0') { event.preventDefault(); setFontScale(1); }
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

initializeCodeEditor();
initialize();
window.leafMD.onOpenFile(doc => {
  state.root = null;
  els.libraryName.textContent = t('recentReading');
  displayDocument(doc);
});
