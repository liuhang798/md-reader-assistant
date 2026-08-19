const DISPLAY_ANCHORS = [
  { shortEdge: 1080, fontSize: 13, defaultWidth: 220 },
  { shortEdge: 1440, fontSize: 15, defaultWidth: 250 },
  { shortEdge: 2160, fontSize: 17, defaultWidth: 290 },
];

export const TOC_WIDTH_LIMITS = Object.freeze({ min: 120, max: 2000 });

function finiteNumber(value, fallback = 0) {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function interpolateAnchors(shortEdge, property) {
  if (shortEdge <= DISPLAY_ANCHORS[0].shortEdge) return DISPLAY_ANCHORS[0][property];
  const last = DISPLAY_ANCHORS.at(-1);
  if (shortEdge >= last.shortEdge) return last[property];

  const upperIndex = DISPLAY_ANCHORS.findIndex(anchor => anchor.shortEdge >= shortEdge);
  const lower = DISPLAY_ANCHORS[upperIndex - 1];
  const upper = DISPLAY_ANCHORS[upperIndex];
  const progress = (shortEdge - lower.shortEdge) / (upper.shortEdge - lower.shortEdge);
  return lower[property] + (upper[property] - lower[property]) * progress;
}

export function physicalShortEdge({ width, height, devicePixelRatio } = {}) {
  const cssWidth = Math.max(0, finiteNumber(width));
  const cssHeight = Math.max(0, finiteNumber(height));
  if (!cssWidth || !cssHeight) return 0;
  const parsedPixelRatio = finiteNumber(devicePixelRatio, 1);
  const pixelRatio = parsedPixelRatio > 0 ? parsedPixelRatio : 1;
  return Math.min(cssWidth, cssHeight) * pixelRatio;
}

export function tocDisplaySignature({ width, height, devicePixelRatio } = {}) {
  const cssWidth = Math.max(0, finiteNumber(width));
  const cssHeight = Math.max(0, finiteNumber(height));
  const parsedPixelRatio = finiteNumber(devicePixelRatio, 1);
  const pixelRatio = parsedPixelRatio > 0 ? parsedPixelRatio : 1;
  return `${cssWidth}x${cssHeight}@${pixelRatio}`;
}

export function tocDisplayMetrics(display) {
  const shortEdge = physicalShortEdge(display);
  const interpolationEdge = shortEdge || DISPLAY_ANCHORS[0].shortEdge;
  return {
    physicalShortEdge: Math.round(shortEdge),
    fontSize: Math.round(interpolateAnchors(interpolationEdge, 'fontSize') * 100) / 100,
    defaultWidth: Math.round(interpolateAnchors(interpolationEdge, 'defaultWidth')),
  };
}

export function clampTocPreferredWidth(value, fallback = DISPLAY_ANCHORS[0].defaultWidth) {
  const parsed = finiteNumber(value, fallback);
  return Math.min(TOC_WIDTH_LIMITS.max, Math.max(TOC_WIDTH_LIMITS.min, Math.round(parsed)));
}

export function effectiveTocWidth(preferredWidth, availableWidth, fallback) {
  const preferred = clampTocPreferredWidth(preferredWidth, fallback);
  const available = finiteNumber(availableWidth, preferred);
  return Math.min(preferred, Math.max(TOC_WIDTH_LIMITS.min, Math.floor(available)));
}

function clampPaneWidth(value, fallback, minimum, maximum) {
  const parsed = finiteNumber(value, fallback);
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

function shrinkPane(currentWidth, minimumWidth, requestedReduction) {
  const reduction = Math.min(Math.max(0, currentWidth - minimumWidth), requestedReduction);
  return { width: currentWidth - reduction, remaining: requestedReduction - reduction };
}

export function fitReaderSidePanels({
  availableWidth,
  sidebarPreferredWidth,
  tocPreferredWidth,
  sidebarVisible = true,
  tocVisible = true,
  sidebarMinimum = 120,
  sidebarMaximum = 2000,
  tocMinimum = TOC_WIDTH_LIMITS.min,
  tocMaximum = TOC_WIDTH_LIMITS.max,
  sidebarFallback = 258,
  tocFallback = DISPLAY_ANCHORS[0].defaultWidth,
} = {}) {
  const preferredSidebarWidth = clampPaneWidth(
    sidebarPreferredWidth,
    sidebarFallback,
    sidebarMinimum,
    sidebarMaximum,
  );
  const preferredTocWidth = clampPaneWidth(
    tocPreferredWidth,
    tocFallback,
    tocMinimum,
    tocMaximum,
  );
  const preferredVisibleWidth = (sidebarVisible ? preferredSidebarWidth : 0)
    + (tocVisible ? preferredTocWidth : 0);
  const parsedAvailableWidth = finiteNumber(availableWidth, preferredVisibleWidth);
  const widthBudget = Math.max(0, Math.floor(parsedAvailableWidth));
  let sidebarWidth = preferredSidebarWidth;
  let tocWidth = preferredTocWidth;
  let excess = Math.max(0, preferredVisibleWidth - widthBudget);

  // The outline yields space first. Only when it reaches its normal minimum
  // does the library sidebar temporarily shrink as well.
  if (tocVisible && excess > 0) {
    const result = shrinkPane(tocWidth, tocMinimum, excess);
    tocWidth = result.width;
    excess = result.remaining;
  }
  if (sidebarVisible && excess > 0) {
    const result = shrinkPane(sidebarWidth, sidebarMinimum, excess);
    sidebarWidth = result.width;
    excess = result.remaining;
  }

  // Very small host windows are unusual because the app has its own minimum
  // size, but keep the document budget authoritative even in that case.
  if (tocVisible && excess > 0) {
    const result = shrinkPane(tocWidth, 0, excess);
    tocWidth = result.width;
    excess = result.remaining;
  }
  if (sidebarVisible && excess > 0) {
    const result = shrinkPane(sidebarWidth, 0, excess);
    sidebarWidth = result.width;
    excess = result.remaining;
  }

  const usedWidth = (sidebarVisible ? sidebarWidth : 0) + (tocVisible ? tocWidth : 0);
  return {
    sidebarWidth,
    tocWidth,
    preferredSidebarWidth,
    preferredTocWidth,
    remainingWidth: Math.max(0, widthBudget - usedWidth),
  };
}

export function scrollDeltaForBounds({ itemTop, itemBottom, viewportTop, viewportBottom } = {}) {
  const top = finiteNumber(itemTop);
  const bottom = finiteNumber(itemBottom, top);
  const visibleTop = finiteNumber(viewportTop);
  const visibleBottom = finiteNumber(viewportBottom, visibleTop);
  if (top < visibleTop) return top - visibleTop;
  if (bottom > visibleBottom) return bottom - visibleBottom;
  return 0;
}
