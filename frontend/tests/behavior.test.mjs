import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const renderer = await readFile(new URL('../src/renderer.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('opening an existing recent document updates it in place', () => {
  assert.match(renderer, /const existingIndex = state\.recentFiles\.findIndex\(file => sameDocumentPath\(file\.path, doc\.path\)\)/);
  assert.match(renderer, /state\.recentFiles\[existingIndex\] = recentEntry\(doc\)/);
  assert.doesNotMatch(renderer, /\[recentEntry\(doc\), \.\.\.state\.recentFiles\.filter/);
});

test('missing recent and favorite documents stay visible but cannot be opened', () => {
  assert.match(renderer, /const missing = state\.sidebarMode !== 'explorer' && file\.exists === false/);
  assert.match(renderer, /file-row\$\{missing \? ' missing' : ''\}/);
  assert.match(renderer, /aria-disabled="true" data-missing="true" title=.*recentMissingTitle/);
  assert.match(renderer, /if \(button\.dataset\.missing === 'true'\) return/);
  assert.match(renderer, /recentMissingAria/);
  assert.match(renderer, /refreshLibraryFileStatuses\(\)/);
  assert.match(styles, /\.file-row\.missing \.file-copy strong \{[^}]*text-decoration: line-through/);
  assert.match(styles, /\.file-row\.missing \.recent-remove \{ opacity: \.62; \}/);
});

test('right-clicking any library document opens an action menu', () => {
  assert.match(html, /id="recentContextMenu"/);
  assert.match(html, /data-recent-action="edit"/);
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
  assert.match(renderer, /else if \(action === 'favorite'\) await setFavoriteRecord\(filePath/);
  assert.match(renderer, /else if \(action === 'reveal'\) await revealFileInFolder\(filePath\)/);
  assert.match(renderer, /else if \(action === 'remove'\) await removeRecentRecord\(filePath\)/);
  assert.match(renderer, /async function editRecentDocument\(filePath\)[\s\S]*window\.leafMD\.readFile\(filePath\)[\s\S]*await toggleEditor\(true\)/);
  assert.match(renderer, /await window\.leafMD\.showInFolder\(filePath\)/);
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
  assert.match(renderer, /const refreshed = await window\.leafMD\.readFile\(requestedPath\)/);
  assert.match(renderer, /if \(!state\.currentFile \|\| !sameDocumentPath\(state\.currentFile\.path, requestedPath\) \|\| state\.dirty \|\| state\.saving\) return/);
  assert.match(renderer, /window\.addEventListener\('focus', \(\) => \{[\s\S]*scheduleMacWindowModeSync\(\);[\s\S]*refreshCurrentFileFromDisk\(\);[\s\S]*\}\)/);
});

test('document width presets are selectable in the more menu and persist', () => {
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
  assert.match(styles, /body\[data-doc-width="narrow"\] \{ --doc-width: 640px; --editor-doc-width: 560px; \}/);
  assert.match(styles, /body\[data-doc-width="wide"\] \{ --doc-width: 1100px; --editor-doc-width: 900px; \}/);
  assert.match(styles, /body\[data-doc-width="full"\] \{ --doc-width: 100%; --editor-doc-width: 100%; \}/);
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
  assert.match(renderer, /window\.leafMD\.selectImage\(state\.currentFile\.path\)/);
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
  assert.match(renderer, /await window\.leafMD\.downloadAndApplyUpdate\(\)/);
  assert.match(renderer, /window\.leafMD\.onUpdateProgress\(progress =>/);
  assert.match(renderer, /\$\('#applyUpdate'\)\.addEventListener\('click', startDownloadAndUpdate\)/);
  assert.match(renderer, /platform !== 'darwin' && platform !== 'windows'/);
  assert.match(renderer, /state\.dirty && state\.currentFile\?\.path\) \{\s*await saveDocument\(false, \{ auto: true, silent: true \}\)/);
  assert.match(renderer, /setTimeout\(\(\) => window\.leafMD\.closeWindow\(\), 500\)/);
  assert.match(styles, /\.update-progress-bar \{ height: 100%; width: 0; border-radius: 4px; background: var\(--accent-strong\);/);
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

test('sidebar and TOC text scale with the global font scale', () => {
  assert.match(styles, /\.file-copy strong \{ font-size: calc\(13px \* var\(--font-scale\)\);/);
  assert.match(styles, /\.file-copy small \{ color: var\(--faint\); font-size: calc\(10\.5px \* var\(--font-scale\)\);/);
  assert.match(styles, /\.toc a \{ color: var\(--muted\); text-decoration: none; font-size: calc\(11\.5px \* var\(--font-scale\)\);/);
  assert.match(styles, /\.sidebar-tab \{ [^}]*font-size: calc\(11px \* var\(--font-scale\)\);/);
  assert.match(styles, /\.eyebrow \{ display: block; color: var\(--faint\); font-size: calc\(10px \* var\(--font-scale\)\);/);
  assert.match(styles, /\.sidebar-heading h2 \{ margin: 5px 0 0; font-size: calc\(18px \* var\(--font-scale\)\);/);
});

test('sidebar and TOC resizers have no practical maximum width', () => {
  assert.match(renderer, /sidebar: \{ min: 120, max: 2000, fallback: 258 \}/);
  assert.match(renderer, /toc: \{ min: 120, max: 2000, fallback: 205 \}/);
  assert.match(renderer, /els\.appShell\.clientWidth - otherWidth - 240/);
  assert.match(html, /aria-valuemax="2000"/);
});
