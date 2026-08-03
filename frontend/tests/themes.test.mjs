import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const renderer = await readFile(new URL('../src/renderer.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

const themeIds = [
  'classic-light',
  'classic-dark',
  'wechat-green',
  'alipay-blue',
  'wisteria',
  'amber-paper',
  'deep-ocean',
  'amethyst-night'
];

test('theme registry exposes exactly eight persistent themes', () => {
  for (const id of themeIds) {
    assert.match(renderer, new RegExp(`['"]${id}['"]\\s*:`));
  }
  assert.match(renderer, /theme:\s*normalizeTheme\(localStorage\.getItem\('theme'\)\)/);
  assert.match(renderer, /localStorage\.setItem\('theme', state\.theme\)/);
  assert.match(renderer, /THEMES\[state\.theme\]\.mode === 'dark'/);
});

test('legacy and unknown theme values have explicit migration rules', () => {
  assert.match(renderer, /if \(theme === 'light'\) return 'classic-light'/);
  assert.match(renderer, /if \(theme === 'dark'\) return 'classic-dark'/);
  assert.match(renderer, /return THEMES\[theme\] \? theme : 'classic-light'/);
});

test('theme names are bilingual and Chinese display names have four characters', () => {
  for (const name of ['经典浅色', '经典深色', '青翠新语', '云海湛蓝', '紫藤雾色', '琥珀书页', '深海夜航', '墨夜紫晶']) {
    assert.equal([...name].length, 4);
    assert.match(renderer, new RegExp(name));
  }
  for (const name of ['Classic Light', 'Classic Dark', 'Verdant Voice', 'Azure Cloud', 'Wisteria Mist', 'Amber Paper', 'Deep Ocean', 'Amethyst Night']) {
    assert.match(renderer, new RegExp(name));
  }
});

test('all themes have CSS palettes and an accessible chooser', () => {
  for (const id of themeIds.slice(1)) {
    assert.match(styles, new RegExp(`data-theme=["']${id}["']`));
  }
  assert.match(html, /id="themeMenu"[^>]*role="menu"/);
  for (const id of themeIds) {
    assert.match(html, new RegExp(`data-theme-option="${id}"`));
  }
  assert.match(html, /id="themeButton"[^>]*aria-haspopup="menu"/);
  assert.match(html, /id="themeButton"[^>]*data-i18n-aria-label="themeTitle"/);
});

test('theme chooser applies a selection and keeps its accessibility state in sync', () => {
  assert.match(renderer, /setTheme\(button\.dataset\.themeOption\)/);
  assert.match(renderer, /button\.setAttribute\('aria-checked', String\(active\)\)/);
  assert.match(renderer, /THEMES\[button\.dataset\.themeOption\]\?\.\[state\.language === 'en' \? 'en' : 'zhCN'\]/);
});
