import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const renderer = await readFile(new URL('../src/renderer.js', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('opening an existing recent document updates it in place', () => {
  assert.match(renderer, /const existingIndex = state\.recentFiles\.findIndex\(file => sameDocumentPath\(file\.path, doc\.path\)\)/);
  assert.match(renderer, /state\.recentFiles\[existingIndex\] = recentEntry\(doc\)/);
  assert.doesNotMatch(renderer, /\[recentEntry\(doc\), \.\.\.state\.recentFiles\.filter/);
});

test('recent documents show their source directory instead of a generic recently opened label', () => {
  assert.match(renderer, /directory: doc\.directory \|\| directoryFromDocumentPath\(doc\.path\)/);
  assert.match(renderer, /: \(file\.directory \|\| directoryFromDocumentPath\(file\.path\)\)/);
  assert.match(renderer, /<small title="\$\{escapeHtml\(sub\)\}">\$\{escapeHtml\(sub\)\}<\/small>/);
});

test('missing recent and favorite documents stay visible but cannot be opened', () => {
  assert.match(renderer, /const missing = state\.sidebarMode !== 'explorer' && file\.exists === false/);
  assert.match(renderer, /file-row\$\{missing \? ' missing' : ''\}/);
  assert.match(renderer, /aria-disabled="true" data-missing="true" title=.*recentMissingTitle/);
  assert.match(renderer, /if \(button\.dataset\.missing === 'true'\) return/);
  assert.match(renderer, /recentMissingAria/);
  assert.match(renderer, /refreshLibraryFileStatuses\(\)/);
  assert.match(styles, /\.file-row\.missing \.file-copy strong \{[^}]*text-decoration: line-through/);
});

test('library rows use their full width and remove recent records from the context menu only', () => {
  assert.doesNotMatch(renderer, /class="recent-remove"/);
  assert.doesNotMatch(renderer, /querySelectorAll\('\.recent-remove'\)/);
  assert.doesNotMatch(styles, /\.recent-remove/);
  assert.match(styles, /\.file-item \{[^}]*padding: 9px 10px;/);
  assert.match(html, /data-recent-action="remove"/);
});

test('right-clicking any library document opens an action menu', () => {
  assert.match(html, /id="recentContextMenu"/);
  assert.match(html, /data-recent-action="edit"/);
  assert.match(html, /data-recent-action="save-as"/);
  assert.match(html, /data-recent-action="favorite"/);
  assert.match(html, /data-recent-action="reveal"/);
  assert.match(html, /data-recent-action="remove"/);
  assert.match(renderer, /els\.fileList\.querySelectorAll\('\.file-row'\)/);
  assert.match(renderer, /addEventListener\('contextmenu', event =>/);
  assert.match(renderer, /openRecentContextMenu\(event, decodeURIComponent\(row\.dataset\.path\), row\.classList\.contains\('missing'\)\)/);
  assert.match(renderer, /const favoriteRemoval = button\.dataset\.recentAction === 'favorite' && isFavorite/);
  assert.doesNotMatch(renderer, /contextmenu[\s\S]{0,250}revealFileInFolder\(decodeURIComponent/);
});

test('document context menu edits, favorites, reveals, or removes the selected document', () => {
  assert.match(renderer, /if \(action === 'edit'\) await editRecentDocument\(filePath\)/);
  assert.match(renderer, /else if \(action === 'save-as'\) await saveLibraryDocumentAs\(filePath\)/);
  assert.match(renderer, /else if \(action === 'favorite'\) await setFavoriteRecord\(filePath/);
  assert.match(renderer, /else if \(action === 'reveal'\) await revealFileInFolder\(filePath\)/);
  assert.match(renderer, /else if \(action === 'remove'\) await removeRecentRecord\(filePath\)/);
  assert.match(renderer, /async function editRecentDocument\(filePath\)[\s\S]*window\.quilliteMarkdown\.readFile\(filePath\)[\s\S]*await toggleEditor\(true\)/);
  assert.match(renderer, /async function saveLibraryDocumentAs\(filePath, \{ editAfterSave = false \} = \{\}\)[\s\S]*window\.quilliteMarkdown\.saveAs\(source\.path, source\.content\)[\s\S]*displayDocument\(saved\)/);
  assert.match(renderer, /await window\.quilliteMarkdown\.showInFolder\(filePath\)/);
  assert.match(styles, /\.recent-context-menu \{[^}]*right: auto;[^}]*width: 190px;/);
});

test('favorite documents show a persistent theme-colored marker in every library view', () => {
  assert.match(renderer, /const favorited = state\.favoriteFiles\.some\(favorite => sameDocumentPath\(favorite\.path, file\.path\)\)/);
  assert.match(renderer, /class="file-title-line"/);
  assert.match(renderer, /class="favorite-marker"/);
  assert.match(renderer, /class="file-title-line">\$\{favoriteMarker\}<strong>/);
  assert.match(renderer, /title="\$\{escapeHtml\(t\('favorited'\)\)\}"/);
  assert.match(styles, /\.favorite-marker \{[^}]*color: var\(--accent-strong\);/);
  assert.match(styles, /\.favorite-marker svg \{[^}]*fill: currentColor;/);
});

test('reader search includes Markdown inline code and fenced code text', () => {
  assert.match(renderer, /closest\('script, style, mark'\)/);
  assert.doesNotMatch(renderer, /closest\('code, script, style, mark'\)/);
});

test('returning to the app reloads an externally changed document without overwriting local edits', () => {
  assert.match(renderer, /async function refreshCurrentFileFromDisk\(\)/);
  assert.match(renderer, /if \(!state\.currentFile\?\.path \|\| state\.dirty \|\| state\.saving \|\| externalRefreshInProgress\) return/);
  assert.match(renderer, /const refreshed = await window\.quilliteMarkdown\.readFile\(requestedPath\)/);
  assert.match(renderer, /if \(!state\.currentFile \|\| !sameDocumentPath\(state\.currentFile\.path, requestedPath\) \|\| state\.dirty \|\| state\.saving\) return/);
  assert.match(renderer, /window\.addEventListener\('focus', \(\) => \{[\s\S]*scheduleMacWindowModeSync\(\);[\s\S]*refreshCurrentFileFromDisk\(\);[\s\S]*\}\)/);
});

test('document width presets are selectable in the more menu and persist', () => {
  assert.match(html, /class="doc-width-preset-grid" role="group"/);
  assert.match(html, /data-doc-width="narrow"/);
  assert.match(html, /data-doc-width="medium"/);
  assert.match(html, /data-doc-width="wide"/);
  assert.match(html, /data-doc-width="full"/);
  assert.match(html, /role="menuitemradio" data-doc-width="medium"/);
  assert.match(renderer, /docWidth: normalizeDocWidth\(localStorage\.getItem\('docWidth'\)\)/);
  assert.match(renderer, /function normalizeDocWidth\(value\)/);
  assert.match(renderer, /function setDocumentWidth\(level, silent = false\)/);
  assert.match(renderer, /document\.body\.dataset\.docWidth = state\.docWidth/);
  assert.match(renderer, /localStorage\.setItem\('docWidth', state\.docWidth\)/);
  assert.match(renderer, /if \(button\?\.dataset\.docWidth\) setDocumentWidth\(button\.dataset\.docWidth\)/);
  assert.match(renderer, /setDocumentWidth\(state\.docWidth, true\)/);
  assert.match(styles, /\.document-view \{ max-width: var\(--doc-width\)/);
  assert.match(styles, /\.editor-preview-content \{ max-width: var\(--editor-doc-width\)/);
  assert.match(styles, /\.editor-preview-content \{[^}]*font-size: calc\(16px \* var\(--font-scale\)\);/);
  assert.match(styles, /body\[data-doc-width="narrow"\] \{ --doc-width: 640px; --editor-doc-width: 560px; \}/);
  assert.match(styles, /body\[data-doc-width="wide"\] \{ --doc-width: 1100px; --editor-doc-width: 900px; \}/);
  assert.match(styles, /body\[data-doc-width="full"\] \{ --doc-width: 100%; --editor-doc-width: 100%; \}/);
  assert.match(styles, /\.doc-width-preset-grid \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(styles, /\.popover \.doc-width-preset-grid button\.active \{[^}]*border-color:[^}]*background: var\(--accent-soft\);[^}]*color: var\(--accent-strong\);/);
});

test('English settings menu uses larger readable type and extra width', () => {
  assert.match(styles, /html\[lang="en"\] #moreMenu \{ width: 238px; \}/);
  assert.match(styles, /html\[lang="en"\] #moreMenu button \{[^}]*font-size: 13px;[^}]*line-height: 1\.35;/);
  assert.match(styles, /html\[lang="en"\] #moreMenu \.menu-label \{ font-size: 13px; \}/);
  assert.match(styles, /html\[lang="en"\] #moreMenu \.popover-label \{ font-size: 10\.5px; \}/);
});

test('plain text files render without Markdown parsing and edit without Markdown syntax highlighting', () => {
  assert.match(renderer, /function isPlainTextFile\(path\)/);
  assert.match(renderer, /return \/\\\.txt\$\/i\.test\(path \|\| ''\)/);
  assert.match(renderer, /if \(isPlainTextFile\(doc\.path\)\) \{\s*container\.innerHTML = `<div class="plain-text">\$\{escapeHtml\(content\)\}<\/div>`;/);
  assert.match(renderer, /const language = isPlainTextFile\(state\.currentFile\?\.path\)\s*\? \[\]\s*: \[markdown\(\), syntaxHighlighting\(markdownHighlightStyle\)\]/);
  assert.doesNotMatch(renderer, /editorExtensions = \[\s*basicSetup,\s*markdown\(\)/);
  assert.match(styles, /\.plain-text \{ white-space: pre-wrap; overflow-wrap: break-word; font-family: "Cascadia Code", Consolas, "Microsoft YaHei UI", monospace;/);
  assert.match(styles, /\.plain-text \{[^}]*font-size: calc\(15px \* var\(--font-scale\)\);/);
});

test('inserting an image supports online links with an optional description', () => {
  assert.match(html, /id="imageDialog"/);
  assert.match(html, /id="imageUrl"/);
  assert.match(html, /id="imageAltInput"/);
  assert.match(html, /id="pickLocalImage"/);
  assert.match(html, /id="confirmImage"/);
  assert.match(html, /img-src 'self' data: file: https: http:/);
  assert.match(renderer, /function openImageDialog\(\)/);
  assert.match(renderer, /function closeImageDialog\(\)/);
  assert.match(renderer, /function insertImageFromUrl\(\)/);
  assert.match(renderer, /if \(!\/\^https\?:\\\/\\\/\\S\+\$\/i\.test\(url\)\)/);
  assert.match(renderer, /const markdownPath = \/\[\\s\(\)\]\/\.test\(url\) \? `<\$\{url\.replaceAll\('>', '%3E'\)\}>` : url;/);
  assert.match(renderer, /function insertLocalImage\(\)/);
  assert.match(renderer, /window\.quilliteMarkdown\.selectImage\(state\.currentFile\.path\)/);
  assert.match(renderer, /els\.imageAltInput\.value\.trim\(\)\.replaceAll\('\[', '\\\\\['\)\.replaceAll\('\]', '\\\\\]'\) \|\| selectedImageAlt\(\) \|\| t\('imageAlt'\)/);
  assert.match(renderer, /\$\('#pickLocalImage'\)\.addEventListener\('click', \(\) => \{ closeImageDialog\(\); insertLocalImage\(\); \}\)/);
  assert.match(renderer, /els\.imageUrl\.addEventListener\('keydown', event => \{\s*if \(event\.key === 'Enter'\) insertImageFromUrl\(\);/);
  assert.match(styles, /\.image-dialog-fields input:focus \{ border-color: var\(--accent\);/);
});

test('the update dialog offers in-app download and apply with progress', () => {
  assert.match(html, /id="applyUpdate"/);
  assert.match(html, /id="updateProgress"/);
  assert.match(html, /id="updateProgressBar"/);
  assert.match(html, /id="updateProgressLabel"/);
  assert.match(renderer, /async function startDownloadAndUpdate\(\)/);
  assert.match(renderer, /await window\.quilliteMarkdown\.downloadAndApplyUpdate\(\)/);
  assert.match(renderer, /window\.quilliteMarkdown\.onUpdateProgress\(progress =>/);
  assert.match(renderer, /\$\('#applyUpdate'\)\.addEventListener\('click', startDownloadAndUpdate\)/);
  assert.match(renderer, /platform !== 'darwin' && platform !== 'windows'/);
  assert.match(renderer, /state\.dirty && state\.currentFile\?\.path\) \{\s*await saveDocument\(false, \{ auto: true, silent: true \}\)/);
  assert.match(renderer, /setTimeout\(\(\) => window\.quilliteMarkdown\.closeWindow\(\), 500\)/);
  assert.match(styles, /\.update-progress-bar \{ height: 100%; width: 0; border-radius: 4px; background: var\(--accent-strong\);/);
});

test('Word and PDF export are available from the document menu', () => {
  assert.match(html, /data-action="export-word"/);
  assert.match(html, /data-action="export-pdf"/);
  assert.match(html, /data-i18n="exportWord"/);
  assert.match(html, /data-i18n="exportPDF"/);
  assert.match(mainSource, /exportDOCX: \(filePath, title, renderedHTML\) => desktopRuntime \? Backend\.ExportDOCX\(filePath, title, renderedHTML\)/);
  assert.match(renderer, /async function exportWordDocument\(\)/);
  assert.match(renderer, /cleanRenderedHTMLForExport\(container\)/);
  assert.match(renderer, /if \(action === 'export-word'\) exportWordDocument\(\)/);
  assert.match(html, /id="pdfTutorialDialog"/);
  assert.match(html, /Microsoft Print to PDF/);
  assert.match(html, /data-i18n="pdfSaveAsPDF"/);
  assert.match(renderer, /function exportPDFDocument\(\)[\s\S]*openPDFTutorial\(\)/);
  assert.match(renderer, /async function confirmPDFExport\(\)[\s\S]*if \(state\.editing\) toggleEditor\(false\)[\s\S]*window\.quilliteMarkdown\.print\(\)/);
  assert.match(renderer, /\$\('#confirmPDFTutorial'\)\.addEventListener\('click', confirmPDFExport\)/);
  assert.match(renderer, /if \(action === 'export-pdf'\) exportPDFDocument\(\)/);
  assert.match(styles, /html\[data-platform="darwin"\] \.pdf-tutorial-windows \{ display: none; \}/);
  assert.match(styles, /html\[data-platform="darwin"\] \.pdf-tutorial-macos \{ display: block; \}/);
  assert.match(styles, /@media print \{[\s\S]*\.toast, \.popover, \.pane-resizer \{ display: none !important; \}/);
});

test('reader header exposes responsive Word and PDF export actions', () => {
  assert.match(html, /id="documentSaveAsButton"[^>]*data-document-action="save-as"[^>]*data-i18n="saveAs"/);
  assert.match(html, /id="documentExportWordButton"[^>]*data-document-action="export-word"[^>]*data-i18n="exportWord"/);
  assert.match(html, /id="documentExportPDFButton"[^>]*data-document-action="export-pdf"[^>]*data-i18n="exportPDF"/);
  assert.match(html, /id="documentActionsMoreButton"[^>]*aria-haspopup="menu"[^>]*data-i18n="moreDocumentActions"/);
  assert.match(html, /id="documentActionsMenu"[^>]*role="menu"[\s\S]*data-document-action="save-as"[\s\S]*data-document-action="export-word"[\s\S]*data-document-action="export-pdf"[\s\S]*data-document-action="print"/);
  assert.match(styles, /\.document-meta \{[^}]*container-type: inline-size;/);
  assert.match(styles, /@container \(max-width: 720px\) \{[\s\S]*\.document-actions > \.document-action-collapsible \{ display: none; \}[\s\S]*\.document-actions-more \{ display: block; \}/);
  assert.match(renderer, /function runDocumentHeaderAction\(action\)[\s\S]*action === 'save-as'[\s\S]*saveLibraryDocumentAs\(state\.currentFile\.path\)[\s\S]*action === 'export-word'\) exportWordDocument\(\)[\s\S]*action === 'export-pdf'\) exportPDFDocument\(\)[\s\S]*action === 'print'/);
  assert.match(renderer, /els\.documentActions\.addEventListener\('click', event =>[\s\S]*documentActionsMenu\.classList\.toggle\('hidden', !opening\)[\s\S]*runDocumentHeaderAction\(actionButton\.dataset\.documentAction\)/);
  assert.match(renderer, /function closeDocumentActionsMenu\(\)[\s\S]*aria-expanded', 'false'/);
});

test('unwritable documents explain the cause and offer Save Copy and Edit without repeating failed autosaves', () => {
  assert.match(mainSource, /canEditFile: filePath => desktopRuntime \? Backend\.CanEditFile\(filePath\) : resolved\(true\)/);
  assert.match(renderer, /canEdit = await window\.quilliteMarkdown\.canEditFile\(state\.currentFile\.path\)/);
  assert.match(renderer, /if \(!canEdit\) \{[\s\S]*state\.saveAsRequired = true;[\s\S]*openEditPermissionDialog\(\);[\s\S]*return;/);
  assert.match(html, /id="editPermissionDialog"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(html, /data-i18n="permissionReasonCache"/);
  assert.match(html, /data-i18n="permissionReasonReadOnly"/);
  assert.match(html, /data-i18n="permissionReasonLocked"/);
  assert.match(html, /id="saveCopyAndEdit"[^>]*data-i18n="saveCopyAndEdit"/);
  assert.match(renderer, /function openEditPermissionDialog\(\)[\s\S]*editPermissionFileName\.textContent = state\.currentFile\?\.name[\s\S]*editPermissionDialog\.classList\.remove\('hidden'\)/);
  assert.match(renderer, /async function savePermissionCopyAndEdit\(\)[\s\S]*saveLibraryDocumentAs\(filePath, \{ editAfterSave: true \}\)/);
  assert.match(renderer, /async function saveLibraryDocumentAs\(filePath, \{ editAfterSave = false \} = \{\}\)[\s\S]*if \(editAfterSave\) await toggleEditor\(true\)/);
  assert.match(renderer, /\$\('#saveCopyAndEdit'\)\.addEventListener\('click', savePermissionCopyAndEdit\)/);
  assert.match(styles, /\.edit-permission-reasons \{[^}]*border-left: 3px solid var\(--accent\);[^}]*background: var\(--accent-soft\);/);
  assert.match(renderer, /if \(state\.saveAsRequired && options\.auto\) return;/);
  assert.match(renderer, /if \(state\.saveAsRequired && !options\.auto\) saveAs = true;/);
  assert.match(renderer, /state\.saveAsRequired = true;/);
  assert.match(renderer, /fallbackToSaveAs = true;/);
  assert.match(renderer, /if \(fallbackToSaveAs\) await saveDocument\(true, options\);/);
  assert.match(renderer, /saveAsRequiredHint: '原文件可能来自微信缓存/);
  assert.match(renderer, /replacingUnwritableSource && !sameDocumentPath\(saved\.path, originalPath\)/);
});

test('the editor header offers an exit editing button', () => {
  assert.match(html, /id="exitEditButton" class="text-button exit-edit-button"/);
  assert.match(html, /data-i18n="exitEdit"/);
  assert.match(renderer, /els\.exitEditButton\.addEventListener\('click', \(\) => \{\s*if \(state\.editing\) toggleEditor\(false\);/);
});

test('code blocks let the user pick a common programming language', () => {
  assert.match(html, /id="codeLangMenu"/);
  assert.match(renderer, /const CODE_LANGUAGES = \[/);
  assert.match(renderer, /\{ value: 'go', label: 'Go' \}/);
  assert.match(renderer, /if \(command === 'code-block'\) \{ openCodeLangMenu\(\); return true; \}/);
  assert.match(renderer, /function insertCodeBlock\(lang = ''\)/);
  assert.match(renderer, /els\.codeLangMenu\.addEventListener\('click', event => \{\s*event\.stopPropagation\(\);/);
  assert.match(renderer, /insertCodeBlock\(button\.dataset\.codeLang\)/);
  assert.match(renderer, /document\.addEventListener\('click', \(\) => \{\s*els\.moreMenu\.classList\.add\('hidden'\);\s*els\.codeLangMenu\.classList\.add\('hidden'\);/);
  assert.match(styles, /\.code-lang-menu \{ right: auto; top: auto;/);
});

test('editor split panes are draggable without a maximum width limit', () => {
  assert.match(html, /id="editorResizer" class="pane-resizer editor-resizer"/);
  assert.match(renderer, /editorPreviewWidth/);
  assert.match(renderer, /setEditorPreviewWidth\(startPercent \+ deltaPercent\)/);
  assert.match(renderer, /Math\.max\(12, Math\.min\(max, Math\.round\(percent\)\)\)/);
  assert.match(renderer, /els\.editorResizer\?\.classList\.toggle\('hidden', !state\.editing\)/);
  assert.match(styles, /\.editor-preview-pane \{ flex: 0 0 var\(--editor-preview-width, 47%\);/);
  assert.match(styles, /\.editor-preview-pane, \.editor-resizer \{ display: none; \}/);
  assert.match(renderer, /localStorage\.setItem\('editorPreviewWidth', String\(state\.editorPreviewWidth\)\)/);
  assert.match(html, /data-i18n-title="resizeEditor"/);
});

test('right-clicking the live preview locates the matching editor source line with a pointer hint', () => {
  assert.match(html, /id="previewLocateHint" class="preview-locate-hint hidden"/);
  assert.match(html, /data-i18n="previewLocateHint"/);
  assert.match(renderer, /function previewBlockAtPointer\(event\)/);
  assert.match(renderer, /function locateEditorFromPreview\(event\)[\s\S]*selection: \{ anchor: line\.from \}[\s\S]*effects: EditorView\.scrollIntoView\(line\.from, \{ y: 'start', yMargin: 12 \}\)/);
  assert.match(renderer, /editorExtensions = \[[\s\S]*scrollPastEnd\(\)/);
  assert.doesNotMatch(renderer, /previewLocated/);
  assert.match(renderer, /els\.editorPreview\.addEventListener\('contextmenu', locateEditorFromPreview\)/);
  assert.match(renderer, /addEventListener\('pointermove', showPreviewLocateHint/);
  assert.match(styles, /\.editor-preview-content \[data-line\] \{ cursor: context-menu; \}/);
  assert.match(styles, /\.preview-locate-hint \{ position: fixed;/);
});

test('normal and exceptional notifications use distinct accessible toast treatments and readable durations', () => {
  assert.match(html, /id="toast" class="toast hidden" data-kind="info" role="status" aria-live="polite"/);
  assert.match(html, /id="closeToast"[\s\S]*data-i18n-title="dismissNotification"/);
  assert.match(renderer, /const durations = \{ success: 3200, info: 3600, warning: 5600, error: 8000 \}/);
  assert.match(renderer, /setAttribute\('role', normalizedKind === 'error' \|\| normalizedKind === 'warning' \? 'alert' : 'status'\)/);
  assert.match(renderer, /\$\('#closeToast'\)\.addEventListener\('click', hideToast\)/);
  assert.match(renderer, /els\.toast\.addEventListener\('mouseenter', \(\) => clearTimeout\(showToast\.timer\)\)/);
  assert.match(styles, /\.toast\[data-kind="success"\]/);
  assert.match(styles, /\.toast\[data-kind="warning"\]/);
  assert.match(styles, /\.toast\[data-kind="error"\]/);
  assert.match(styles, /\.toast:hover \.toast-progress i \{ animation-play-state: paused; \}/);
});

test('sidebar and TOC text scale with the global font scale', () => {
  assert.match(styles, /\.file-copy strong \{ font-size: calc\(13px \* var\(--font-scale\)\);/);
  assert.match(styles, /\.file-copy small \{ color: var\(--faint\); font-size: calc\(10\.5px \* var\(--font-scale\)\);/);
  assert.match(styles, /\.toc a \{[^}]*font-size: calc\(11\.5px \* var\(--font-scale\)\);/);
  assert.match(styles, /\.sidebar-tab \{ [^}]*font-size: calc\(11px \* var\(--font-scale\)\);/);
  assert.match(styles, /\.eyebrow \{ display: block; color: var\(--faint\); font-size: calc\(10px \* var\(--font-scale\)\);/);
  assert.match(styles, /\.sidebar-heading h2 \{ margin: 5px 0 0; font-size: calc\(18px \* var\(--font-scale\)\);/);
});

test('the document outline renders as a persistent collapsible tree', () => {
  assert.match(renderer, /const tree = buildTocTree\(/);
  assert.match(renderer, /data-toc-toggle=/);
  assert.match(renderer, /writeCollapsedToc\(localStorage, state\.currentFile\?\.path, collapsed\)/);
  assert.match(styles, /\.toc-children\.hidden \{ display: none; \}/);
  assert.match(styles, /\.toc-node\.collapsed > \.toc-row \.toc-toggle svg/);
});

test('sidebar and TOC resizers have no practical maximum width', () => {
  assert.match(renderer, /sidebar: \{ min: 120, max: 2000, fallback: 258 \}/);
  assert.match(renderer, /toc: \{ min: 120, max: 2000, fallback: 205 \}/);
  assert.match(renderer, /els\.appShell\.clientWidth - otherWidth - 240/);
  assert.match(html, /aria-valuemax="2000"/);
});

test('back-to-top follows the resized TOC while keeping a safe gap from the document scrollbar', () => {
  assert.match(styles, /\.back-to-top \{[^}]*right: calc\(var\(--toc-width\) \+ 24px\);/);
  assert.match(styles, /body:has\(\.toc-panel\.hidden\) \.back-to-top \{ right: 24px; \}/);
  assert.doesNotMatch(styles, /body\[data-doc-width="full"\][^{]*\.back-to-top/);
  assert.match(styles, /@media \(max-width: 1120px\)[\s\S]*\.back-to-top \{ right: 24px; \}/);
});

test('feedback dialog collects optional contact details, images, and automatic environment information', () => {
  assert.match(html, /data-action="feedback"/);
  assert.match(html, /id="feedbackDialog"[\s\S]*name="feedbackCategory" value="feature"[\s\S]*name="feedbackCategory" value="bug"/);
  assert.match(html, /id="feedbackEmail" type="email"/);
  assert.match(html, /id="feedbackPhone" type="tel"/);
  assert.match(html, /id="selectFeedbackImages"/);
  assert.match(html, /id="feedbackAppVersion"[\s\S]*id="feedbackSystemVersion"/);
  assert.match(mainSource, /getFeedbackSystemInfo:[\s\S]*Backend\.GetFeedbackSystemInfo/);
  assert.match(mainSource, /selectFeedbackImages:[\s\S]*Backend\.SelectFeedbackImages/);
  assert.match(mainSource, /submitFeedback:[\s\S]*Backend\.SubmitFeedback/);
  assert.match(renderer, /window\.quilliteMarkdown\.submitFeedback\(\{[\s\S]*category:[\s\S]*message,[\s\S]*email:[\s\S]*phone:[\s\S]*imagePaths:/);
  assert.match(renderer, /feedbackPrivacy: '提交后，以上反馈内容、联系方式、所选图片及版本信息将发送到轻阅官网服务器；不会上传当前文档。'/);
});

test('product improvement checkbox controls error logs without disabling anonymous daily active reporting', () => {
  assert.match(html, /data-i18n="usageAnalyticsDescription">此开关仅控制异常回传[^<]*每天最多提交一次匿名活跃记录/);
  assert.match(renderer, /usageAnalyticsDisabled: '已关闭异常自动回传'/);
  assert.match(renderer, /One anonymous daily-active event is submitted at most once per day regardless of this setting/);
});
