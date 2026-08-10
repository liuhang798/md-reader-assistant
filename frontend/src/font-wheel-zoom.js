export function previewWheelZoomDirection({
  platform = 'browser',
  ctrlKey = false,
  metaKey = false,
  deltaY = 0,
} = {}) {
  const primaryModifier = platform === 'darwin' ? metaKey : ctrlKey;
  if (!primaryModifier || !Number.isFinite(deltaY) || deltaY === 0) return 0;
  return deltaY < 0 ? 1 : -1;
}
