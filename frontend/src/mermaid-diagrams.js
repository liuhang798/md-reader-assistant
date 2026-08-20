import DOMPurify from 'dompurify';

let renderSequence = 0;
let renderQueue = Promise.resolve();
let enginePromise = null;
let configuredEngine = null;
let configuredThemeSignature = '';
const renderGenerations = new WeakMap();
const resolvedColorCache = new Map();
const DIAGRAM_FONT_FAMILY = '"Segoe UI", "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';
// Categorical charts must remain distinguishable regardless of the selected
// application accent. These Tableau-inspired colours have clearly separated
// hues and work on both light and dark diagram surfaces.
const PIE_COLORS = [
  '#4E79A7', '#F28E2B', '#E15759', '#76B7B2',
  '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7',
  '#9C755F', '#BAB0AC', '#17BECF', '#8CD17D'
];

function byteToHex(value) {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
}

function mermaidColor(rawValue, fallback) {
  const raw = String(rawValue || '').trim();
  if (!raw) return fallback;
  if (resolvedColorCache.has(raw)) return resolvedColorCache.get(raw);

  // Mermaid's colour parser only accepts traditional colour formats. The app
  // theme intentionally uses modern CSS such as color-mix(), so ask the
  // browser to resolve it and read the final sRGB pixel before configuring
  // Mermaid. This also covers nested var(), named colours and display-p3.
  const probe = document.createElement('span');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;color:#010203';
  probe.style.color = raw;
  (document.body || document.documentElement).appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return fallback;
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = '#010203';
  context.fillStyle = resolved;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  if (!alpha) return fallback;
  const value = `#${byteToHex(red)}${byteToHex(green)}${byteToHex(blue)}`.toUpperCase();
  resolvedColorCache.set(raw, value);
  return value;
}

function diagramTheme() {
  const root = getComputedStyle(document.documentElement);
  const dark = document.documentElement.dataset.colorMode === 'dark';
  const colorNames = ['--accent-soft', '--text', '--accent', '--muted', '--panel', '--paper', '--line', '--accent-strong'];
  const rawColors = Object.fromEntries(colorNames.map(name => [name, root.getPropertyValue(name).trim()]));
  const color = (name, fallback) => mermaidColor(root.getPropertyValue(name), fallback);
  const pieVariables = Object.fromEntries(PIE_COLORS.map((value, index) => [`pie${index + 1}`, value]));
  return {
    signature: `${dark ? 'dark' : 'light'}|${colorNames.map(name => rawColors[name]).join('|')}`,
    name: dark ? 'dark' : 'base',
    variables: {
      fontFamily: DIAGRAM_FONT_FAMILY,
      fontSize: '14px',
      primaryColor: color('--accent-soft', dark ? '#203C31' : '#E7F5EE'),
      primaryTextColor: color('--text', dark ? '#E7ECE9' : '#1F2924'),
      primaryBorderColor: color('--accent', '#159A63'),
      lineColor: color('--muted', '#68716B'),
      secondaryColor: color('--panel', dark ? '#242C28' : '#F5F8F6'),
      tertiaryColor: color('--paper', dark ? '#1D2420' : '#FFFFFF'),
      background: color('--paper', dark ? '#1D2420' : '#FFFFFF'),
      mainBkg: color('--paper', dark ? '#1D2420' : '#FFFFFF'),
      secondBkg: color('--panel', dark ? '#242C28' : '#F5F8F6'),
      textColor: color('--text', dark ? '#E7ECE9' : '#1F2924'),
      // Labels must remain legible independently from the selected accent.
      // Several Mermaid renderers reuse a border colour as label text, which
      // can otherwise produce same-colour text and backgrounds.
      edgeLabelBackground: color('--paper', dark ? '#1D2420' : '#FFFFFF'),
      relationLabelBackground: color('--paper', dark ? '#1D2420' : '#FFFFFF'),
      relationLabelColor: color('--text', dark ? '#E7ECE9' : '#1F2924'),
      labelTextColor: color('--text', dark ? '#E7ECE9' : '#1F2924'),
      nodeTextColor: color('--text', dark ? '#E7ECE9' : '#1F2924'),
      border1: color('--line', dark ? '#39443E' : '#D9E0DB'),
      border2: color('--accent', '#159A63'),
      taskBkgColor: color('--accent-soft', dark ? '#203C31' : '#E7F5EE'),
      taskBorderColor: color('--accent', '#159A63'),
      activeTaskBkgColor: color('--accent', '#159A63'),
      activeTaskBorderColor: color('--accent-strong', '#0F7D50'),
      gridColor: color('--line', dark ? '#39443E' : '#D9E0DB'),
      todayLineColor: color('--accent', '#159A63'),
      ...pieVariables,
      pieStrokeColor: dark ? '#1D2420' : '#FFFFFF',
      pieSectionTextColor: '#111827',
      pieLegendTextColor: color('--text', dark ? '#E7ECE9' : '#1F2924'),
      pieTitleTextColor: color('--text', dark ? '#E7ECE9' : '#1F2924')
    }
  };
}

