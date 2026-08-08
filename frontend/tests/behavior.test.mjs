import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const renderer = await readFile(new URL('../src/renderer.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

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
