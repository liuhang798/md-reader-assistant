import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { marked } from 'marked';
import { escapeMarkdownText, highlightExtension, nextFootnoteNumber, prepareFootnotes, renderFootnoteSection } from '../src/markdown-formats.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const renderer = await readFile(new URL('../src/renderer.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('format toolbar exposes all six headings and the missing practical Markdown formats', () => {
  for (const heading of ['# ', '## ', '### ', '#### ', '##### ', '###### ']) {
    assert.ok(html.includes(`value="${heading}"`), heading);
  }
  for (const command of [
    'strikethrough', 'highlight', 'horizontal-rule', 'underline', 'superscript', 'subscript',
    'hard-break', 'footnote', 'reference-link', 'collapsible', 'keyboard-key', 'comment',
    'bold-italic', 'autolink', 'escape', 'html-block'
  ]) {
    assert.match(html, new RegExp(`(?:data-format|value)="${command}"`), command);
    assert.ok(renderer.includes(`command === '${command}'`) || renderer.includes(`runFormatCommand('${command}')`), command);
  }
});

test('toolbar hides overflow and dynamically mirrors collapsed commands into More Formats', () => {
  assert.match(styles, /\.editor-format-bar\s*\{[^}]*overflow:\s*hidden/s);
  assert.doesNotMatch(styles, /\.editor-format-bar\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(html, /id="overflowFormatGroup"/);
  assert.match(html, /data-overflow-priority="\d+"/);
  assert.match(renderer, /new ResizeObserver\(scheduleFormatToolbarLayout\)/);
  assert.match(renderer, /bar\.scrollWidth <= bar\.clientWidth \+ 1/);
  assert.match(renderer, /rebuildOverflowFormatOptions\(\)/);
});

test('double equals syntax renders a semantic highlight', () => {
  marked.use({ extensions: [highlightExtension] });
  assert.match(marked.parse('Read ==this **carefully**==.'), /<mark class="markdown-highlight">this <strong>carefully<\/strong><\/mark>/);
  assert.match(styles, /\.markdown-body mark\.markdown-highlight\s*\{/);
});

test('footnotes keep fenced code untouched and render linked notes', () => {
  const prepared = prepareFootnotes('Text[^1].\n\n```md\ninside[^1]\n```\n\n[^1]: **Note**');

  assert.match(prepared.markdown, /id="fnref-1-1"/);
  assert.match(prepared.markdown, /inside\[\^1\]/);
  assert.doesNotMatch(prepared.markdown, /\[\^1\]:/);
  assert.deepEqual(prepared.notes, [{ number: 1, text: '**Note**', referenceCount: 1 }]);
  assert.match(renderFootnoteSection(prepared.notes, text => marked.parseInline(text), 'Footnotes'), /<strong>Note<\/strong>/);
});

test('new footnotes use the next available numeric label', () => {
  assert.equal(nextFootnoteNumber('A[^1] B[^3]\n\n[^1]: one'), 4);
  assert.equal(nextFootnoteNumber('No notes'), 1);
});

test('Markdown punctuation can be escaped without altering ordinary text', () => {
  assert.equal(escapeMarkdownText('*bold* [link](url)'), '\\*bold\\* \\[link\\]\\(url\\)');
  assert.equal(escapeMarkdownText('plain text'), 'plain text');
});