function configureMermaid(mermaid) {
  const theme = diagramTheme();
  if (configuredEngine === mermaid && configuredThemeSignature === theme.signature) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
    htmlLabels: false,
    fontFamily: DIAGRAM_FONT_FAMILY,
    theme: theme.name,
    themeVariables: theme.variables,
    flowchart: { htmlLabels: false, useMaxWidth: true },
    sequence: { useMaxWidth: true },
    gantt: { useMaxWidth: true },
    // Mermaid's C4 renderer places relationship captions at the midpoint
    // between two shapes. Its 50px default margin only leaves a 100px gap,
    // which is narrower than common Chinese captions (and their technology
    // label), so the text extends into neighbouring systems. Reserve a real
    // caption lane between shapes and wrap dense context diagrams after three
    // nodes to keep every relationship readable.
    c4: {
      useMaxWidth: false,
      c4ShapeMargin: 120,
      c4ShapeInRow: 3
    }
  });
  configuredEngine = mermaid;
  configuredThemeSignature = theme.signature;
}

function validMermaidEngine(engine) {
  return Boolean(engine && typeof engine.initialize === 'function' && typeof engine.render === 'function');
}

function mermaidEngine() {
  if (validMermaidEngine(window.mermaid)) return Promise.resolve(window.mermaid);
  if (enginePromise) return enginePromise;
  enginePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-quillite-mermaid]');
    const script = existing || document.createElement('script');
    const finish = () => {
      if (validMermaidEngine(window.mermaid)) resolve(window.mermaid);
      else reject(new Error('The bundled Mermaid engine is unavailable'));
    };
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new Error('Unable to load the bundled Mermaid engine')), { once: true });
    if (!existing) {
      script.src = '/vendor/mermaid.min.js';
      script.async = true;
      script.dataset.quilliteMermaid = 'true';
      document.head.appendChild(script);
    } else if (validMermaidEngine(window.mermaid)) {
      finish();
    }
  }).catch(error => {
    enginePromise = null;
    throw error;
  });
  return enginePromise;
}

function sourceFrom(element) {
  try {
    return decodeURIComponent(element.dataset.mermaidSource || '');
  } catch {
    return '';
  }
}

