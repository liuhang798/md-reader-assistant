import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { ACCENT_THEMES } from '../src/appearance.js';

const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const renderer = await readFile(new URL('../src/renderer.js', import.meta.url), 'utf8');

const accentIds = ['green', 'blue', 'orange', 'violet', 'coral', 'cyan', 'slate', 'clay'];
const expectedColors = {
  green: '#159A63',
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
  const accentMenu = html.match(/<div id="accentMenu"[\s\S]*?<\/div>\s*<\/div>/)?.[0] ?? '';
  assert.equal((accentMenu.match(/role="menuitemradio"/g) ?? []).length, 8);
  assert.equal((accentMenu.match(/aria-checked="false"/g) ?? []).length, 8);
});

test('all in-app brand images participate in runtime accent switching', () => {
  const brandImages = [...html.matchAll(/<img\s+[^>]*src="\/src\/assets\/images\/app-logo\.png"[^>]*>/g)];
  assert.ok(brandImages.length >= 3);
  for (const [image] of brandImages) assert.match(image, /data-themed-logo/);
});

test('title bar uses a borderless theme-colored open-book mark', () => {
  const brandMark = html.match(/<span class="brand-mark">[\s\S]*?<\/span>/)?.[0] ?? '';
  assert.match(brandMark, /<svg class="brand-book-mark"/);
  assert.doesNotMatch(brandMark, /<img\b/);
  assert.match(styles, /\.brand-mark\s*\{[^}]*color:\s*var\(--accent\);/s);
  assert.match(styles, /\.brand-book-mark\s*\{[^}]*stroke:\s*currentColor;/s);
  assert.doesNotMatch(styles, /\.brand-mark\s*\{[^}]*(?:background|border|box-shadow):/s);
});

test('title-bar book mark and product name share the same vertical height', () => {
  assert.match(styles, /\.brand\s*\{[^}]*align-items:\s*center;[^}]*line-height:\s*21px;/s);
  assert.match(styles, /\.brand-mark\s*\{[^}]*width:\s*21px;[^}]*height:\s*21px;[^}]*align-self:\s*center;/s);
  assert.match(styles, /\.brand-mark\s*\{[^}]*transform:\s*translateY\(2px\);/s);
  assert.match(styles, /data-platform="darwin"[^\n]*\.brand\s*\{[^}]*line-height:\s*19px;/s);
  assert.match(styles, /data-platform="darwin"[^\n]*\.brand-mark\s*\{[^}]*width:\s*19px;[^}]*height:\s*19px;/s);
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

test('default green uses the exact approved color without automatic darkening', () => {
  assert.match(
    styles,
    /data-accent=["']green["'][^{]*\{[^}]*--accent:\s*#159A63;[^}]*--accent-strong:\s*#159A63;[^}]*--accent-contrast:\s*#ffffff;/s,
  );
});

test('dark mode alone controls sun and moon icon visibility', () => {
  assert.match(styles, /data-color-mode=["']dark["'][^{]*\.sun-icon/);
  assert.match(styles, /data-color-mode=["']dark["'][^{]*\.moon-icon/);
  assert.doesNotMatch(styles, /data-accent=[^\n]*\.sun-icon/);
});

test('macOS allows a temporary override and resumes following at the next system appearance change', () => {
  assert.match(renderer, /window\.matchMedia\('\(prefers-color-scheme: dark\)'\)/);
  assert.match(renderer, /macSystemColorScheme\.addEventListener\('change', handleSystemColorModeChange\)/);
  assert.match(renderer, /temporaryMacColorModeAfterToggle\(state\.colorMode, macSystemColorScheme\.matches\)/);
  assert.match(renderer, /setColorMode\(nextMode, false\)/);
  assert.match(renderer, /handleSystemColorModeChange = \(\) => syncMacSystemColorMode\(true\)/);
  assert.match(renderer, /if \(clearTemporaryOverride\) macTemporaryColorMode = null/);
  assert.match(renderer, /setColorMode\(state\.colorMode === 'dark' \? 'light' : 'dark'\)/);
});

test('toolbar icon keyboard focus uses the selected accent instead of browser default', () => {
  assert.match(styles, /\.icon-button:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)/s);
});

test('selected sidebar document has a theme-colored frame without changing its size', () => {
  assert.match(styles, /\.file-item\.active\s*\{[^}]*box-shadow:\s*inset 0 0 0 1px var\(--accent\)/s);
});

test('prominent accent surfaces use no drop shadows', () => {
  assert.doesNotMatch(styles, /\.brand-mark\s*\{[^}]*box-shadow/s);
  assert.match(styles, /\.primary\s*\{/);
  assert.doesNotMatch(styles, /\.primary\s*\{[^}]*box-shadow/s);
  assert.doesNotMatch(styles, /\.leaf-float\s*\{[^}]*box-shadow/s);
  assert.doesNotMatch(styles, /\.back-to-top\s*\{[^}]*box-shadow/s);
  assert.doesNotMatch(styles, /\.sidebar-tab\.active\s*\{[^}]*box-shadow/s);
});

test('CodeMirror consumes semantic accent variables', () => {
  assert.doesNotMatch(renderer, /--green/);
  assert.match(renderer, /caretColor:\s*'var\(--accent-strong\)'/);
  assert.match(renderer, /backgroundColor:\s*'var\(--accent-strong\)'/);
});
