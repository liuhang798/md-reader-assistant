import assert from 'node:assert/strict';
import test from 'node:test';
import { marked } from 'marked';
import { scanMarkdownBlockStartLines } from '../src/preview-line-map.js';
import { prepareFootnotes } from '../src/markdown-formats.js';

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

// 统计 marked.parse 输出中真正“顶层”元素的数量（用于与扫描块数对齐）。
function countTopLevel(html) {
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)(?:\s[^>]*)?>/g;
  const stack = [];
  let count = 0;
  let match;
  while ((match = tagRe.exec(html))) {
    const full = match[0];
    const tag = match[1];
    if (full.startsWith('</')) {
      stack.pop();
      if (stack.length === 0) count++;
    } else if (!full.endsWith('/>')) {
      if (VOID_TAGS.has(tag)) {
        if (stack.length === 0) count++;
      } else {
        stack.push(tag);
      }
    }
  }
  return count;
}

// 断言：扫描出的块数应与 marked 渲染后的顶层元素数一致（允许 1 个偏差）。
function assertAligned(markdown, expectedStarts) {
  const starts = scanMarkdownBlockStartLines(markdown);
  assert.deepEqual(starts, expectedStarts);
  const rendered = marked.parse(markdown);
  const top = countTopLevel(rendered);
  assert.ok(
    Math.abs(top - starts.length) <= 1,
    `block count ${starts.length} vs rendered top-level ${top} for:\n${markdown}`
  );
}

test('headings and paragraphs produce one block each', () => {
  assertAligned('# Title\n\nFirst paragraph.\n\n## Subtitle\n\nSecond paragraph.\n', [1, 3, 5, 7]);
});

test('list items, nested items and lazy continuation stay in one block', () => {
  assertAligned('- one\n- two\n  - nested\n- three\ncontinuation line\n\n- four\n', [1]);
});

test('lists keep blank-line separated items together but end before a paragraph', () => {
  assertAligned('- a\n- b\n\npara after\n', [1, 4]);
});

test('fenced code is a single block and hides inner markdown', () => {
  assertAligned('Before.\n\n```js\n# not heading\n- not list\n```\n\nAfter.\n', [1, 3, 8]);
});

test('an unclosed fence still produces one block', () => {
  assertAligned('```js\nunclosed\n', [1]);
});

test('blockquotes with lazy continuation, split by a blank line', () => {
  assertAligned('> quote one\n> quote two\ncontinued lazy\n\n> another quote\n\nPlain after.\n', [1, 5, 7]);
});

test('a blockquote ends before indented code after a blank line', () => {
  assertAligned('> a\n\n    code\n', [1, 3]);
});

test('a nested quote inside a list stays part of the list', () => {
  assertAligned('- a\n> b\n', [1]);
});

test('a table renders as one block', () => {
  assertAligned('| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n', [1]);
});

test('setext headings and horizontal rules are separate blocks', () => {
  assertAligned('Title\n=====\n\ntext\n\n---\n\nmore\n', [1, 4, 6, 8]);
});

test('link reference definitions are skipped because they render nothing', () => {
  const md = 'para one\n\n[ref]: http://example.com\n\npara two\n';
  const starts = scanMarkdownBlockStartLines(md);
  assert.deepEqual(starts, [1, 5]);
  assert.equal(countTopLevel(marked.parse(md)), 2);
});

test('block HTML and comments map to their own blocks', () => {
  assertAligned('para\n\n<div>box</div>\n\n<!-- note -->\n\nmore\n', [1, 3, 5, 7]);
});

test('indented code lines inside a paragraph do not split the block', () => {
  assertAligned('text\n    code line\nmore text\n', [1]);
});

test('indented code after a blank line becomes its own block', () => {
  assertAligned('text\n\n    code\nmore\n', [1, 3, 4]);
});

test('source line numbers account for removed footnote definitions', () => {
  const md = 'Text[^1].\n\nmore text\n\n[^1]: note\n';
  const prepared = prepareFootnotes(md);
  const starts = scanMarkdownBlockStartLines(prepared.markdown);
  const sourceLines = starts.map(line => prepared.lineMap[line - 1] + 1);
  assert.deepEqual(sourceLines, [1, 3]);
  // 脚注定义行被移除后，lineMap 仍能映射回源行号
  assert.notEqual(prepared.lineMap, null);
});

test('prepareFootnotes without definitions keeps a null line map', () => {
  const prepared = prepareFootnotes('plain text\n\nno footnotes\n');
  assert.equal(prepared.lineMap, null);
});
