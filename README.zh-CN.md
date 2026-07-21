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

前往 [GitHub Releases](https://github.com/liuhang798/md-reader-assistant/releases/latest) 下载对应系统的最新版本。Windows 用户运行 `MD阅读助手-安装程序-版本-amd64.exe`，按安装向导操作即可；安装程序支持创建桌面快捷方式和 Markdown 文件关联。

## 主要功能

- 美观舒适的 Markdown 阅读与编辑界面。
- 左侧实时预览、右侧 Markdown 语法高亮编辑。
- 点击目录定位章节、当前章节跟随、文档搜索、打印和回到顶部。
- 打开文档后立即进入最近阅读，并可单独删除阅读记录。
- 简体中文和 English 界面切换，并自动记忆语言选择。
- 明暗主题和阅读字号调节。
- 打开文档文件夹、集中浏览 Markdown，并支持拖入文件。
- 原生打开/保存窗口，关联 `.md`、`.markdown`、`.mdown`、`.mkd` 文件。
- 单实例打开文件和未保存修改保护。
- 全新分栏阅读/编辑品牌图标，采用透明圆角边缘、无白色方底；“关于”页面包含作者邮箱和可直达的开源仓库。
- 启动时每日自动检查一次 GitHub Releases；发现新版本后可查看更新说明并直接打开下载页面，设置菜单也支持手动检查。

## 项目截图

| 首页 | 阅读界面 |
|---|---|
| ![首页](screenshots/01-home.png) | ![阅读界面](screenshots/02-reader.png) |

![左右分栏编辑](screenshots/03-split-editor.png)

![关于页面](screenshots/04-about.png)

![发现新版本](screenshots/05-update-available.png)

## Go + Wails 2.0

2.0 版本开始使用 Go 和 Wails 替换 Electron，同时保留现有 HTML/CSS 界面和 CodeMirror 编辑器。当前 Windows 安装包约为 **8.3 MB**，原 Electron 安装包约为 90 MB。

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

推送 `v2.2.1` 等版本标签后，`.github/workflows/release.yml` 会自动构建三个系统的安装包并发布到 GitHub Releases。客户端会根据仓库的最新稳定 Release 提醒更新。

## 项目文档

- [更新记录](CHANGELOG.md)
- [贡献指南](CONTRIBUTING.md)
- [安全策略](SECURITY.md)
- [发布指南](RELEASING.md)
- [设计验收记录](design-qa.md)

## 开源协议

[MIT](LICENSE)
