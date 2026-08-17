import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { clampFontScale, readFontScaleStorage, recommendedFontScale } from '../src/font-scaling.js';

const renderer = await readFile(new URL('../src/renderer.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('font scale persists and supports up to 200 percent', () => {
  assert.equal(clampFontScale(3), 2);
  assert.equal(clampFontScale(.5), .82);
  assert.match(renderer, /localStorage\.setItem\('fontScale', state\.fontScale\)/);
  assert.match(renderer, /localStorage\.setItem\('fontScaleMode', state\.fontScaleMode\)/);
  assert.match(renderer, /setFontScale\(state\.fontScale, true, state\.fontScaleMode\)/);
});

test('automatic defaults enlarge low-DPI 2K and 4K displays without double scaling', () => {
  assert.equal(recommendedFontScale({ width: 1920, height: 1080, devicePixelRatio: 1 }), 1);
  assert.equal(recommendedFontScale({ width: 2560, height: 1440, devicePixelRatio: 1 }), 1.15);
  assert.equal(recommendedFontScale({ width: 3840, height: 2160, devicePixelRatio: 1 }), 1.3);
  assert.equal(recommendedFontScale({ width: 2560, height: 1440, devicePixelRatio: 1.5 }), 1);
  assert.equal(recommendedFontScale({ width: 1920, height: 1080, devicePixelRatio: 2 }), 1);
});

test('legacy custom sizes remain manual while untouched 100 percent migrates to auto', () => {
  const storage = entries => ({ getItem: key => Object.hasOwn(entries, key) ? entries[key] : null });
  assert.deepEqual(
    readFontScaleStorage(storage({ fontScale: '1.25' }), { width: 3840, height: 2160, devicePixelRatio: 1 }),
    { mode: 'manual', scale: 1.25 }
  );
  assert.deepEqual(
    readFontScaleStorage(storage({ fontScale: '1' }), { width: 3840, height: 2160, devicePixelRatio: 1 }),
    { mode: 'auto', scale: 1.3 }
  );
  assert.deepEqual(
    readFontScaleStorage(storage({ fontScale: '1.5', fontScaleMode: 'auto' }), { width: 2560, height: 1440, devicePixelRatio: 1.5 }),
    { mode: 'auto', scale: 1 }
  );
});

test('the More menu offers automatic mode and compact 100 to 200 percent presets', () => {
  assert.match(html, /data-font-scale="auto"/);
  for (const scale of ['1', '1.25', '1.5', '1.75', '2']) assert.match(html, new RegExp(`data-font-scale="${scale}"`));
  assert.match(renderer, /function enableAutomaticFontScale\(silent = false\)/);
  assert.match(renderer, /window\.addEventListener\('resize', scheduleAutomaticFontScaleRefresh\)/);
  assert.match(styles, /\.font-scale-preset-grid \{[^}]*grid-template-columns: repeat\(3,/);
});

test('CodeMirror source text and gutters inherit the shared font scale', () => {
  assert.match(styles, /#markdownEditor \.cm-editor\s*\{[^}]*font-size:\s*calc\(15px \* var\(--font-scale\)\)/s);
  assert.doesNotMatch(styles, /#markdownEditor\s*\{[^}]*font-size:\s*15px/s);
});

test('zoom feedback describes both reading and editing text', () => {
  assert.match(renderer, /bodyFontScale: '文字字号 \{percent\}%'/);
  assert.match(renderer, /bodyFontScale: 'Text size \{percent\}%'/);
});