function diagramType(source) {
  return source.split(/\s+/u, 1)[0].toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function normalizeSVGTypography(svg, type = '') {
  if (!svg) return;
  svg.querySelectorAll('text, tspan').forEach(label => {
    const size = Number.parseFloat(getComputedStyle(label).fontSize);
    label.style.fontFamily = DIAGRAM_FONT_FAMILY;
    label.style.fontWeight = '400';
    // The application-wide icon rule gives every SVG element a currentColor
    // stroke. On text this outlines each glyph and makes labels look bold and
    // oversized, so Mermaid text must explicitly opt out.
    label.style.stroke = 'none';
    label.style.strokeWidth = '0';
    // C4 measures stereotype and relationship labels before positioning boxes
    // and connectors. Resizing those labels after render invalidates Mermaid's
    // measured bounds and makes labels overlap lines or neighbouring systems.
    // Keep the exact layout font size for C4 while still normalising its family,
    // weight and accidental SVG stroke.
    if (!type.startsWith('c4') && Number.isFinite(size)) {
      label.style.fontSize = `${Math.max(12, Math.min(16, size))}px`;
    }
  });

  normalizeEdgeLabelBackgrounds(svg);
  if (type.startsWith('c4')) normalizeC4Diagram(svg);
  if (type === 'erdiagram') normalizeERDiagram(svg);
  if (type === 'requirementdiagram') normalizeRequirementDiagram(svg);
  if (type === 'xychart-beta') normalizeXYChart(svg);
  if (type === 'journey') normalizeJourneyDiagram(svg);
  expandSVGViewBox(svg);
}

function normalizeEdgeLabelBackgrounds(svg) {
  const root = getComputedStyle(document.documentElement);
  const dark = document.documentElement.dataset.colorMode === 'dark';
  const paper = mermaidColor(root.getPropertyValue('--paper'), dark ? '#1D2420' : '#FFFFFF');

  // Mermaid uses a small background rectangle to mask the connector beneath
  // an edge caption. Keep that useful mask, but remove its inherited outline:
  // connector notes are annotations, not diagram nodes, and a framed label is
  // easily mistaken for another state or class. Inline styles also keep Word,
  // HTML and PNG exports identical to the live preview.
  svg.querySelectorAll('.edgeLabel rect.background, .edgeLabel rect.labelBkg, .edgeLabel > rect').forEach(box => {
    box.style.setProperty('fill', paper, 'important');
    box.style.setProperty('background-color', paper, 'important');
    box.style.setProperty('stroke', 'none', 'important');
    box.style.setProperty('stroke-width', '0', 'important');
    box.style.setProperty('opacity', '1', 'important');
  });
}

function normalizeJourneyDiagram(svg) {
  const root = getComputedStyle(document.documentElement);
  const dark = document.documentElement.dataset.colorMode === 'dark';
  const text = mermaidColor(root.getPropertyValue('--text'), dark ? '#E7ECE9' : '#1F2924');

  // Journey section rectangles and their titles intentionally share the
  // `journey-section section-type-*` classes. Mermaid's generated theme CSS
  // consequently applies the section background fill to the <text> as well,
  // making headings such as "Open document" blend into the rectangle. Write
  // the final foreground directly onto text nodes so preview and exported
  // images keep the section titles visible in every application theme.
  svg.querySelectorAll('text.journey-section').forEach(label => {
    label.style.setProperty('fill', text, 'important');
    label.style.setProperty('color', text, 'important');
    label.style.setProperty('opacity', '1', 'important');
    label.style.setProperty('font-family', DIAGRAM_FONT_FAMILY, 'important');
    label.style.setProperty('font-size', '14px', 'important');
    label.style.setProperty('font-weight', '400', 'important');
    label.style.setProperty('stroke', 'none', 'important');
  });
}

function normalizeXYChart(svg) {
  // Mermaid places the rotated Y-axis title at x=5 while tick labels start at
  // roughly x=20. A 14-16px UI font therefore makes the title occupy the same
  // horizontal strip as several tick labels. Move only the axis title into a
  // dedicated lane; expandSVGViewBox() below then preserves the extra lane.
  const title = svg.querySelector('.left-axis > .title > text');
  if (!title) return;
  const transform = title.getAttribute('transform') || '';
  const match = transform.match(/translate\(\s*[-+\d.]+(?:e[-+]?\d+)?[ ,]+([-+\d.]+(?:e[-+]?\d+)?)\s*\)\s*rotate\(\s*270\s*\)/iu);
  if (!match) return;
  title.setAttribute('transform', `translate(-18, ${match[1]}) rotate(270)`);
}

function expandSVGViewBox(svg, padding = 10) {
  // Several Mermaid renderers calculate their viewBox before the final web
  // font is applied. Titles, first/last labels and participant names can then
  // land just outside the declared canvas and get clipped. Keep Mermaid's
  // original canvas, but grow it when the real rendered bounds need more room.
  const values = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/u).map(Number);
  if (values.length !== 4 || values.some(value => !Number.isFinite(value))) return;
  let content;
  try {
    content = svg.getBBox();
  } catch {
    return;
  }
  if (!content || !Number.isFinite(content.x) || !Number.isFinite(content.y) || !content.width || !content.height) return;

  const [x, y, width, height] = values;
  const right = x + width;
  const bottom = y + height;
  const nextX = Math.min(x, content.x - padding);
  const nextY = Math.min(y, content.y - padding);
  const nextRight = Math.max(right, content.x + content.width + padding);
  const nextBottom = Math.max(bottom, content.y + content.height + padding);
  if (nextX === x && nextY === y && nextRight === right && nextBottom === bottom) return;
  svg.setAttribute('viewBox', `${nextX} ${nextY} ${nextRight - nextX} ${nextBottom - nextY}`);
}

