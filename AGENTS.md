# MD阅读助手：AI 项目技术指南

本文是提供给代码代理、自动化编程助手和新维护者的项目上下文。开始修改前应完整阅读本文，再按任务范围查看相关源码。

## 1. 项目概览

- 项目名称：MD阅读助手 / MD Reader Assistant
- 仓库：`https://github.com/liuhang798/md-reader-assistant`
- 当前版本：`2.2.4`
- 开源协议：MIT
- 产品定位：极度轻量、美观、跨平台的 Markdown 阅读与编辑工具
- 支持平台：Windows x64、macOS Universal、Linux x64
- Windows 安装包：约 7 MB
- UI 语言：简体中文、English

核心产品体验是“阅读优先、编辑顺手”：普通状态显示沉浸式阅读页面；进入编辑状态后，左侧实时预览，右侧显示 Markdown 语法高亮编辑器。

## 2. 技术栈

| 层级 | 技术 | 主要职责 |
|---|---|---|
| 桌面框架 | Wails 2.13 | Go 与 WebView 前端绑定、窗口、文件拖放、平台集成 |
| 后端 | Go 1.25 | 文件读写、最近记录、草稿、图片读取、系统操作、更新检查 |
| 前端 | 原生 HTML、CSS、JavaScript | 页面结构、交互、状态管理、双语界面 |
| 构建 | Vite 7 | 前端打包，输出到 `frontend/dist` |
| 编辑器 | CodeMirror 6 | Markdown 编辑、语法高亮、撤回历史、快捷键 |
| Markdown | marked | Markdown 转 HTML |
| 安全清理 | DOMPurify | 清理渲染后的 HTML |
| 代码高亮 | highlight.js | Markdown 代码块高亮 |
| Windows 安装 | NSIS | 分步安装、快捷方式、文件关联、覆盖升级 |
| CI/CD | GitHub Actions | Windows、macOS、Linux 构建及 GitHub Release 发布 |

项目没有 React、Vue、Electron、数据库或远程业务服务。不要为了小功能引入大型前端框架。

## 3. 运行时架构

```text
用户操作
  ↓
frontend/index.html + frontend/src/renderer.js
  ↓ window.leafMD
frontend/src/main.js（统一桥接层）
  ↓ Wails 生成绑定
app.go / updates.go（Go 后端）
  ↓
本地文件系统、Windows/macOS/Linux 系统能力、GitHub Releases API
```

`main.go` 使用 `//go:embed all:frontend/dist` 将前端产物嵌入最终可执行文件。正常构建必须先生成 `frontend/dist`；常规 `wails build` 会按 `wails.json` 自动执行前端安装和构建步骤。

## 4. 目录与文件职责

| 路径 | 职责 |
|---|---|
| `main.go` | Wails 应用入口、窗口尺寸、单实例、拖放、macOS 菜单和平台窗口配置 |
| `app.go` | 文档、文件夹、偏好设置、最近阅读、临时草稿、本地图片和系统集成 |
| `updates.go` | GitHub Release 更新检查、版本比较、30 天暂停提醒 |
| `app_test.go` | 后端单元测试、版本一致性和关键业务规则回归测试 |
| `frontend/index.html` | 标题栏、侧栏、阅读页、分栏编辑器、菜单及弹窗结构 |
| `frontend/src/main.js` | Wails 后端桥接、浏览器预览降级、平台检测 |
| `frontend/src/renderer.js` | 前端状态、编辑器、Markdown 渲染、文件列表和全部交互 |
| `frontend/src/styles.css` | 主题、布局、响应式、macOS/Windows 差异和打印样式 |
| `frontend/wailsjs/` | Wails 自动生成绑定；Go 公开方法变化后需要重新生成 |
| `build/` | 应用图标、Windows 资源及 NSIS 安装器配置 |
| `build/windows/installer/project.nsi` | 自定义 Windows 安装、升级清理、快捷方式和卸载逻辑 |
| `build/windows/installer/wails_tools.nsh` | Wails 生成文件，通常不要手工修改 |
| `packaging/linux/` | DEB、AppImage、桌面文件和 MIME 配置 |
| `.github/workflows/release.yml` | 三平台构建、产物命名、Release 更新与发布说明提取 |
| `README.md` | 英文项目主页 |
| `README.zh-CN.md` | 简体中文项目主页 |
| `CHANGELOG.md` | 中英文版本升级日志，也是应用更新弹窗和 Release notes 的来源 |
| `RELEASING.md` | 版本发布操作指南 |
| `push-to-github.bat` | Windows 双击自动拉取、提交并推送源码 |

