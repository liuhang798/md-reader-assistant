const MIN_FONT_SCALE = 0.82;
const MAX_FONT_SCALE = 2;

export function clampFontScale(value) {
  const scale = Number(value);
  return Number.isFinite(scale) ? Math.max(MIN_FONT_SCALE, Math.min(MAX_FONT_SCALE, scale)) : 1;
}

export function recommendedFontScale({ width, height, devicePixelRatio } = {}) {
  const cssLongEdge = Math.max(Number(width) || 0, Number(height) || 0);
  const pixelRatio = Math.max(1, Number(devicePixelRatio) || 1);
  const physicalLongEdge = cssLongEdge * pixelRatio;

  // WebView already follows the operating system's DPI scaling. Additional
  // enlargement is only useful when a high-resolution screen remains near 100%.
  if (pixelRatio > 1.1) return 1;
  if (physicalLongEdge >= 3500) return 1.3;
  if (physicalLongEdge >= 2500) return 1.15;
  return 1;
}

export function readFontScaleStorage(storage, display) {
  const savedValue = storage?.getItem?.('fontScale');
  const savedScale = clampFontScale(savedValue);
  const savedMode = storage?.getItem?.('fontScaleMode');
  const mode = savedMode === 'auto' || savedMode === 'manual'
    ? savedMode
    // Preserve legacy custom scales, while migrating the old untouched 100%
    // default to automatic display adaptation.
    : (savedValue !== null && Math.abs(savedScale - 1) > 0.001 ? 'manual' : 'auto');

  return {
    mode,
    scale: mode === 'auto' ? recommendedFontScale(display) : savedScale
  };
}