function normalizeC4Diagram(svg) {
  // Mermaid measures C4 stereotypes with guillemets (for example
  // `«person»`) but draws the longer ASCII form (`<<person>>`) into that
  // measured textLength. The browser then compresses the extra characters
  // and individual letters visibly overlap. Use the same glyphs Mermaid used
  // for measurement and centre them explicitly inside their owning shape.
  svg.querySelectorAll('.person-man > text').forEach(label => {
    const match = label.textContent?.trim().match(/^<<(.+)>>$/u);
    if (!match) return;
    label.textContent = `«${match[1]}»`;
    label.removeAttribute('textLength');
    label.removeAttribute('lengthAdjust');
    const shape = label.parentElement?.querySelector(':scope > rect');
    const x = Number.parseFloat(shape?.getAttribute('x'));
    const width = Number.parseFloat(shape?.getAttribute('width'));
    if (Number.isFinite(x) && Number.isFinite(width)) {
      label.setAttribute('x', String(x + width / 2));
      label.setAttribute('text-anchor', 'middle');
    }
    label.style.setProperty('letter-spacing', '0', 'important');
  });
}

function normalizeERDiagram(svg) {
  const root = getComputedStyle(document.documentElement);
  const dark = document.documentElement.dataset.colorMode === 'dark';
  const color = (name, fallback) => mermaidColor(root.getPropertyValue(name), fallback);
  const paper = color('--paper', dark ? '#1D2420' : '#FFFFFF');
  const text = color('--text', dark ? '#E7ECE9' : '#1F2924');
  const line = color('--muted', dark ? '#A7B0AA' : '#68716B');

  // Mermaid ER uses the node border colour for relationship captions. That
  // works for its stock themes but can turn both the caption and its box into
  // the application accent. Inline the final neutral colours so the preview
  // and exported SVG/PNG have exactly the same readable result.
  svg.querySelectorAll('.relationshipLabelBox, .edgeLabel rect, rect.labelBkg').forEach(box => {
    box.style.setProperty('fill', paper, 'important');
    box.style.setProperty('background-color', paper, 'important');
    box.style.setProperty('stroke', 'none', 'important');
    box.style.setProperty('stroke-width', '0', 'important');
    box.style.setProperty('opacity', '1', 'important');
  });
  svg.querySelectorAll('.edgeLabel .label, .edgeLabel text, .edgeLabel tspan').forEach(label => {
    label.style.setProperty('fill', text, 'important');
    label.style.setProperty('color', text, 'important');
    label.style.setProperty('stroke', 'none', 'important');
  });
  svg.querySelectorAll('.relationshipLine, .marker').forEach(edge => {
    edge.style.setProperty('stroke', line, 'important');
  });
}

function normalizeRequirementDiagram(svg) {
  const root = getComputedStyle(document.documentElement);
  const dark = document.documentElement.dataset.colorMode === 'dark';
  const color = (name, fallback) => mermaidColor(root.getPropertyValue(name), fallback);
  const paper = color('--paper', dark ? '#1D2420' : '#FFFFFF');
  const text = color('--text', dark ? '#E7ECE9' : '#1F2924');
  const line = color('--muted', dark ? '#A7B0AA' : '#68716B');

  // Mermaid draws Requirement Diagram relationship captions on a dedicated
  // label box. Some Mermaid/theme combinations leave that box black while
  // the caption inherits an equally dark colour. Apply final SVG colours
  // directly so live preview and exported SVG snapshots remain identical.
  svg.querySelectorAll('.reqLabelBox, .edgeLabel rect, rect.labelBkg').forEach(labelBox => {
    labelBox.style.setProperty('fill', paper, 'important');
    labelBox.style.setProperty('background-color', paper, 'important');
    labelBox.style.setProperty('stroke', 'none', 'important');
    labelBox.style.setProperty('stroke-width', '0', 'important');
    labelBox.style.setProperty('opacity', '1', 'important');
  });

  svg.querySelectorAll('.relationshipLabel, .edgeLabel .label, .edgeLabel text, .edgeLabel tspan').forEach(label => {
    label.style.setProperty('fill', text, 'important');
    label.style.setProperty('color', text, 'important');
    label.style.setProperty('stroke', 'none', 'important');
    label.style.setProperty('font-family', DIAGRAM_FONT_FAMILY, 'important');
    label.style.setProperty('font-size', '13px', 'important');
    label.style.setProperty('font-weight', '400', 'important');
    label.style.setProperty('opacity', '1', 'important');

    if (/^(text|tspan)$/iu.test(label.tagName)) {
      const match = label.textContent.trim().match(/^<<(.+)>>$/u);
      if (match) label.textContent = `«${match[1]}»`;
      label.removeAttribute('textLength');
      label.removeAttribute('lengthAdjust');
    }
  });

  svg.querySelectorAll('.relationshipLine').forEach(connector => {
    connector.style.setProperty('stroke', line, 'important');
  });
}

