import './styles.css';
import * as Backend from '../wailsjs/go/main/App.js';
import {
  EventsOn,
  WindowMinimise,
  WindowToggleMaximise
} from '../wailsjs/runtime/runtime.js';

const desktopRuntime = Boolean(window.go?.main?.App && window.runtime);
const resolved = value => Promise.resolve(value);
const mockUpdate = new URLSearchParams(window.location.search).has('mockUpdate');

window.leafMD = {
  openFile: () => desktopRuntime ? Backend.OpenFile() : resolved(null),
  openFolder: () => desktopRuntime ? Backend.OpenFolder() : resolved(null),
  readFile: filePath => desktopRuntime ? Backend.ReadFile(filePath) : resolved(null),
  saveFile: (filePath, content) => desktopRuntime ? Backend.SaveFile(filePath, content) : resolved(null),
  saveAs: (filePath, content) => desktopRuntime ? Backend.SaveAs(filePath, content) : resolved(null),
  setDirty: dirty => desktopRuntime ? Backend.SetDirty(dirty) : resolved(),
  listFolder: root => desktopRuntime ? Backend.ListFolder(root) : resolved({ root, files: [] }),
  getPreferences: () => desktopRuntime
    ? Backend.GetPreferences()
    : resolved({ language: localStorage.getItem('language') || 'zh-CN', recentFiles: [] }),
  removeRecent: filePath => desktopRuntime ? Backend.RemoveRecent(filePath) : resolved(),
  getInitialFile: () => desktopRuntime ? Backend.GetInitialFile() : resolved(null),
  getStartupMode: () => desktopRuntime ? Backend.GetStartupMode() : resolved('preview'),
  dirname: filePath => desktopRuntime ? Backend.Dirname(filePath) : resolved(filePath),
  showInFolder: filePath => desktopRuntime ? Backend.ShowInFolder(filePath) : resolved(),
  openExternal: url => desktopRuntime ? Backend.OpenExternal(url) : window.open(url, '_blank', 'noopener,noreferrer'),
  openDefaultApps: () => desktopRuntime ? Backend.OpenDefaultApps() : resolved(),
  print: () => desktopRuntime ? Backend.Print() : window.print(),
  setTheme: dark => desktopRuntime ? Backend.SetTheme(dark) : resolved(),
  setLanguage: language => desktopRuntime ? Backend.SetLanguage(language) : resolved(),
  checkForUpdates: force => desktopRuntime
    ? Backend.CheckForUpdates(force)
    : resolved(mockUpdate
      ? {
          checked: true,
          available: true,
          currentVersion: '2.2.1',
          latestVersion: '2.3.0',
          releaseName: 'MD阅读助手 2.3.0',
          releaseNotes: '新增阅读模式快捷操作\n优化大文档加载性能\n修复若干已知问题',
          releaseUrl: 'https://github.com/liuhang798/md-reader-assistant/releases/latest'
        }
      : { checked: true, available: false, currentVersion: '2.2.1', latestVersion: '2.2.1' }),
  pathForFile: file => file?.path || '',
  onOpenFile: callback => desktopRuntime ? EventsOn('file:open-from-main', callback) : () => {},
  onFileDrop: callback => {
    if (window.runtime?.OnFileDrop) {
      window.runtime.OnFileDrop((_x, _y, paths) => callback(paths || []), false);
    }
  },
  minimiseWindow: () => desktopRuntime && WindowMinimise(),
  toggleMaximiseWindow: () => desktopRuntime && WindowToggleMaximise(),
  closeWindow: () => desktopRuntime && Backend.RequestQuit()
};

await import('./renderer.js');
