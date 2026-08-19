import katex from 'katex';
import 'katex/contrib/mhchem';

const blockDelimiters = [
  {
    start: '$$',
    multiline: /^ {0,3}\$\$[ \t]*\n([\s\S]*?)\n {0,3}\$\$[ \t]*(?:\n|$)/,
    singleline: /^ {0,3}\$\$(?!\$)([^\n]*?)(?<!\\)\$\$[ \t]*(?:\n|$)/,
  },
  {
    start: '\\[',
    multiline: /^ {0,3}\\\[[ \t]*\n([\s\S]*?)\n {0,3}\\\][ \t]*(?:\n|$)/,
    singleline: /^ {0,3}\\\[([^\n]*?)\\\][ \t]*(?:\n|$)/,
  },
];

function escapedAt(source, index) {
  let slashes = 0;
  for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor--) slashes++;
  return slashes % 2 === 1;
}

function inlineDollarMatch(source) {
  if (!source.startsWith('$') || source.startsWith('$$') || /[\s\t]/.test(source[1] || '')) return undefined;
  for (let index = 1; index < source.length && source[index] !== '\n'; index++) {
    if (source[index] !== '$' || escapedAt(source, index)) continue;
    const previous = source[index - 1];
    const next = source[index + 1] || '';
    if (/\s/.test(previous) || previous === '\\' || /\d/.test(next)) continue;
    return { raw: source.slice(0, index + 1), text: source.slice(1, index) };
  }
  return undefined;
}

function inlineLatexDelimiterMatch(source) {
  if (!source.startsWith('\\(')) return undefined;
  for (let index = 2; index < source.length && source[index] !== '\n'; index++) {
    if (source[index] === '\\' && source[index + 1] === ')' && !escapedAt(source, index)) {
      return { raw: source.slice(0, index + 2), text: source.slice(2, index) };
    }
  }
  return undefined;
}

function firstUnescapedInlineDelimiter(source) {
  for (let index = 0; index < source.length; index++) {
    if (source[index] === '$' && !escapedAt(source, index) && source[index + 1] !== '$') return index;
    if (source[index] === '\\' && source[index + 1] === '(' && !escapedAt(source, index)) return index;
  }
  return -1;
}

function encodedMathSource(source) {
  return encodeURIComponent(String(source).trim());
}

export function renderLatex(source, displayMode = false) {
  return katex.renderToString(String(source).trim(), {
    displayMode,
    throwOnError: false,
    strict: 'ignore',
    trust: false,
    output: 'htmlAndMathml',
    maxExpand: 1000,
    maxSize: 20,
  });
}

export const mathBlockExtension = {
  name: 'mathBlock',
  level: 'block',
  start(source) {
    const indexes = [source.search(/^ {0,3}\$\$/m), source.search(/^ {0,3}\\\[/m)]
      .filter(index => index >= 0);
    return indexes.length ? Math.min(...indexes) : undefined;
  },
  tokenizer(source) {
    for (const delimiter of blockDelimiters) {
      const match = delimiter.multiline.exec(source) || delimiter.singleline.exec(source);
      if (!match) continue;
      return { type: 'mathBlock', raw: match[0], text: match[1] };
    }
    return undefined;
  },
  renderer(token) {
    return `<div class="math-block" role="math" data-math-source="${encodedMathSource(token.text)}">${renderLatex(token.text, true)}</div>`;
  },
};

export const mathInlineExtension = {
  name: 'mathInline',
  level: 'inline',
  start(source) {
    const index = firstUnescapedInlineDelimiter(source);
    return index >= 0 ? index : undefined;
  },
  tokenizer(source) {
    const match = inlineDollarMatch(source) || inlineLatexDelimiterMatch(source);
    if (!match) return undefined;
    return { type: 'mathInline', raw: match.raw, text: match.text };
  },
  renderer(token) {
    return `<span class="math-inline" role="math" data-math-source="${encodedMathSource(token.text)}">${renderLatex(token.text, false)}</span>`;
  },
};

export const mathExtensions = [mathBlockExtension, mathInlineExtension];
