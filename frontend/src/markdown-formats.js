const footnoteDefinitionPattern = /^\[\^([^\]]+)\]:\s*(.+)$/;

function replaceReferencesOutsideInlineCode(line, replaceReference) {
  return line
    .split(/(`+[^`]*?`+)/g)
    .map(part => part.startsWith('`') ? part : part.replace(/(?<!\\)\[\^([^\]]+)\]/g, replaceReference))
    .join('');
}

export function prepareFootnotes(source) {
  const lines = String(source).split('\n');
  const definitions = new Map();
  const contentLines = [];
  const lineMap = []; // 处理后第 n 行（0-based）对应源文档第 lineMap[n] 行（0-based）；定义行被移除
  let fence = '';

  for (let sourceIndex = 0; sourceIndex < lines.length; sourceIndex++) {
    const line = lines[sourceIndex];
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1][0];
      else if (fence === fenceMatch[1][0]) fence = '';
      contentLines.push(line);
      lineMap.push(sourceIndex);
      continue;
    }

    const definition = !fence && line.match(footnoteDefinitionPattern);
    if (definition) {
      definitions.set(definition[1], definition[2].trim());
      continue;
    }
    contentLines.push(line);
    lineMap.push(sourceIndex);
  }

  if (!definitions.size) return { markdown: String(source), notes: [], lineMap: null };

  const numbers = new Map();
  const referenceCounts = new Map();
  const referencedLabels = [];
  fence = '';
  const markdown = contentLines.map(line => {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1][0];
      else if (fence === fenceMatch[1][0]) fence = '';
      return line;
    }
    if (fence) return line;

    return replaceReferencesOutsideInlineCode(line, (raw, label) => {
      if (!definitions.has(label)) return raw;
      if (!numbers.has(label)) {
        numbers.set(label, numbers.size + 1);
        referencedLabels.push(label);
      }
      const number = numbers.get(label);
      const count = (referenceCounts.get(label) || 0) + 1;
      referenceCounts.set(label, count);
      return `<sup class="footnote-ref"><a id="fnref-${number}-${count}" href="#fn-${number}">${number}</a></sup>`;
    });
  }).join('\n');

  const unreferencedLabels = [...definitions.keys()].filter(label => !numbers.has(label));
  for (const label of unreferencedLabels) {
    numbers.set(label, numbers.size + 1);
    referencedLabels.push(label);
  }

  return {
    markdown,
    notes: referencedLabels.map(label => ({
      number: numbers.get(label),
      text: definitions.get(label),
      referenceCount: referenceCounts.get(label) || 0
    })),
    lineMap
  };
}

export function renderFootnoteSection(notes, parseInline, label) {
  if (!notes.length) return '';
  const items = notes.map(note => {
    const backlinks = Array.from({ length: note.referenceCount }, (_, index) =>
      `<a class="footnote-backref" href="#fnref-${note.number}-${index + 1}" aria-label="${label} ${note.number}">↩</a>`
    ).join(' ');
    return `<li id="fn-${note.number}">${parseInline(note.text)}${backlinks ? ` ${backlinks}` : ''}</li>`;
  }).join('');
  return `<section class="footnotes" aria-label="${label}"><hr><ol>${items}</ol></section>`;
}

export const highlightExtension = {
  name: 'highlight',
  level: 'inline',
  start(source) {
    return source.indexOf('==');
  },
  tokenizer(source) {
    const match = /^==(?=\S)([\s\S]*?\S)==/.exec(source);
    if (!match) return undefined;
    return {
      type: 'highlight',
      raw: match[0],
      text: match[1],
      tokens: this.lexer.inlineTokens(match[1])
    };
  },
  renderer(token) {
    return `<mark class="markdown-highlight">${this.parser.parseInline(token.tokens)}</mark>`;
  }
};

export function nextFootnoteNumber(source) {
  const numbers = [...String(source).matchAll(/\[\^(\d+)\]/g)].map(match => Number(match[1]));
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

export function escapeMarkdownText(value) {
  return String(value).replace(/([\\`*_[\]{}()#+\-.!>|])/g, '\\$1');
}
