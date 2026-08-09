import assert from 'node:assert/strict';
import test from 'node:test';

let appearance = {};
try {
  appearance = await import('../src/appearance.js');
} catch {
  // The first TDD run intentionally reaches this branch before the module exists.
}

class MemoryStorage {
  constructor(values = {}) {
    this.values = new Map(Object.entries(values));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

test('empty appearance storage defaults to green light and persists both values', () => {
  const storage = new MemoryStorage();

  const result = appearance.readAppearanceStorage?.(storage);

  assert.deepEqual(result, { accentTheme: 'green', colorMode: 'light' });
  assert.equal(storage.getItem('accentTheme'), 'green');
  assert.equal(storage.getItem('colorMode'), 'light');
});
test('legacy bundled themes migrate to the closest independent combination', () => {
  const cases = [
    ['light', 'green', 'light'],
    ['classic-light', 'green', 'light'],
    ['wechat-green', 'green', 'light'],
    ['dark', 'green', 'dark'],
    ['classic-dark', 'green', 'dark'],
    ['alipay-blue', 'blue', 'light'],
    ['wisteria', 'violet', 'light'],
    ['amber-paper', 'orange', 'light'],
    ['deep-ocean', 'cyan', 'dark'],
    ['amethyst-night', 'violet', 'dark'],
  ];

  for (const [legacy, accentTheme, colorMode] of cases) {
    const storage = new MemoryStorage({ theme: legacy });
    assert.deepEqual(
      appearance.readAppearanceStorage?.(storage),
      { accentTheme, colorMode },
      legacy,
    );
  }
});

test('a saved new appearance value is not overwritten by legacy theme migration', () => {
  const storage = new MemoryStorage({
    accentTheme: 'coral',
    theme: 'amethyst-night',
  });

  const result = appearance.readAppearanceStorage?.(storage);

  assert.deepEqual(result, { accentTheme: 'coral', colorMode: 'dark' });
  assert.equal(storage.getItem('accentTheme'), 'coral');
  assert.equal(storage.getItem('colorMode'), 'dark');
});

test('invalid new appearance values fall back independently to green and light', () => {
  const storage = new MemoryStorage({
    accentTheme: 'neon-rainbow',
    colorMode: 'sepia',
  });

  assert.deepEqual(
    appearance.readAppearanceStorage?.(storage),
    { accentTheme: 'green', colorMode: 'light' },
  );
});

test('system appearance maps directly to light and dark color modes', () => {
  assert.equal(appearance.colorModeFromSystem?.(false), 'light');
  assert.equal(appearance.colorModeFromSystem?.(true), 'dark');
});

test('macOS temporary mode overrides the current system appearance only when present', () => {
  assert.equal(appearance.resolveMacColorMode?.(false), 'light');
  assert.equal(appearance.resolveMacColorMode?.(true), 'dark');
  assert.equal(appearance.resolveMacColorMode?.(false, 'dark'), 'dark');
  assert.equal(appearance.resolveMacColorMode?.(true, 'light'), 'light');
});

test('macOS toggle keeps only a mode that differs from the current system appearance', () => {
  assert.equal(appearance.temporaryMacColorModeAfterToggle?.('light', false), 'dark');
  assert.equal(appearance.temporaryMacColorModeAfterToggle?.('dark', false), null);
  assert.equal(appearance.temporaryMacColorModeAfterToggle?.('dark', true), 'light');
  assert.equal(appearance.temporaryMacColorModeAfterToggle?.('light', true), null);
});
