import test from 'node:test';
import assert from 'node:assert/strict';
import { marked } from 'marked';
import { mathExtensions, renderLatex } from '../src/math-rendering.js';

marked.use({ extensions: mathExtensions });

test('renders Typora-style inline and display LaTeX', () => {
  const html = marked.parse('质能方程 $E = mc^2$。\n\n$$\n\\frac{a}{b}\n$$');
  assert.match(html, /class="math-inline"/);
  assert.match(html, /class="math-block"/);
  assert.match(html, /data-math-source="E%20%3D%20mc%5E2"/);
  assert.match(html, /data-math-source="%5Cfrac%7Ba%7D%7Bb%7D"/);
  assert.match(html, /katex/);
  assert.match(html, /mfrac/);
});

test('supports LaTeX parenthesis and bracket delimiters', () => {
  const html = marked.parse('Inline \\(x + y\\).\n\n\\[\nx^2 + y^2\n\\]');
  assert.match(html, /class="math-inline"/);
  assert.match(html, /class="math-block"/);
});

test('keeps currency and invalidly spaced delimiters as plain text', () => {
  const html = marked.parse('Price is $2 and tax is $10. Keep $ x $ unchanged.');
  assert.doesNotMatch(html, /class="math-inline"/);
  assert.match(html, /\$2/);
  assert.match(html, /\$10/);
});

test('renders chemistry through mhchem', () => {
  const html = marked.parse('Reaction $\\ce{2H2 + O2 -> 2H2O}$.');
  assert.match(html, /class="math-inline"/);
  assert.match(html, /\\ce\{2H2 \+ O2/);
  assert.match(html, /<mover>/);
  assert.match(html, /2H/);
});

test('renders manual equation numbers with tag', () => {
  const html = marked.parse('$$\nE = mc^2 \\tag{1}\n$$');
  assert.match(html, /class="tag"/);
  assert.match(html, /\(1\)/);
});

test('invalid LaTeX is rendered as a visible, safe error instead of throwing', () => {
  assert.doesNotThrow(() => renderLatex('\\notARealCommand{', false));
  assert.match(renderLatex('\\notARealCommand{', false), /katex-error/);
});
