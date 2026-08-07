import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { ACCENT_THEMES } from '../src/appearance.js';

const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

function relativeLuminance([red, green, blue]) {
  return [red, green, blue]
    .map(channel => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(first, second) {
  const values = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('light-mode primary buttons meet WCAG AA for every accent', () => {
  const accentWeight = Number(styles.match(/data-color-mode="light"[\s\S]*?--accent-strong:\s*color-mix\(in srgb, var\(--accent\)\s*(\d+)%/)?.[1]);
  assert.ok(accentWeight > 0 && accentWeight < 100);

  for (const [name, theme] of Object.entries(ACCENT_THEMES)) {
    const accent = theme.color.match(/[a-f\d]{2}/gi).map(channel => Number.parseInt(channel, 16));
    const button = accent.map(channel => channel * accentWeight / 100);
    assert.ok(
      contrastRatio(button, [255, 255, 255]) >= 4.5,
      `${name} primary button must reach 4.5:1 against white text`,
    );
  }
});
