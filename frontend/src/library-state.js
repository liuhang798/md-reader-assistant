const supportedSidebarModes = new Set(['recent', 'favorites', 'explorer']);

export function normalizeSidebarMode(mode) {
  return supportedSidebarModes.has(mode) ? mode : 'recent';
}

export function normalizeDocumentPath(filePath) {
  return String(filePath || '').trim().replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

export function sameDocumentPath(left, right) {
  const leftPath = normalizeDocumentPath(left);
  const rightPath = normalizeDocumentPath(right);
  return Boolean(leftPath && rightPath && leftPath === rightPath);
}

export function filesFromPreferencePaths(paths = [], statuses = []) {
  const statusByPath = new Map(statuses.map(status => [normalizeDocumentPath(status.path), status.exists !== false]));
  return paths.map(filePath => ({
    path: filePath,
    name: String(filePath).split(/[\\/]/).pop(),
    directory: null,
    exists: statusByPath.get(normalizeDocumentPath(filePath)) !== false,
  }));
}
