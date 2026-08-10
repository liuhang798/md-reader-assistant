import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filesFromPreferencePaths,
  normalizeSidebarMode,
  sameDocumentPath,
} from '../src/library-state.js';

test('normalizeSidebarMode keeps each supported library view', () => {
  assert.equal(normalizeSidebarMode('recent'), 'recent');
  assert.equal(normalizeSidebarMode('favorites'), 'favorites');
  assert.equal(normalizeSidebarMode('explorer'), 'explorer');
  assert.equal(normalizeSidebarMode('unknown'), 'recent');
});

test('filesFromPreferencePaths preserves unavailable documents', () => {
  const files = filesFromPreferencePaths(
    ['C:\\Docs\\kept.md', 'C:\\Docs\\moved.md'],
    [
      { path: 'C:\\Docs\\kept.md', exists: true },
      { path: 'C:\\Docs\\moved.md', exists: false },
    ],
  );

  assert.deepEqual(files, [
    { path: 'C:\\Docs\\kept.md', name: 'kept.md', directory: null, exists: true },
    { path: 'C:\\Docs\\moved.md', name: 'moved.md', directory: null, exists: false },
  ]);
});

test('sameDocumentPath compares Windows separators and casing safely', () => {
  assert.equal(sameDocumentPath('C:\\Docs\\Guide.md', 'c:/docs/guide.md'), true);
  assert.equal(sameDocumentPath('C:\\Docs\\Guide.md', 'C:\\Docs\\Other.md'), false);
  assert.equal(sameDocumentPath('', ''), false);
});
