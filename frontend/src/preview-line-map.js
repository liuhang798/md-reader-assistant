// 从 Markdown 源码中扫描“顶层块”的起始行号（1-based）。
//
// 用途：编辑模式下根据 CodeMirror 光标行号，在左侧预览中定位对应块，
// 实现“光标实时定位预览”（编辑/预览滚动同步）。
//
// 设计说明：这里的切分不需要与 marked 的块解析逐字节一致，只需保证
//   (a) 渲染为独立顶层元素的每个块，其第一行都被标记；
//   (b) 顶层元素数量与块数量大致一致（偏差过大时 renderer.js 会放弃注入）。
// 切分偏粗（例如整个表格算一个块）不会破坏定位，因为定位依据是
// “最后一个起始行 <= 光标行的块”。

const HR_RE = /^ {0,3}(?:[-*_])(?:[ \t]*[-*_]){2,}[ \t]*$/;
const ATX_HEADING_RE = /^ {0,3}#{1,6}(?:\s|$)/;
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
const LIST_ITEM_RE = /^ {0,3}(?:[-+*]|\d+[.)])\s+\S/;
const QUOTE_RE = /^ {0,3}>/;
const LINK_DEF_RE = /^ {0,3}\[[^\]]+\]:\s*\S/;
const BLOCK_HTML_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'body', 'caption', 'center', 'col', 'colgroup',
  'dd', 'details', 'dialog', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer',
  'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html', 'iframe',
  'legend', 'li', 'link', 'main', 'menu', 'menuitem', 'nav', 'ol', 'optgroup', 'option', 'p',
  'param', 'pre', 'script', 'section', 'style', 'summary', 'table', 'tbody', 'td', 'tfoot',
  'th', 'thead', 'title', 'tr', 'track', 'ul'
]);

function blockHtmlStart(line) {
  const match = line.match(/^ {0,3}<([a-zA-Z][a-zA-Z0-9-]*)(?:\s|>)/);
  return match && BLOCK_HTML_TAGS.has(match[1]) ? match[1] : null;
}

/**
 * 返回每个顶层块的起始行号数组（1-based，单调递增）。
 * @param {string} markdown
 * @returns {number[]}
 */
export function scanMarkdownBlockStartLines(markdown) {
  const lines = String(markdown).split('\n');
  const starts = [];
  const len = lines.length;
  let i = 0;

  while (i < len) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    // 引用链接定义（marked 不渲染输出，跳过以免与顶层元素错位）
    if (LINK_DEF_RE.test(line)) { i++; continue; }

    starts.push(i + 1);

    // 围栏代码块
    const fence = line.match(FENCE_RE);
    if (fence) {
      const char = fence[1][0];
      const close = new RegExp(`^ {0,3}${char}{3,}\\s*$`);
      let j = i + 1;
      while (j < len && !close.test(lines[j])) j++;
      i = j + 1;
      continue;
    }

    // 缩进代码块（4 空格）
    if (/^ {4,}\S/.test(line)) {
      let j = i + 1;
      while (j < len && (/^ {4,}\S/.test(lines[j]) || !lines[j].trim())) j++;
      i = j;
      continue;
    }

    // ATX 标题
    if (ATX_HEADING_RE.test(line)) { i++; continue; }

    // Setext 标题（当前行是文本，下一行是 === 或 ---；当前行不能是分隔线）
    if (i + 1 < len && /^ {0,3}(=+|-+)\s*$/.test(lines[i + 1]) && !HR_RE.test(line)) {
      i += 2;
      continue;
    }

    // 分隔线
    if (HR_RE.test(line)) { i++; continue; }

    // HTML 注释块
    if (/^ {0,3}<!--/.test(line)) {
      if (line.includes('-->')) { i++; continue; } // 同行闭合
      let j = i + 1;
      while (j < len && !lines[j].includes('-->')) j++;
      i = j + 1;
      continue;
    }

    // 引用块（lazy continuation；空行后的新引用行另起一块）
    if (QUOTE_RE.test(line)) {
      let j = i + 1;
      let blanks = 0;
      while (j < len) {
        const l = lines[j];
        if (!l.trim()) { blanks++; j++; continue; }
        if (QUOTE_RE.test(l)) {
          if (blanks > 0) break;
          blanks = 0; j++; continue;
        }
        if (LIST_ITEM_RE.test(l)) break; // 引用后的新列表块
        if (FENCE_RE.test(l) || ATX_HEADING_RE.test(l) || HR_RE.test(l)) break;
        if (/^ {4,}\S/.test(l)) {
          if (blanks > 0) break; // 空行后的缩进 = 新代码块
          blanks = 0; j++; continue;
        }
        if (blockHtmlStart(l) || /^ {0,3}<!--/.test(l)) break;
        if (blanks > 0) break; // 空行后的普通文本 = 新段落
        blanks = 0; j++; // lazy continuation
      }
      i = j;
      continue;
    }

    // 列表（含嵌套项、缩进代码、lazy continuation；跨空行保持同一列表）
    if (LIST_ITEM_RE.test(line)) {
      let j = i + 1;
      let blanks = 0;
      while (j < len) {
        const l = lines[j];
        if (!l.trim()) { blanks++; j++; continue; }
        if (LIST_ITEM_RE.test(l)) { blanks = 0; j++; continue; }
        if (/^ {1,}\S/.test(l)) { blanks = 0; j++; continue; } // 嵌套项 / 缩进代码 / lazy 文本
        if (QUOTE_RE.test(l)) {
          if (blanks > 0) break; // 空行后的引用 = 新块
          blanks = 0; j++; continue; // 无空行的嵌套引用仍属于列表
        }
        if (FENCE_RE.test(l) || ATX_HEADING_RE.test(l) || HR_RE.test(l)) break;
        if (blockHtmlStart(l) || /^ {0,3}<!--/.test(l)) break;
        if (blanks > 0) break; // 空行后的 0 缩进文本 = 新段落
        blanks = 0; j++; // lazy continuation
      }
      i = j;
      continue;
    }

    // 表格（带前导 | 的常见表格；无前导 | 的表格会按段落合并，定位依然正确）
    if (i + 1 < len && /^ {0,3}\|/.test(line)
      && /^ {0,3}\|?[\s:|-]+\|?[\s:|-]*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      let j = i + 1;
      while (j < len && /^ {0,3}\|/.test(lines[j]) && lines[j].trim()) j++;
      i = j;
      continue;
    }

    // 块级 HTML
    const htmlTag = blockHtmlStart(line);
    if (htmlTag) {
      const close = new RegExp(`</${htmlTag}\\s*>`);
      if (close.test(line)) { i++; continue; } // 同行闭合
      let j = i + 1;
      while (j < len && !close.test(lines[j])) j++;
      i = j + 1;
      continue;
    }

    // 段落 / 其他：连续非空行，直到空行或新的块起始
    let j = i + 1;
    while (j < len) {
      const l = lines[j];
      if (!l.trim()) break;
      if (LIST_ITEM_RE.test(l) || QUOTE_RE.test(l) || FENCE_RE.test(l) || ATX_HEADING_RE.test(l) || HR_RE.test(l)) break;
      if (blockHtmlStart(l) || /^ {0,3}<!--/.test(l)) break;
      j++;
    }
    i = j;
  }

  return starts;
}
