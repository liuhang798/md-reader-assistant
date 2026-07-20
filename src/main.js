const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('fs/promises');
const path = require('path');

let mainWindow;
let documentDirty = false;
let forceClose = false;
let appLanguage = 'zh-CN';

const mainTranslations = {
  'zh-CN': {
    appName: 'MD阅读助手', unsavedTitle: '尚未保存', openUnsavedMessage: '当前文档有尚未保存的更改。',
    openUnsavedDetail: '打开另一个文档将丢失这些更改。', continueEditing: '继续编辑', discardAndOpen: '不保存并打开',
    openError: '无法打开文档', exitUnsavedMessage: '文档中的更改尚未保存。', exitUnsavedDetail: '确定要退出并放弃这些更改吗？',
    discardAndExit: '不保存并退出', openMarkdown: '打开 Markdown 文档', markdownDocument: 'Markdown 文档', textFile: '文本文件', allFiles: '所有文件',
    openFolder: '打开文档文件夹', saveAsMarkdown: '另存为 Markdown 文档', newDocument: '新建文档.md'
  },
  en: {
    appName: 'MD Reader Assistant', unsavedTitle: 'Unsaved Changes', openUnsavedMessage: 'The current document has unsaved changes.',
    openUnsavedDetail: 'Opening another document will discard these changes.', continueEditing: 'Continue Editing', discardAndOpen: 'Discard and Open',
    openError: 'Unable to Open Document', exitUnsavedMessage: 'The document has unsaved changes.', exitUnsavedDetail: 'Exit and discard these changes?',
    discardAndExit: 'Discard and Exit', openMarkdown: 'Open Markdown Document', markdownDocument: 'Markdown Document', textFile: 'Text File', allFiles: 'All Files',
    openFolder: 'Open Document Folder', saveAsMarkdown: 'Save Markdown Document As', newDocument: 'New document.md'
  }
};

function mainT(key) {
  return mainTranslations[appLanguage]?.[key] || mainTranslations['zh-CN'][key] || key;
}

const markdownExtensions = new Set(['.md', '.markdown', '.mdown', '.mkd', '.txt']);
const automatedCapture = Boolean(process.env.LEAFMD_CAPTURE_PATH);
if (automatedCapture) {
  const captureName = path.basename(
    process.env.LEAFMD_CAPTURE_PATH,
    path.extname(process.env.LEAFMD_CAPTURE_PATH)
  ).replace(/[^a-z0-9_-]/gi, '-');
  app.setPath('userData', path.join(app.getPath('temp'), 'md-reader-assistant-qa', captureName));
}

function findMarkdownArgument(argv) {
  return argv.find(arg => markdownExtensions.has(path.extname(arg).toLowerCase()));
}

function preferencesPath() {
  return path.join(app.getPath('userData'), 'preferences.json');
}

async function getPreferences() {
  try {
    const prefs = JSON.parse(await fs.readFile(preferencesPath(), 'utf8'));
    if (automatedCapture && process.env.LEAFMD_CAPTURE_LANGUAGE) {
      prefs.language = process.env.LEAFMD_CAPTURE_LANGUAGE === 'en' ? 'en' : 'zh-CN';
    }
    return prefs;
  } catch {
    return {
      recentFiles: [],
      lastFile: null,
      language: automatedCapture && process.env.LEAFMD_CAPTURE_LANGUAGE === 'en' ? 'en' : 'zh-CN'
    };
  }
}

async function savePreferences(prefs) {
  await fs.mkdir(path.dirname(preferencesPath()), { recursive: true });
  await fs.writeFile(preferencesPath(), JSON.stringify(prefs, null, 2), 'utf8');
}

async function rememberFile(filePath) {
  const prefs = await getPreferences();
  prefs.recentFiles = [filePath, ...(prefs.recentFiles || []).filter(item => item !== filePath)].slice(0, 10);
  prefs.lastFile = filePath;
  await savePreferences(prefs);
  return prefs;
}

async function removeRecentFile(filePath) {
  const prefs = await getPreferences();
  prefs.recentFiles = (prefs.recentFiles || []).filter(item => item !== filePath);
  if (prefs.lastFile === filePath) prefs.lastFile = prefs.recentFiles[0] || null;
  await savePreferences(prefs);
  return prefs;
}

async function readMarkdown(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const stats = await fs.stat(filePath);
  await rememberFile(filePath);
  return {
    path: filePath,
    name: path.basename(filePath),
    directory: path.dirname(filePath),
    content,
    modifiedAt: stats.mtime.toISOString(),
    size: stats.size
  };
}

async function writeMarkdown(filePath, content) {
  await fs.writeFile(filePath, content, 'utf8');
  documentDirty = false;
  return readMarkdown(filePath);
}

async function openPathInWindow(filePath) {
  if (!filePath || !mainWindow) return;
  if (documentDirty) {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: mainT('unsavedTitle'),
      message: mainT('openUnsavedMessage'),
      detail: mainT('openUnsavedDetail'),
      buttons: [mainT('continueEditing'), mainT('discardAndOpen')],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    });
    if (result.response === 0) return;
    documentDirty = false;
  }
  try {
    const doc = await readMarkdown(path.resolve(filePath));
    mainWindow.webContents.send('file:open-from-main', doc);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } catch (error) {
    dialog.showErrorBox(mainT('openError'), error.message);
  }
}

