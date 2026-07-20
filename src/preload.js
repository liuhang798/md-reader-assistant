const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('leafMD', {
  openFile: () => ipcRenderer.invoke('dialog:open-file'),
  openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
  readFile: filePath => ipcRenderer.invoke('file:read', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('file:save', filePath, content),
  saveAs: (filePath, content) => ipcRenderer.invoke('file:save-as', filePath, content),
  setDirty: dirty => ipcRenderer.send('editor:set-dirty', dirty),
  listFolder: root => ipcRenderer.invoke('folder:list', root),
  getPreferences: () => ipcRenderer.invoke('prefs:get'),
  removeRecent: filePath => ipcRenderer.invoke('prefs:remove-recent', filePath),
  getInitialFile: () => ipcRenderer.invoke('app:get-initial-file'),
  getStartupMode: () => ipcRenderer.invoke('app:get-startup-mode'),
  dirname: filePath => ipcRenderer.invoke('path:dirname', filePath),
  showInFolder: filePath => ipcRenderer.invoke('app:show-in-folder', filePath),
  openExternal: url => ipcRenderer.invoke('app:open-external', url),
  openDefaultApps: () => ipcRenderer.invoke('app:open-default-apps'),
  print: () => ipcRenderer.invoke('app:print'),
  setTheme: dark => ipcRenderer.invoke('app:set-theme', dark),
  pathForFile: file => webUtils.getPathForFile(file),
  onOpenFile: callback => ipcRenderer.on('file:open-from-main', (_event, doc) => callback(doc))
});
