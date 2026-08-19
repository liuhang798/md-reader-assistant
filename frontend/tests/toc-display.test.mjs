import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clampTocPreferredWidth,
  effectiveTocWidth,
  fitReaderSidePanels,
  physicalShortEdge,
  scrollDeltaForBounds,
  tocDisplaySignature,
  tocDisplayMetrics,
} from '../src/toc-display.js';

test('TOC display metrics use the physical short edge at 1K, 2K, and 4K anchors', () => {
  assert.deepEqual(tocDisplayMetrics({ width: 1920, height: 1080, devicePixelRatio: 1 }), {
    physicalShortEdge: 1080,
    fontSize: 13,
    defaultWidth: 220,
  });
  assert.deepEqual(tocDisplayMetrics({ width: 2560, height: 1440, devicePixelRatio: 1 }), {
    physicalShortEdge: 1440,
    fontSize: 15,
    defaultWidth: 250,
  });
  assert.deepEqual(tocDisplayMetrics({ width: 3840, height: 2160, devicePixelRatio: 1 }), {
    physicalShortEdge: 2160,
    fontSize: 17,
    defaultWidth: 290,
  });
});

test('TOC display metrics interpolate continuously and classify ultrawide screens by the short edge', () => {
  assert.deepEqual(tocDisplayMetrics({ width: 2240, height: 1260, devicePixelRatio: 1 }), {
    physicalShortEdge: 1260,
    fontSize: 14,
    defaultWidth: 235,
  });
  assert.deepEqual(tocDisplayMetrics({ width: 3200, height: 1800, devicePixelRatio: 1 }), {
    physicalShortEdge: 1800,
    fontSize: 16,
    defaultWidth: 270,
  });
  assert.equal(tocDisplayMetrics({ width: 5120, height: 1440, devicePixelRatio: 1 }).fontSize, 15);
  assert.equal(tocDisplayMetrics({ width: 1920, height: 1080, devicePixelRatio: 2 }).fontSize, 17);
  assert.equal(physicalShortEdge({ width: 1080, height: 1920, devicePixelRatio: 1 }), 1080);
});

test('physical short edge preserves valid low DPR values and only falls back for invalid DPR', () => {
  assert.equal(physicalShortEdge({ width: 2560, height: 1440, devicePixelRatio: .75 }), 1080);
  assert.equal(physicalShortEdge({ width: 2560, height: 1440, devicePixelRatio: 0 }), 1440);
  assert.equal(physicalShortEdge({ width: 2560, height: 1440, devicePixelRatio: -2 }), 1440);
  assert.equal(tocDisplaySignature({ width: 2560, height: 1440, devicePixelRatio: .75 }), '2560x1440@0.75');
  assert.equal(tocDisplaySignature({ width: 2560, height: 1440, devicePixelRatio: 0 }), '2560x1440@1');
});

test('TOC display metrics safely fall back to the 1080p baseline without valid screen information', () => {
  assert.deepEqual(tocDisplayMetrics(), {
    physicalShortEdge: 0,
    fontSize: 13,
    defaultWidth: 220,
  });
  assert.deepEqual(tocDisplayMetrics({ width: 'invalid', height: -1, devicePixelRatio: 'invalid' }), {
    physicalShortEdge: 0,
    fontSize: 13,
    defaultWidth: 220,
  });
});

test('preferred TOC width survives temporary viewport clamping and invalid values are safe', () => {
  assert.equal(clampTocPreferredWidth('900'), 900);
  assert.equal(clampTocPreferredWidth('invalid', 250), 250);
  assert.equal(clampTocPreferredWidth('', 250), 250);
  assert.equal(clampTocPreferredWidth(20), 120);
  assert.equal(clampTocPreferredWidth(5000), 2000);
  assert.equal(effectiveTocWidth(900, 540, 250), 540);
  assert.equal(effectiveTocWidth(900, 1200, 250), 900);
});

test('reader side panels shrink the TOC first, then the sidebar, without changing preferred widths', () => {
  assert.deepEqual(fitReaderSidePanels({
    availableWidth: 1000,
    sidebarPreferredWidth: 900,
    tocPreferredWidth: 290,
  }), {
    sidebarWidth: 880,
    tocWidth: 120,
    preferredSidebarWidth: 900,
    preferredTocWidth: 290,
    remainingWidth: 0,
  });

  assert.deepEqual(fitReaderSidePanels({
    availableWidth: 1400,
    sidebarPreferredWidth: 900,
    tocPreferredWidth: 290,
  }), {
    sidebarWidth: 900,
    tocWidth: 290,
    preferredSidebarWidth: 900,
    preferredTocWidth: 290,
    remainingWidth: 210,
  });
});

test('hidden panels do not consume the document budget and keep their preferred width for restoration', () => {
  assert.deepEqual(fitReaderSidePanels({
    availableWidth: 500,
    sidebarPreferredWidth: 900,
    tocPreferredWidth: 290,
    tocVisible: false,
  }), {
    sidebarWidth: 500,
    tocWidth: 290,
    preferredSidebarWidth: 900,
    preferredTocWidth: 290,
    remainingWidth: 0,
  });

  const exceptionallyNarrow = fitReaderSidePanels({
    availableWidth: 180,
    sidebarPreferredWidth: 900,
    tocPreferredWidth: 290,
  });
  assert.equal(exceptionallyNarrow.sidebarWidth + exceptionallyNarrow.tocWidth, 180);
  assert.equal(exceptionallyNarrow.preferredSidebarWidth, 900);
  assert.equal(exceptionallyNarrow.preferredTocWidth, 290);
});

test('active TOC links scroll only beyond the real viewport bounds', () => {
  assert.equal(scrollDeltaForBounds({ itemTop: 90, itemBottom: 115, viewportTop: 100, viewportBottom: 400 }), -10);
  assert.equal(scrollDeltaForBounds({ itemTop: 380, itemBottom: 425, viewportTop: 100, viewportBottom: 400 }), 25);
  assert.equal(scrollDeltaForBounds({ itemTop: 120, itemBottom: 180, viewportTop: 100, viewportBottom: 400 }), 0);
});