async function renderContainer(container, messages, generation) {
  const isCurrent = () => renderGenerations.get(container) === generation;
  if (!isCurrent()) return;
  const diagrams = [...container.querySelectorAll('.mermaid-diagram:not([data-mermaid-rendered="true"])')];
  if (!diagrams.length) return;
  let engine;
  try {
    engine = await mermaidEngine();
    if (!isCurrent()) return;
    configureMermaid(engine);
  } catch (error) {
    for (const element of diagrams) showRenderError(element, error, messages);
    return;
  }
  for (const element of diagrams) {
    if (!isCurrent()) return;
    if (!element.isConnected) continue;
    const source = sourceFrom(element).trim();
    if (!source) continue;
    element.dataset.mermaidType = diagramType(source);
    const id = `quillite-mermaid-${Date.now()}-${++renderSequence}`;
    element.classList.add('mermaid-rendering');
    element.setAttribute('aria-busy', 'true');
    try {
      const { svg } = await engine.render(id, source);
      if (!isCurrent()) return;
      if (!element.isConnected) continue;
      const safeSVG = DOMPurify.sanitize(svg, {
        USE_PROFILES: { svg: true, svgFilters: true },
        FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed'],
        FORBID_ATTR: ['onload', 'onclick', 'onerror']
      });
      element.innerHTML = safeSVG;
      normalizeSVGTypography(element.querySelector('svg'), element.dataset.mermaidType);
      element.dataset.mermaidRendered = 'true';
      element.classList.remove('mermaid-rendering', 'mermaid-error');
      element.setAttribute('aria-label', messages.diagramLabel);
    } catch (error) {
      if (!element.isConnected) continue;
      showRenderError(element, error, messages);
    } finally {
      element.removeAttribute('aria-busy');
    }
    // Give scrolling, typing and window painting a chance between expensive
    // diagrams instead of monopolising the WebView for a long document.
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

function showRenderError(element, error, messages) {
  if (!element?.isConnected) return;
  const detail = error instanceof Error ? error.message : String(error || '');
  element.classList.remove('mermaid-rendering');
  element.classList.add('mermaid-error');
  element.innerHTML = `<strong>${messages.errorTitle}</strong><span>${messages.errorHint}</span><pre></pre>`;
  element.querySelector('pre').textContent = detail;
  element.dataset.mermaidRendered = 'error';
  element.removeAttribute('aria-busy');
}

export function renderMermaidDiagrams(container, messages) {
  const generation = (renderGenerations.get(container) || 0) + 1;
  renderGenerations.set(container, generation);
  renderQueue = renderQueue.catch(() => {}).then(() => renderContainer(container, messages, generation));
  return renderQueue;
}

export function svgToPNGDataURL(svg, label = 'diagram') {
  return new Promise((resolve, reject) => {
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const box = svg.viewBox?.baseVal;
    const bounds = svg.getBoundingClientRect();
    const sourceWidth = box?.width || bounds.width || 900;
    const sourceHeight = box?.height || bounds.height || 500;
    const width = Math.max(320, Math.min(1800, Math.ceil(sourceWidth)));
    const height = Math.max(160, Math.min(3200, Math.ceil(sourceHeight * (width / sourceWidth))));
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    const svgText = new XMLSerializer().serializeToString(clone);
    const bytes = new TextEncoder().encode(svgText);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    // The application CSP permits data images but intentionally does not
    // permit blob URLs. A data URI therefore works consistently in WebView2,
    // WKWebView and standalone browser exports.
    const url = `data:image/svg+xml;base64,${btoa(binary)}`;
    const image = new Image();
    image.onload = () => {
      try {
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const context = canvas.getContext('2d');
        context.scale(scale, scale);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => {
      reject(new Error(`Unable to convert ${label} to PNG`));
    };
    image.src = url;
  });
}

export async function convertMermaidDiagramsToImages(container, altText) {
  for (const diagram of container.querySelectorAll('.mermaid-diagram[data-mermaid-rendered="true"]')) {
    const svg = diagram.querySelector('svg');
    if (!svg) continue;
    const image = document.createElement('img');
    image.src = await svgToPNGDataURL(svg, 'Mermaid diagram');
    image.alt = altText;
    image.className = 'mermaid-export-image';
    diagram.replaceChildren(image);
  }
}
