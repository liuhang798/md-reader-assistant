import * as echarts from 'echarts';
import 'echarts-wordcloud';
import { svgToPNGDataURL } from './mermaid-diagrams.js';

const chartInstances = new WeakMap();
const resizeObservers = new WeakMap();
const CHART_PALETTE = ['#159A63', '#2878B5', '#F28E2B', '#E15759', '#76B7B2', '#8F63B8', '#EDC948', '#59A14F', '#AF7AA1', '#FF9DA7'];
const FONT_FAMILY = '"Segoe UI", "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';
const NORMAL_TEXT = Object.freeze({ fontFamily: FONT_FAMILY, fontWeight: 400 });

function decodeSource(element) {
  try {
    return decodeURIComponent(element.dataset.echartsSource || '');
  } catch {
    return element.dataset.echartsSource || '';
  }
}

function cssColor(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function axisTheme(axis, text, line) {
  if (!axis || typeof axis !== 'object') return;
  axis.axisLabel = { color: text, ...NORMAL_TEXT, fontSize: 12, margin: 10, hideOverlap: true, ...(axis.axisLabel || {}), fontWeight: 400 };
  axis.nameTextStyle = { color: text, ...NORMAL_TEXT, fontSize: 12, lineHeight: 17, ...(axis.nameTextStyle || {}), fontWeight: 400 };
  if (axis.name && !axis.nameLocation) axis.nameLocation = 'middle';
  if (axis.name && axis.nameGap == null) axis.nameGap = axis.type === 'category' ? 30 : 38;
  axis.axisLine = { ...(axis.axisLine || {}), lineStyle: { color: line, ...((axis.axisLine || {}).lineStyle || {}) } };
  axis.splitLine = { ...(axis.splitLine || {}), lineStyle: { color: line, type: 'dashed', ...((axis.splitLine || {}).lineStyle || {}) } };
}

function normalTextStyle(style, color, fontSize = 12) {
  return { color, ...NORMAL_TEXT, fontSize, ...(style || {}), fontWeight: 400 };
}

function numericInset(value, fallback) {
  return typeof value === 'number' ? Math.max(value, fallback) : value ?? fallback;
}

function normalizeCartesianLayout(option, seriesTypes) {
  if (!option.xAxis && !option.yAxis) return;
  const hasLegend = Boolean(option.legend);
  const needsHeatmapSpace = seriesTypes.has('heatmap');
  const grid = Array.isArray(option.grid) ? option.grid[0] : (option.grid || {});
  const safeGrid = {
    ...grid,
    containLabel: true,
    left: numericInset(grid.left, 58),
    right: numericInset(grid.right, 58),
    top: numericInset(grid.top, hasLegend ? 76 : 62),
    bottom: numericInset(grid.bottom, needsHeatmapSpace ? 104 : 62)
  };
  option.grid = Array.isArray(option.grid) ? [safeGrid, ...option.grid.slice(1)] : safeGrid;
}

function normalizeLegend(option, text) {
  if (!option.legend) return;
  const legends = Array.isArray(option.legend) ? option.legend : [option.legend];
  for (const legend of legends) {
    legend.type = legend.type || 'scroll';
    legend.itemWidth = legend.itemWidth || 18;
    legend.itemHeight = legend.itemHeight || 10;
    legend.itemGap = legend.itemGap || 14;
    legend.pageTextStyle = normalTextStyle(legend.pageTextStyle, text, 11);
    legend.textStyle = normalTextStyle(legend.textStyle, text, 12);
  }
}

function normalizeVisualMap(option, text) {
  if (!option.visualMap) return;
  const visualMaps = Array.isArray(option.visualMap) ? option.visualMap : [option.visualMap];
  for (const visualMap of visualMaps) {
    visualMap.textStyle = normalTextStyle(visualMap.textStyle, text, 11);
    if (visualMap.orient === 'horizontal') {
      visualMap.bottom = typeof visualMap.bottom === 'number' ? Math.min(visualMap.bottom, 8) : 8;
      // Continuous visualMap uses itemWidth as bar thickness and itemHeight as
      // bar length before rotating the group into its horizontal position.
      visualMap.itemWidth = visualMap.itemWidth || 12;
      visualMap.itemHeight = visualMap.itemHeight || 150;
    }
  }
}

function normalizePieSeries(item) {
  item.avoidLabelOverlap = true;
  item.label = {
    ...item.label,
    show: item.label?.show !== false,
    fontWeight: 400,
    fontSize: 12,
    lineHeight: 16,
    overflow: 'break'
  };
  item.labelLine = { length: 12, length2: 8, smooth: false, ...(item.labelLine || {}) };
}

function prepareOption(rawOption) {
  // Sources are JSON by design; JSON cloning also works in older WebView2 and
  // WKWebView versions where structuredClone may not be available.
  const option = JSON.parse(JSON.stringify(rawOption));
  const metadata = option.__quillite || {};
  delete option.__quillite;
  const text = cssColor('--text', '#1F2924');
  const muted = cssColor('--muted', '#68736D');
  const line = cssColor('--line', '#D9DEDA');
  option.animation = false;
  option.color = option.color || CHART_PALETTE;
  option.backgroundColor = 'transparent';
  option.textStyle = normalTextStyle(option.textStyle, text, 13);
  if (option.title) {
    option.title.textStyle = normalTextStyle(option.title.textStyle, text, 16);
    option.title.subtextStyle = normalTextStyle(option.title.subtextStyle, muted, 12);
  }
  normalizeLegend(option, text);
  normalizeVisualMap(option, text);
  for (const axis of Array.isArray(option.xAxis) ? option.xAxis : [option.xAxis]) axisTheme(axis, text, line);
  for (const axis of Array.isArray(option.yAxis) ? option.yAxis : [option.yAxis]) axisTheme(axis, text, line);
  const series = Array.isArray(option.series) ? option.series : [];
  const seriesTypes = new Set(series.map(item => item?.type).filter(Boolean));
  normalizeCartesianLayout(option, seriesTypes);
  for (const [seriesIndex, item] of series.entries()) {
    item.label = normalTextStyle(item.label, text, 12);
    item.emphasis = { ...(item.emphasis || {}), label: normalTextStyle(item.emphasis?.label, text, 12) };
    if (item.type === 'pie') normalizePieSeries(item);
    if (item.type === 'wordCloud' && Array.isArray(item.data)) {
      item.data = item.data.map((word, index) => ({ ...word, textStyle: normalTextStyle({ color: CHART_PALETTE[index % CHART_PALETTE.length], ...(word.textStyle || {}) }, text, word.textStyle?.fontSize || 14) }));
    }
    if (metadata.transform === 'bubble' && item.type === 'scatter') {
      item.symbolSize = value => Math.max(12, Math.min(54, Number(value?.[2]) || 16));
      item.itemStyle = { color: CHART_PALETTE[seriesIndex % CHART_PALETTE.length], opacity: .76, borderColor: '#FFFFFF', borderWidth: 1, ...(item.itemStyle || {}) };
      item.label = { ...item.label, show: true, position: 'top', distance: 7, formatter: params => String(params.value?.[3] || ''), fontWeight: 400 };
    }
    if (item.type === 'scatter' && metadata.transform !== 'bubble') {
      item.itemStyle = { color: CHART_PALETTE[seriesIndex % CHART_PALETTE.length], opacity: .82, ...(item.itemStyle || {}) };
    }
    if (item.type === 'boxplot') {
      item.itemStyle = {
        color: '#D8EAF7',
        borderColor: '#2878B5',
        borderWidth: 1.5,
        ...(item.itemStyle || {})
      };
    }
    if (item.type === 'gauge') {
      if (item.detail) item.detail = normalTextStyle(item.detail, item.detail.color || text, item.detail.fontSize || 24);
      if (item.axisLabel) item.axisLabel = normalTextStyle(item.axisLabel, text, item.axisLabel.fontSize || 11);
      if (item.title) item.title = normalTextStyle(item.title, text, item.title.fontSize || 12);
    }
    if (item.type === 'funnel' && !item.itemStyle) item.itemStyle = { borderColor: cssColor('--paper', '#FFFFFF'), borderWidth: 1 };
    item.z = item.z ?? seriesIndex + 1;
  }
  return { option, height: Math.max(300, Math.min(720, Number(metadata.height) || 420)) };
}

function disposeDiagram(element) {
  resizeObservers.get(element)?.disconnect();
  resizeObservers.delete(element);
  const chart = chartInstances.get(element) || echarts.getInstanceByDom(element);
  if (chart && !chart.isDisposed()) chart.dispose();
  chartInstances.delete(element);
}

export function releaseEChartsDiagrams(container) {
  container.querySelectorAll('.echarts-diagram').forEach(disposeDiagram);
}

function renderError(element, error, messages) {
  disposeDiagram(element);
  element.dataset.echartsRendered = 'error';
  element.classList.add('echarts-error');
  const panel = document.createElement('div');
  panel.className = 'mermaid-error-panel';
  const title = document.createElement('strong');
  title.textContent = messages?.errorTitle || 'Invalid data chart';
  const hint = document.createElement('p');
  hint.textContent = messages?.errorHint || 'Check the chart JSON source.';
  const details = document.createElement('code');
  details.textContent = String(error?.message || error || 'Unknown error');
  panel.append(title, hint, details);
  element.replaceChildren(panel);
}

function renderDiagram(element, messages) {
  const source = decodeSource(element).trim();
  try {
    const parsed = JSON.parse(source);
    const { option, height } = prepareOption(parsed);
    disposeDiagram(element);
    element.classList.remove('echarts-error');
    element.style.height = `${height}px`;
    element.replaceChildren();
    const chart = echarts.init(element, null, { renderer: 'svg', devicePixelRatio: 1 });
    chart.setOption(option, { notMerge: true, lazyUpdate: false });
    chartInstances.set(element, chart);
    element.dataset.echartsRendered = 'true';
    const observer = new ResizeObserver(entries => {
      if (!element.isConnected) {
        disposeDiagram(element);
        return;
      }
      const width = entries[0]?.contentRect?.width;
      if (width > 0 && !chart.isDisposed()) chart.resize({ width, height });
    });
    observer.observe(element);
    resizeObservers.set(element, observer);
  } catch (error) {
    renderError(element, error, messages);
  }
}

export async function renderEChartsDiagrams(container, messages) {
  const diagrams = [...container.querySelectorAll('.echarts-diagram:not([data-echarts-rendered="true"])')];
  for (const diagram of diagrams) renderDiagram(diagram, messages);
}

export async function convertEChartsDiagramsToImages(container, altText) {
  for (const diagram of container.querySelectorAll('.echarts-diagram[data-echarts-rendered="true"]')) {
    const svg = diagram.querySelector('svg');
    if (!svg) continue;
    const image = document.createElement('img');
    image.src = await svgToPNGDataURL(svg, 'data chart');
    image.alt = altText;
    image.className = 'echarts-export-image';
    diagram.replaceChildren(image);
    diagram.style.height = 'auto';
  }
}

export function validateEChartsSource(source) {
  try {
    const parsed = JSON.parse(String(source || '').trim());
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.series) || !parsed.series.length) {
      throw new Error('Chart JSON must contain at least one series.');
    }
    return { valid: true, option: parsed };
  } catch (error) {
    return { valid: false, error: error?.message || String(error) };
  }
}
