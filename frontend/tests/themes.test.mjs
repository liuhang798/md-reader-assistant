import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { ACCENT_THEMES } from '../src/appearance.js';

const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const renderer = await readFile(new URL('../src/renderer.js', import.meta.url), 'utf8');

const accentIds = ['green', 'blue', 'orange', 'violet', 'coral', 'cyan', 'slate', 'clay'];
const expectedColors = {
  green: '#07A936',
  blue: '#075DF3',
  orange: '#F57C04',
  violet: '#7940E0',
  coral: '#FC5540',
  cyan: '#0789B6',
  slate: '#556477',
  clay: '#A56254',
};

test('appearance registry exposes the eight approved accent colors', () => {
  assert.deepEqual(Object.keys(ACCENT_THEMES), accentIds);
  for (const id of accentIds) {
    assert.equal(ACCENT_THEMES[id].color, expectedColors[id], id);
    assert.match(ACCENT_THEMES[id].logo, new RegExp(`app-logo-${id}\\.png$`));
    assert.ok(ACCENT_THEMES[id].zhCN.length >= 3, id);
    assert.ok(ACCENT_THEMES[id].en.length >= 5, id);
  }
});

test('toolbar exposes separate accent chooser and one-click color mode controls', () => {
  const accentButton = html.match(/<button\s+id="accentButton"[^>]*>/)?.[0] ?? '';
  const colorModeButton = html.match(/<button\s+id="colorModeButton"[^>]*>/)?.[0] ?? '';

  assert.match(accentButton, /aria-haspopup="menu"/);
  assert.match(accentButton, /data-i18n-aria-label="accentThemeTitle"/);
  assert.doesNotMatch(colorModeButton, /aria-haspopup/);
  assert.match(colorModeButton, /data-i18n-aria-label="colorModeTitle"/);
});

test('accent menu contains exactly eight accessible radio options', () => {
  assert.match(html, /id="accentMenu"[^>]*role="menu"/);
  const optionIds = [...html.matchAll(/data-accent-option="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(optionIds, accentIds);
  assert.equal((html.match(/role="menuitemradio"/g) ?? []).length, 8);
  assert.equal((html.match(/aria-checked="false"/g) ?? []).length, 8);
});

test('all in-app brand images participate in runtime accent switching', () => {
  const brandImages = [...html.matchAll(/<img\s+[^>]*src="\/src\/assets\/images\/app-logo\.png"[^>]*>/g)];
  assert.ok(brandImages.length >= 4);
  for (const [image] of brandImages) assert.match(image, /data-themed-logo/);
});

test('CSS separates two color modes from all eight accent palettes', () => {
  assert.match(styles, /data-color-mode=["']dark["']/);
  assert.match(styles, /data-color-mode=["']light["']/);
  for (const id of accentIds) {
    assert.match(styles, new RegExp(`data-accent=["']${id}["']`));
    assert.match(styles, new RegExp(`data-accent=["']${id}["'][^{]*\\{[^}]*--accent:\\s*${expectedColors[id]}`, 's'));
  }
  assert.doesNotMatch(styles, /data-theme=/);
});

test('dark mode alone controls sun and moon icon visibility', () => {
  assert.match(styles, /data-color-mode=["']dark["'][^{]*\.sun-icon/);
  assert.match(styles, /data-color-mode=["']dark["'][^{]*\.moon-icon/);
  assert.doesNotMatch(styles, /data-accent=[^\n]*\.sun-icon/);
});

test('toolbar icon keyboard focus uses the selected accent instead of browser default', () => {
  assert.match(styles, /\.icon-button:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)/s);
});

test('prominent accent surfaces use restrained shadows', () => {
  assert.match(styles, /\.brand-mark\s*\{[^}]*box-shadow:\s*0 1px 4px rgba\(37, 54, 41, \.10\)/s);
  assert.match(styles, /\.primary\s*\{[^}]*box-shadow:\s*0 2px 8px color-mix\(in srgb, var\(--accent\) 10%, transparent\)/s);
  assert.match(styles, /\.leaf-float\s*\{[^}]*box-shadow:\s*0 5px 14px color-mix\(in srgb, var\(--accent\) 12%, transparent\)/s);
});

test('CodeMirror consumes semantic accent variables', () => {
  assert.doesNotMatch(renderer, /--green/);
  assert.match(renderer, /caretColor:\s*'var\(--accent-strong\)'/);
  assert.match(renderer, /backgroundColor:\s*'var\(--accent-strong\)'/);
});
