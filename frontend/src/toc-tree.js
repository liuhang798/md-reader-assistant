const STORAGE_KEY = 'tocCollapsedByDocument';
const MAX_STORED_DOCUMENTS = 40;

function documentKey(filePath) {
  return String(filePath || '').trim().replace(/\\/g, '/').toLowerCase();
}

export function buildTocTree(items = []) {
  const roots = [];
  const stack = [];

  for (const item of items) {
    const node = { ...item, children: [] };
    while (stack.length && stack.at(-1).level >= node.level) stack.pop();
    if (stack.length) stack.at(-1).children.push(node);
    else roots.push(node);
    stack.push(node);
  }

  return roots;
}

export function readCollapsedToc(storage, filePath) {
  const key = documentKey(filePath);
  if (!key) return new Set();
  try {
    const values = JSON.parse(storage.getItem(STORAGE_KEY) || '{}')[key];
    return new Set(Array.isArray(values) ? values : []);
  } catch {
    return new Set();
  }
}

export function writeCollapsedToc(storage, filePath, collapsed) {
  const key = documentKey(filePath);
  if (!key) return;
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
    delete saved[key];
    saved[key] = [...collapsed];
    const keys = Object.keys(saved);
    for (const staleKey of keys.slice(0, Math.max(0, keys.length - MAX_STORED_DOCUMENTS))) delete saved[staleKey];
    storage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Storage may be unavailable. Folding still works for the current session.
  }
}