`frontend/dist`、`frontend/node_modules`、`build/bin` 是生成目录，已被 `.gitignore` 排除，不应提交。

## 5. 主要功能

### 阅读

- Markdown 渲染、代码高亮、表格、引用、列表和图片。
- 自动生成右侧本页目录，点击后滚动到标题位置。
- 当前章节跟随、阅读进度、阅读时长和字数估算。
- 文档内搜索、打印、定位文件、回到顶部。
- 明暗主题和阅读字号缩放。

### 编辑

- 左侧实时预览、右侧 CodeMirror Markdown 编辑。
- Markdown 语法颜色高亮。
- `Ctrl/Cmd + B` 加粗、`Ctrl/Cmd + I` 斜体、`Ctrl/Cmd + K` 链接。
- 标题、引用、有序列表、无序列表、任务列表。
- 行内代码、代码块、表格行列选择、图片选择。
- 工具栏撤回和 `Ctrl/Cmd + Z`。
- 编辑时每 10 秒自动保存。
- `Ctrl/Cmd + S` 保存、`Ctrl/Cmd + Shift + S` 另存为。

### 文档管理

- 打开单个 Markdown 或文本文件。
- 新建 Markdown 文档后立即进入编辑。
- 打开文件夹并使用资源浏览器集中查看文档。
- 打开文档后立即进入最近阅读，支持删除单条记录。
- 单实例：再次打开 `.md` 文件时交给已有窗口处理。
- 支持拖放文件和系统文件关联。

### 平台与发布

- Windows：自绘标题栏、NSIS 安装、桌面快捷方式、Markdown 文件关联。
- macOS：原生左侧窗口控制按钮、系统菜单和 Command 快捷键。
- Linux：DEB 与 AppImage。
- 启动时检查 GitHub 最新稳定 Release。
- 更新弹窗显示 Markdown 更新说明并打开下载页面。
- 可暂停自动更新提醒 30 天，手动检查不受限制。

## 6. Go 数据模型

### `Document`

- `path`：文档绝对路径。
- `name`：文件名。
- `directory`：所在目录。
- `content`：UTF-8 文本内容。
- `modifiedAt`：RFC3339Nano 修改时间。
- `size`：字节数。
- `replacedPath`：新建草稿另存成功后被替换的旧路径，供前端清理列表。

### `Preferences`

偏好文件位于 `os.UserConfigDir()/MD阅读助手/preferences.json`，主要字段：

- `recentFiles`：最多 10 个最近文档路径。
- `draftFiles`：自动创建但尚未完成“另存为”替换的草稿路径。
- `lastFile`：最近一个文档。
- `language`：`zh-CN` 或 `en`。
- `lastUpdateCheck`：上次更新检查时间。
- `suppressUpdateUntil`：暂停自动更新提醒的截止时间。

偏好文件可能来自旧版本。新增字段必须允许缺失，并为 `nil` 切片补默认值。

## 7. Go 后端接口

Wails 会将 `App` 的公开方法暴露给前端。主要接口按领域分组如下：

### 文档

- `OpenFile()`：显示系统选择窗口并读取文档。
- `NewFile()`：静默创建唯一文件名，优先写入应用目录，不可写时回退到用户 Documents。
- `ReadFile(path)`：读取指定文件并写入最近阅读。
- `SaveFile(path, content)`：覆盖保存。
- `SaveAs(currentPath, content)`：另存并处理临时草稿替换。
- `SetDirty(bool)`：同步未保存状态，关闭窗口时用于保护内容。

### 文件夹与记录

- `OpenFolder()`：选择目录并返回 Markdown 文件列表。
- `ListFolder(root)`：递归深度最多 5 层、最多 800 个文件。
- `GetPreferences()`：读取偏好。
- `RemoveRecent(path)`：只删除最近记录，不删除原文件。

### 图片

