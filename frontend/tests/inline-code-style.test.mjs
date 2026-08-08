import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('reading and live-preview inline code has no filled background', () => {
  const rule = styles.match(/\.markdown-body code:not\(\.hljs\)\s*\{([^}]*)\}/s)?.[1];

  assert.ok(rule, 'the inline-code style rule should exist');
  assert.match(rule, /background:\s*transparent\s*;/);
  assert.match(rule, /padding:\s*0\s*;/);
});
