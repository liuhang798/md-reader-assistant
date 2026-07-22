<div align="center">
  <img src="build/appicon.png" width="96" alt="MD阅读助手图标">
  <h1>MD阅读助手</h1>
  <p>美观、专注、跨平台的 Markdown 阅读与编辑工具。</p>
  <p><a href="README.md">English</a> · <strong>简体中文</strong></p>
  <p>
    <a href="https://github.com/liuhang798/md-reader-assistant/actions/workflows/release.yml"><img src="https://github.com/liuhang798/md-reader-assistant/actions/workflows/release.yml/badge.svg" alt="构建状态"></a>
    <a href="https://github.com/liuhang798/md-reader-assistant/releases/latest"><img src="https://img.shields.io/github/v/release/liuhang798/md-reader-assistant" alt="最新版本"></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/liuhang798/md-reader-assistant" alt="MIT 许可证"></a>
  </p>
</div>

## 下载与安装

前往 [GitHub Releases](https://github.com/liuhang798/md-reader-assistant/releases/latest) 下载对应系统的最新版本。Windows 用户运行 `md-reader-assistant-版本-windows-amd64.exe`，按安装向导操作即可；安装程序支持创建桌面快捷方式、Markdown 文件关联，并会在升级时自动沿用上次选择的安装目录。

macOS 版本使用系统原生左侧窗口控制按钮与应用菜单，并支持标准 Command 快捷键。

MD阅读助手是一款基于 Go、Wails、原生 JavaScript 与 Vite 开发的极度轻量跨平台 Markdown 阅读编辑器。Windows 安装包仅约 **7 MB**，同时为 Windows、macOS 和 Linux 提供一致、专注的阅读与编辑体验。

## 2.2.3 更新亮点

- 新增完整 Markdown 格式工具栏、编辑快捷键、表格创建和本地图片插入。
- 新建文档无需选择目录，创建后立即进入编辑，并每 10 秒自动保存。
- 新建文档“另存为”后自动删除临时草稿及重复的最近阅读记录；即使重启软件后再另存也能正确清理，普通已有文档不会被删除。
- 左侧新增资源浏览器，可与最近阅读切换并集中浏览 Markdown 文件夹。
- 每个文档使用独立撤回历史，无法通过撤回误删刚从磁盘载入的原始内容。
- 本地绝对路径和相对路径图片改由 Go 后端读取，预览更加可靠。
- 更新提醒支持暂停 30 天，手动检查更新不受影响。
- Windows 安装器支持覆盖升级，并自动清理旧版本遗留的重复应用项和快捷方式。
- Windows 更新安装时会自动定位到上次选择的安装目录，并兼容从 2.2.2 升级。

## 主要功能

- 美观舒适的 Markdown 阅读与编辑界面。
- 左侧实时预览、右侧 Markdown 语法高亮编辑。
- 编辑工具栏支持标题、引用、加粗、斜体、链接、有序/无序列表、任务列表、表格、图片、行内代码和代码块；同时支持 `Ctrl/Cmd + B`、`Ctrl/Cmd + I`、`Ctrl/Cmd + K`。
- 支持工具栏或 `Ctrl/Cmd + Z` 连续撤回；不同文档的撤回历史相互隔离，无法撤销掉刚打开时的原始内容。
- 支持新建 Markdown 文件并立即编辑，编辑期间每 10 秒自动保存。
- 点击目录定位章节、当前章节跟随、文档搜索、打印和回到顶部。
- 打开文档后立即进入最近阅读，并可单独删除阅读记录。
- 简体中文和 English 界面切换，并自动记忆语言选择。
- 明暗主题和阅读字号调节。
- 左侧可在“最近阅读”和“资源浏览器”间切换，支持打开文件夹、刷新文件列表并集中浏览 Markdown。
- 原生打开/保存窗口，关联 `.md`、`.markdown`、`.mdown`、`.mkd` 文件。
- 单实例打开文件和未保存修改保护。
- 全新分栏阅读/编辑品牌图标，采用透明圆角边缘、无白色方底；“关于”页面包含作者邮箱和可直达的开源仓库。
- 启动时自动检查 GitHub Releases；发现新版本后可查看更新说明、直接打开下载页面，或选择 30 天内不再自动提醒；设置菜单仍支持手动检查。

## 项目截图

| 首页 | 阅读界面 |
|---|---|
| ![首页](screenshots/01-home.png) | ![阅读界面](screenshots/02-reader.png) |

![左右分栏编辑](screenshots/03-split-editor.png)

![关于页面](screenshots/04-about.png)

![发现新版本](screenshots/05-update-available.png)

## Go + Wails 2.0

2.0 版本开始使用 Go 和 Wails 替换 Electron，同时保留现有 HTML/CSS 界面和 CodeMirror 编辑器。当前 Windows 安装包约为 **7 MB**，原 Electron 安装包约为 90 MB。

- 后端：Go 1.23+
- 桌面框架：Wails 2.13
- 前端：HTML、CSS、JavaScript、Vite
- Markdown：marked、DOMPurify、highlight.js
- 编辑器：CodeMirror 6
- Windows 安装：NSIS

## 项目结构

- `main.go`：Wails 应用启动与窗口配置。
- `app.go`：文档、文件夹、最近阅读、偏好设置及桌面系统能力。
- `updates.go`：GitHub Releases 更新检查与版本比较。
- `frontend/`：Markdown 阅读器、CodeMirror 编辑器和双语界面。
- `build/`：应用图标及各平台构建配置。
- `packaging/`：Linux 桌面集成与软件包元数据。
- `scripts/`：可重复执行的项目资源维护脚本。

新建 Markdown 文档时无需选择保存目录，软件会优先保存到安装目录；若安装目录不可写，则自动保存到 `文档/MD Reader Assistant`。新建文档另存后会自动删除临时草稿及重复的最近阅读记录。绝对路径和相对路径引用的本地图片均由 Go 后端安全读取，可在预览区正常显示。

## 多平台版本

发布版本标签后，GitHub Actions 会自动生成：

- Windows x64：分步安装的 NSIS 安装程序
- macOS Universal：同时支持 Intel 和 Apple Silicon 的 DMG
- Linux x64：DEB 和 AppImage

当前开发版本尚未配置付费代码签名证书，因此 Windows 可能出现 SmartScreen 提醒，macOS 可能出现 Gatekeeper 提醒。

## 本地开发

需要安装 Go 1.23+、Node.js 22+、Wails 2.13，以及 Wails 对应平台的系统依赖。

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.13.0
wails dev
```

运行测试：

```bash
go test ./...
cd frontend
npm install
npm run build
```

生成 Windows 安装包：

```bash
wails build -clean -platform windows/amd64 -nsis -installscope user -webview2 embed -trimpath
```

推送 `v2.2.3` 等版本标签后，`.github/workflows/release.yml` 会自动构建三个系统的安装包并发布到 GitHub Releases。客户端会根据仓库的最新稳定 Release 提醒更新。

## 项目文档

- [更新记录](CHANGELOG.md)
- [AI 项目技术指南](AGENTS.md)
- [贡献指南](CONTRIBUTING.md)
- [安全策略](SECURITY.md)
- [发布指南](RELEASING.md)
- [设计验收记录](design-qa.md)

## 开源协议

[MIT](LICENSE)