- `SelectImage(currentFile)`：选择图片，尽可能返回相对文档路径。
- `ReadImageData(imagePath, documentDirectory)`：读取本地图片并返回 data URL。

### 系统

- `ShowInFolder(path)`、`OpenExternal(url)`、`OpenDefaultApps()`、`Print()`。
- `SetTheme(dark)`、`SetLanguage(language)`、`RequestQuit()`。
- `GetInitialFile()`、`GetStartupMode()`、`Dirname(path)`。

### 更新

- `CheckForUpdates(force)`：读取 GitHub 最新稳定 Release；`force=true` 跳过暂停提醒限制。
- `SnoozeUpdates(days)`：保存暂停提醒时间，限制在 1–365 天。

## 8. 前端状态与桥接

前端禁止在多个文件中直接调用 `window.go.main.App`。所有后端调用统一通过 `frontend/src/main.js` 暴露的 `window.leafMD`，这样浏览器预览和桌面运行可以共享代码。

`renderer.js` 的 `state` 是当前唯一前端状态源：

- `currentFile`：当前文档。
- `files`、`recentFiles`、`explorerFiles`：侧栏数据。
- `root`、`sidebarMode`：资源浏览器状态。
- `editing`、`dirty`、`savedContent`、`saving`：编辑与保存状态。
- `dark`、`fontScale`、`language`：用户界面偏好。
- `updateInfo`：更新弹窗内容。

当前项目没有状态管理库。新增状态应优先扩展现有 `state`，避免出现第二套状态源。

## 9. 关键业务数据流

### 打开文档

1. 前端检查 `dirty`，必要时询问是否放弃更改。
2. 调用 `OpenFile` 或 `ReadFile`。
3. Go 读取文件并立即写入最近记录。
4. 前端 `displayDocument` 同步当前文件、最近列表、阅读页和编辑器基线。

### 编辑与自动保存

1. 进入编辑时创建 CodeMirror 状态并显示分栏。
2. 文本变化后更新 `currentFile.content` 和 `dirty`。
3. 约 90ms 防抖刷新左侧预览。
4. 每 10 秒检查一次；仅在 `editing && dirty && !saving` 时保存。
5. 保存完成后比较编辑器当前内容和发起保存时的快照，防止保存期间继续输入导致内容被旧结果覆盖。

### 撤回安全边界

打开不同文档时必须创建全新的 `EditorState`，不能只通过普通文本替换写入 CodeMirror。这样旧文档撤回历史不会泄漏到新文档，且 `Ctrl/Cmd + Z` 最多回到刚从磁盘载入的原始内容。

### 新建与另存为

1. `NewFile` 使用 `O_CREATE|O_EXCL` 创建带时间戳的唯一文件。
2. 新文件路径同时记录到内存和 `Preferences.draftFiles`，因此重启后仍能识别。
3. 自动保存只更新该草稿，不取消草稿身份。
4. “另存为”成功且新旧路径不同时，删除自动草稿及其最近记录。
5. 返回 `Document.replacedPath`，前端立即删除对应列表项。
6. 普通已有文档永远不能被上述清理逻辑删除。

### 本地图片

WebView 会限制直接访问 `file://` 图片。Markdown 源码仍保存正常的绝对或相对路径，但预览时必须调用 `ReadImageData`，由 Go 读取文件并返回 base64 data URL。不要重新改回直接设置 `file:///...`。

### 更新检查

启动约 1.2 秒后调用自动检查。GitHub API 返回最新非草稿、非预发布 Release；版本高于 `appVersion` 时显示更新弹窗。`CHANGELOG.md` 当前版本段会被发布流程提取为 Release notes，客户端再显示该说明。

## 10. 必须保持的产品规则

1. 打开的文档必须立即出现在最近阅读，而不是下次启动后才出现。
2. 删除最近记录不能删除用户原文件。
3. 新建草稿另存后必须清除原草稿和重复记录；普通文件另存不能删除原文件。
4. 自动保存不能覆盖保存过程中继续输入的新内容。
5. 切换文档必须隔离撤回历史，不能把原始文档撤回成空白。
6. 本地图片必须经 Go 后端读取，Markdown 路径本身保持可移植。
7. 右侧目录点击必须准确滚动到正文标题。
8. macOS 使用原生窗口按钮和菜单，不能显示 Windows 自绘窗口按钮。
9. Windows 安装始终使用 current-user scope；CI 手动调用 NSIS 时必须同时传入：
   - `-DWAILS_INSTALL_SCOPE=user`
   - `-DREQUEST_EXECUTION_LEVEL=user`
