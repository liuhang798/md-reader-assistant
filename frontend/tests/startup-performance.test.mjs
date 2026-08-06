import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const renderer = await readFile(new URL('../src/renderer.js', import.meta.url), 'utf8');

test('CodeMirror loads only when editing starts', () => {
  assert.doesNotMatch(renderer, /^import .*from ['"](?:codemirror|@codemirror\/[^'"]+|@lezer\/highlight)['"];?$/m);
  assert.match(renderer, /import\('codemirror'\)/);
  assert.match(renderer, /async function toggleEditor[\s\S]*await initializeCodeEditor\(\)/);
  assert.doesNotMatch(renderer, /\ninitializeCodeEditor\(\);\ninitializePaneResizers\(\);/);
});

test('saved explorer folders restore after the first paint', () => {
  assert.match(renderer, /function restoreExplorerAfterFirstPaint\(savedRoot\)/);
  assert.match(renderer, /requestAnimationFrame\(\(\) => requestAnimationFrame\(async \(\) =>/);
  assert.match(renderer, /restoreExplorerAfterFirstPaint\(savedExplorerRoot\)/);
});
