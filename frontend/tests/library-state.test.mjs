import test from 'node:test';
import assert from 'node:assert/strict';

import {
  directoryFromDocumentPath,
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
    { path: 'C:\\Docs\\kept.md', name: 'kept.md', directory: 'C:\\Docs', exists: true },
    { path: 'C:\\Docs\\moved.md', name: 'moved.md', directory: 'C:\\Docs', exists: false },
  ]);
});

test('directoryFromDocumentPath supports Windows and Unix paths', () => {
  assert.equal(directoryFromDocumentPath('D:\\wechat_files\\2026-08\\note.md'), 'D:\\wechat_files\\2026-08');
  assert.equal(directoryFromDocumentPath('/Users/demo/Documents/note.md'), '/Users/demo/Documents');
  assert.equal(directoryFromDocumentPath('note.md'), '.');
});

test('sameDocumentPath compares Windows separators and casing safely', () => {
  assert.equal(sameDocumentPath('C:\\Docs\\Guide.md', 'c:/docs/guide.md'), true);
  assert.equal(sameDocumentPath('C:\\Docs\\Guide.md', 'C:\\Docs\\Other.md'), false);
  assert.equal(sameDocumentPath('', ''), false);
});