async function collectMarkdownFiles(root, current = root, depth = 0, result = []) {
  if (depth > 5 || result.length >= 800) return result;
  let entries;
  try {
    entries = await fs.readdir(current, { withFileTypes: true });
  } catch {
    return result;
  }
  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name, 'zh-CN', { numeric: true });
  });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdownFiles(root, fullPath, depth + 1, result);
    } else if (markdownExtensions.has(path.extname(entry.name).toLowerCase())) {
      result.push({
        path: fullPath,
        name: entry.name,
        relativePath: path.relative(root, fullPath),
        directory: path.relative(root, path.dirname(fullPath)) || '.'
      });
    }
    if (result.length >= 800) break;
  }
  return result;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 920,
    minHeight: 620,
    show: false,
    backgroundColor: '#f6f4ef',
    title: mainT('appName'),
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#f6f4ef',
      symbolColor: '#4b5349',
      height: 52
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.once('did-finish-load', async () => {
    if (process.env.LEAFMD_CAPTURE_PATH) {
      setTimeout(async () => {
        if (process.env.LEAFMD_CAPTURE_CLICK_LANGUAGE) {
          const language = process.env.LEAFMD_CAPTURE_CLICK_LANGUAGE === 'en' ? 'en' : 'zh-CN';
          await mainWindow.webContents.executeJavaScript(`document.querySelector('[data-language="${language}"]')?.click()`);
        }
        if (process.env.LEAFMD_CAPTURE_MENU === '1') {
          await mainWindow.webContents.executeJavaScript("document.querySelector('#moreMenu')?.classList.remove('hidden')");
        }
        await new Promise(resolve => setTimeout(resolve, 120));
        const image = await mainWindow.webContents.capturePage();
        await fs.writeFile(process.env.LEAFMD_CAPTURE_PATH, image.toPNG());
        forceClose = true;
        app.quit();
      }, 1600);
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.on('close', event => {
    if (!documentDirty || forceClose) return;
    event.preventDefault();
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: mainT('unsavedTitle'),
      message: mainT('exitUnsavedMessage'),
      detail: mainT('exitUnsavedDetail'),
      buttons: [mainT('continueEditing'), mainT('discardAndExit')],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    }).then(result => {
      if (result.response === 1) {
        forceClose = true;
        mainWindow.close();
      }
    });
  });
}

const hasSingleInstanceLock = automatedCapture || app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

if (!automatedCapture) app.on('second-instance', (_event, argv) => {
  const filePath = findMarkdownArgument(argv);
  if (filePath) openPathInWindow(filePath);
  else if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

if (hasSingleInstanceLock) app.whenReady().then(async () => {
  const savedPreferences = await getPreferences();
  appLanguage = savedPreferences.language === 'en' ? 'en' : 'zh-CN';
  ipcMain.handle('dialog:open-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: mainT('openMarkdown'),
      properties: ['openFile'],
      filters: [
        { name: mainT('markdownDocument'), extensions: ['md', 'markdown', 'mdown', 'mkd'] },
        { name: mainT('textFile'), extensions: ['txt'] },
        { name: mainT('allFiles'), extensions: ['*'] }
      ]
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return readMarkdown(result.filePaths[0]);
  });

  ipcMain.handle('dialog:open-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: mainT('openFolder'),
      properties: ['openDirectory']
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const root = result.filePaths[0];
    return { root, name: path.basename(root), files: await collectMarkdownFiles(root) };
  });

  ipcMain.handle('file:read', async (_event, filePath) => readMarkdown(filePath));
  ipcMain.handle('file:save', async (_event, filePath, content) => writeMarkdown(filePath, content));
  ipcMain.handle('file:save-as', async (_event, currentPath, content) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: mainT('saveAsMarkdown'),
      defaultPath: currentPath || mainT('newDocument'),
      filters: [
        { name: mainT('markdownDocument'), extensions: ['md'] },
        { name: mainT('textFile'), extensions: ['txt'] }
      ]
    });
    if (result.canceled || !result.filePath) return null;
    return writeMarkdown(result.filePath, content);
  });
  ipcMain.on('editor:set-dirty', (_event, dirty) => {
    documentDirty = Boolean(dirty);
    if (mainWindow) mainWindow.setDocumentEdited(documentDirty);
  });
  ipcMain.handle('folder:list', async (_event, root) => ({
    root,
    name: path.basename(root),
    files: await collectMarkdownFiles(root)
  }));
  ipcMain.handle('prefs:get', async () => getPreferences());
  ipcMain.handle('prefs:remove-recent', async (_event, filePath) => removeRecentFile(filePath));
  ipcMain.handle('app:get-initial-file', async () => {
    const initialFile = findMarkdownArgument(process.argv);
    if (!initialFile) return null;
    try {
      return await readMarkdown(path.resolve(initialFile));
    } catch {
      return null;
    }
  });
  ipcMain.handle('app:get-startup-mode', () => process.argv.includes('--edit') ? 'edit' : 'preview');
  ipcMain.handle('path:dirname', (_event, filePath) => path.dirname(filePath));
  ipcMain.handle('app:show-in-folder', (_event, filePath) => shell.showItemInFolder(filePath));
  ipcMain.handle('app:open-external', (_event, url) => {
    if (/^https?:\/\//i.test(url)) return shell.openExternal(url);
  });
  ipcMain.handle('app:open-default-apps', () => shell.openExternal('ms-settings:defaultapps'));
  ipcMain.handle('app:print', () => mainWindow.webContents.print({ printBackground: true }));
  ipcMain.handle('app:set-theme', (_event, dark) => {
    mainWindow.setTitleBarOverlay({
      color: dark ? '#171a18' : '#f6f4ef',
      symbolColor: dark ? '#e7e7df' : '#4b5349',
      height: 52
    });
  });
  ipcMain.handle('app:set-language', async (_event, language) => {
    appLanguage = language === 'en' ? 'en' : 'zh-CN';
    const prefs = await getPreferences();
    prefs.language = appLanguage;
    await savePreferences(prefs);
    return appLanguage;
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
