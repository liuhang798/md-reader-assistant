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
