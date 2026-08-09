import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const renderer = await readFile(new URL('../src/renderer.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('opening an existing recent document updates it in place', () => {
  assert.match(renderer, /const existingIndex = state\.recentFiles\.findIndex\(file => file\.path === doc\.path\)/);
  assert.match(renderer, /state\.recentFiles\[existingIndex\] = recentEntry\(doc\)/);
  assert.doesNotMatch(renderer, /\[recentEntry\(doc\), \.\.\.state\.recentFiles\.filter/);
});

test('missing recent documents stay visible but cannot be opened', () => {
  assert.match(renderer, /const missing = state\.sidebarMode === 'recent' && file\.exists === false/);
  assert.match(renderer, /file-row\$\{missing \? ' missing' : ''\}/);
  assert.match(renderer, /disabled title=.*recentMissingTitle/);
  assert.match(renderer, /recentMissingAria/);
  assert.match(renderer, /refreshRecentFileStatuses\(\)/);
  assert.match(styles, /\.file-row\.missing \.file-copy strong \{[^}]*text-decoration: line-through/);
  assert.match(styles, /\.file-row\.missing \.recent-remove \{ opacity: \.62; \}/);
});

test('right-clicking a recent document opens an action menu', () => {
  assert.match(html, /id="recentContextMenu"/);
  assert.match(html, /data-recent-action="edit"/);
  assert.match(html, /data-recent-action="reveal"/);
  assert.match(html, /data-recent-action="remove"/);
  assert.match(renderer, /if \(state\.sidebarMode === 'recent'\)/);
  assert.match(renderer, /els\.fileList\.querySelectorAll\('\.file-row'\)/);
  assert.match(renderer, /addEventListener\('contextmenu', event =>/);
  assert.match(renderer, /openRecentContextMenu\(event, decodeURIComponent\(row\.dataset\.path\), row\.classList\.contains\('missing'\)\)/);
  assert.match(renderer, /const disabled = missing && button\.dataset\.recentAction !== 'remove'/);
  assert.doesNotMatch(renderer, /contextmenu[\s\S]{0,250}revealFileInFolder\(decodeURIComponent/);
});

test('recent context menu edits, reveals, or removes the selected document', () => {
  assert.match(renderer, /if \(action === 'edit'\) await editRecentDocument\(filePath\)/);
  assert.match(renderer, /else if \(action === 'reveal'\) await revealFileInFolder\(filePath\)/);
  assert.match(renderer, /else if \(action === 'remove'\) await removeRecentRecord\(filePath\)/);
  assert.match(renderer, /async function editRecentDocument\(filePath\)[\s\S]*window\.leafMD\.readFile\(filePath\)[\s\S]*await toggleEditor\(true\)/);
  assert.match(renderer, /await window\.leafMD\.showInFolder\(filePath\)/);
  assert.match(styles, /\.recent-context-menu \{[^}]*right: auto;[^}]*width: 190px;/);
});
