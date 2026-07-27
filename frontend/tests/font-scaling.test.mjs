import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const renderer = await readFile(new URL('../src/renderer.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('font scale persists and supports up to 200 percent', () => {
  assert.match(renderer, /Math\.max\(\.82, Math\.min\(2, scale\)\)/);
  assert.match(renderer, /localStorage\.setItem\('fontScale', state\.fontScale\)/);
  assert.match(renderer, /setFontScale\(state\.fontScale, true\)/);
});

test('CodeMirror source text and gutters inherit the shared font scale', () => {
  assert.match(styles, /#markdownEditor \.cm-editor\s*\{[^}]*font-size:\s*calc\(15px \* var\(--font-scale\)\)/s);
  assert.doesNotMatch(styles, /#markdownEditor\s*\{[^}]*font-size:\s*15px/s);
});

test('zoom feedback describes both reading and editing text', () => {
  assert.match(renderer, /bodyFontScale: '文字字号 \{percent\}%'/);
  assert.match(renderer, /bodyFontScale: 'Text size \{percent\}%'/);
});
