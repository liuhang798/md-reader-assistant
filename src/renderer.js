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
  searchMatches: [],
  searchIndex: 0,
  editing: false,
  dirty: false
};

const els = {
  welcome: $('#welcome'), documentView: $('#documentView'), content: $('#markdownContent'),
  fileList: $('#fileList'), libraryName: $('#libraryName'), tocPanel: $('#tocPanel'), toc: $('#toc'),
  breadcrumb: $('#breadcrumb'), readingTime: $('#readingTime'), progressBar: $('#progressBar'),
  sidebar: $('#sidebar'), expandSidebar: $('#expandSidebar'), searchBar: $('#searchBar'),
  searchInput: $('#searchInput'), searchCount: $('#searchCount'), dropOverlay: $('#dropOverlay'),
  moreMenu: $('#moreMenu'), toast: $('#toast'), editorView: $('#editorView'),
  editor: $('#markdownEditor'), editorPreview: $('#editorPreviewContent'), editorFileName: $('#editorFileName'), editorSaveState: $('#editorSaveState'),
  editorPosition: $('#editorPosition'), editButton: $('#editButton'), editButtonLabel: $('#editButtonLabel'),
  saveButton: $('#saveButton'), backToTop: $('#backToTop')
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
      return `<div class="code-block"><div class="code-header"><span>${label}</span><button class="copy-code" type="button">复制</button></div><pre><code class="hljs${valid ? ` language-${lang}` : ''}">${highlighted}</code></pre></div>`;
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
  if (!silent) showToast(`正文字号 ${Math.round(state.fontScale * 100)}%`);
}

function fileIcon() {
  return '<svg viewBox="0 0 24 24"><path d="M6 3.5h8l4 4v13H6v-17Z"/><path d="M14 3.5v4h4M9 12h6M9 15h6"/></svg>';
}

function recentEntry(doc) {
  return { path: doc.path, name: doc.name, directory: '最近打开' };
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
  showToast('已从最近阅读中移除，原文件未删除');
}

function renderFileList() {
  if (!state.files.length) {
    els.fileList.innerHTML = '<div class="empty-list">还没有最近文档</div>';
    return;
  }
  els.fileList.innerHTML = state.files.map(file => {
    const active = state.currentFile?.path === file.path ? ' active' : '';
    const sub = file.directory && file.directory !== '.' ? file.directory : (file.relativePath ? 'Markdown 文档' : '最近打开');
    const removeButton = !state.root
      ? `<button class="recent-remove" data-path="${encodeURIComponent(file.path)}" title="删除最近阅读记录" aria-label="删除 ${escapeHtml(file.name)} 的最近阅读记录"><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4h6v3M8 10v8M12 10v8M16 10v8M7 7l1 14h8l1-14"/></svg></button>`
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
  const name = state.currentFile?.name || 'MD阅读助手';
  document.title = `${state.dirty ? '● ' : ''}${name} · MD阅读助手`;
}

function setDirty(dirty) {
  state.dirty = Boolean(dirty);
  window.leafMD.setDirty(state.dirty);
  els.editorSaveState.textContent = state.dirty ? '尚未保存' : '已保存';
  els.editorSaveState.classList.toggle('dirty', state.dirty);
  updateWindowTitle();
}

function maybeDiscardChanges() {
  if (!state.dirty) return true;
  return window.confirm('当前文档有尚未保存的更改。\n\n确定要放弃更改并继续吗？');
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
    els.editorPreview.innerHTML = '<p class="preview-error">暂时无法渲染当前内容</p>';
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
    els.readingTime.textContent = `约 ${minutes} 分钟 · ${words.toLocaleString()} 字`;
    renderToc();
    renderFileList();
  } catch (error) {
    showToast('Markdown 渲染失败');
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
  els.editButtonLabel.textContent = '编辑';
  renderCurrentDocument();
  setDirty(false);
  $('.reader-pane').scrollTo({ top: 0 });
}

async function loadFile(filePath) {
  if (!maybeDiscardChanges()) return;
  try {
    displayDocument(await window.leafMD.readFile(filePath));
  } catch (error) {
    showToast('无法打开这个文件');
    console.error(error);
  }
}

function updateEditorPosition() {
  if (!codeEditor) return;
  const cursor = codeEditor.state.selection.main.head;
  const line = codeEditor.state.doc.lineAt(cursor);
  els.editorPosition.textContent = `第 ${line.number} 行，第 ${cursor - line.from + 1} 列`;
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
    els.editButtonLabel.textContent = '预览';
    focusCodeEditor();
    updateEditorPosition();
  } else {
    state.currentFile.content = editorContent();
    renderCurrentDocument();
    els.editorView.classList.add('hidden');
    els.documentView.classList.remove('hidden');
    els.editButton.classList.remove('active');
    els.editButtonLabel.textContent = '编辑';
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
      state.files.unshift({ path: saved.path, name: saved.name, directory: '最近打开' });
    }
    renderFileList();
    setDirty(false);
    showToast(saveAs ? '文档已另存为' : '文档已保存');
  } catch (error) {
    showToast('保存失败，请检查文件权限');
    console.error(error);
  }
}

function bindDocumentActions(container = els.content) {
  container.querySelectorAll('.copy-code').forEach(button => button.addEventListener('click', async () => {
    const code = button.closest('.code-block').querySelector('code').textContent;
    await navigator.clipboard.writeText(code);
    button.textContent = '已复制';
    setTimeout(() => button.textContent = '复制', 1200);
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
    els.libraryName.textContent = '最近阅读';
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
      showToast('无法打开文件夹中的文档');
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

async function initialize() {
  setTheme(state.dark);
  setFontScale(state.fontScale, true);
  const prefs = await window.leafMD.getPreferences();
  state.recentFiles = (prefs.recentFiles || []).map(filePath => ({
    path: filePath,
    name: filePath.split(/[\\/]/).pop(),
    directory: '最近打开'
  }));
  state.files = [...state.recentFiles];
  renderFileList();
  const initialFile = await window.leafMD.getInitialFile();
  if (initialFile?.path) {
    displayDocument(initialFile);
    if (await window.leafMD.getStartupMode() === 'edit') toggleEditor(true);
  }
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
els.moreMenu.addEventListener('click', event => {
  const action = event.target.closest('button')?.dataset.action;
  if (action === 'zoom-in') setFontScale(state.fontScale + .08);
  if (action === 'zoom-out') setFontScale(state.fontScale - .08);
  if (action === 'zoom-reset') setFontScale(1);
  if (action === 'default-app') {
    window.leafMD.openDefaultApps();
    showToast('请在“按文件类型指定默认应用”中选择 .md');
  }
  if (action === 'print') {
    if (state.editing) toggleEditor(false);
    window.leafMD.print();
  }
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
  if (/\.(md|markdown|mdown|mkd|txt)$/i.test(filePath)) loadFile(filePath);
  else showToast('请拖入 Markdown 或文本文件');
});

initializeCodeEditor();
initialize();
window.leafMD.onOpenFile(doc => {
  state.root = null;
  els.libraryName.textContent = '最近阅读';
  displayDocument(doc);
});