10. 升级安装不能生成重复桌面图标或重复卸载项，并且必须自动沿用上次选择的安装目录；兼容旧版时可从卸载项的 `DisplayIcon` 反推目录。安装完成页默认勾选运行应用，但必须允许用户取消。
11. Windows 安装向导必须提供简体中文与 English；仅全新安装写入 `first-run-language.flag`，用户选择语言后删除。macOS/Linux 以偏好文件是否存在判断首次运行；旧版本升级绝不能出现首次语言选择。
12. 版本号、安装包名称、关于窗口、更新检查和 CHANGELOG 必须一致。

## 11. 安全边界

- Markdown HTML 必须经过 DOMPurify，不能直接信任用户文档中的 HTML。
- 外部地址只允许 `http`/`https`，由 `OpenExternal` 校验后交给系统浏览器。
- 本地图片限制为图片 MIME，单张预览上限 25 MB。
- 文件夹遍历限制深度和数量，并跳过隐藏目录与 `node_modules`。
- 所有文件路径使用 `filepath.Clean`/`filepath.Abs`；Windows 路径比较需考虑大小写。
- 不要将个人令牌、GitHub Token、签名证书或用户文件加入仓库。
- 未配置 Windows Authenticode 和 Apple Developer ID；文档必须如实说明未签名构建可能触发安全提示。

## 12. 修改代码的推荐流程

1. 阅读本文件和任务相关源码。
2. 检查工作区现有改动，保留用户未提交内容。
3. 只修改任务范围内文件。
4. Go API 变化后重新生成/核对 `frontend/wailsjs` 绑定。
5. 用户可见变化同步更新中英文 UI 文案、README 和 CHANGELOG。
6. 补充或修改 `app_test.go` 回归测试。
7. 运行测试和生产构建。
8. 检查 `git diff --check` 和版本一致性。
9. 需要发布时再生成安装包；不要提交生成目录。

## 13. 本地开发与验证

要求：Go 1.25、Node.js 22、Wails 2.13，以及当前平台对应的 Wails 系统依赖。

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.13.0
cd frontend
npm install
cd ..
wails dev
```

最低验证集：

```bash
go test ./...
go vet ./...
cd frontend
npm install
npm run build
```

Windows 安装包：

```bash
wails build -clean -platform windows/amd64 -nsis -installscope user -webview2 embed -trimpath
```

除非已经明确生成并检查过 `frontend/dist`，否则不要使用 `-s`/`-skipbindings` 跳过前端或绑定生成。

## 14. 版本发布

版本号需要同步到：

- `app.go` 的 `appVersion`
- `wails.json` 的 `info.productVersion`
- `frontend/package.json` 与 `frontend/package-lock.json`
- `frontend/index.html`
- `frontend/src/main.js`
- `frontend/src/renderer.js`
- `build/windows/installer/project.nsi`
- `CHANGELOG.md`、`README.md`、`README.zh-CN.md`、`RELEASING.md`

标签必须与版本完全一致，例如 `v2.2.4`。`.github/workflows/release.yml` 会：

1. 验证标签与 `wails.json`。
2. 构建 Windows x64 安装程序。
3. 构建 macOS Universal DMG。
4. 构建 Linux DEB 与 AppImage。
5. 从 CHANGELOG 提取当前版本段。
6. 创建或更新同标签 GitHub Release，并替换同名产物。

发布前还需要人工验证：安装升级、桌面图标、文件关联、macOS 窗口样式、Linux 启动、更新弹窗和下载链接。

## 15. 完成标准

一个修改只有在以下条件全部满足时才算完成：

- 功能满足需求且未破坏上述产品规则。
- Go 测试、`go vet`、JavaScript 语法和前端生产构建通过。
- 跨平台差异已考虑，至少没有引入明显平台专用路径或快捷键错误。
- 用户可见文字具有中英文版本。
- CHANGELOG 和相关 README 已更新。
- 不包含构建产物、依赖目录、凭据或无关改动。
