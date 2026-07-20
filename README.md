# MD阅读助手 / MD Reader Assistant

> Windows 本地 Markdown 阅读、实时预览与语法高亮编辑器  
> A local Markdown reader with live preview and syntax-highlighted editing for Windows.

[中文](#中文) · [English](#english)

---

## 项目截图 / Screenshots

### 欢迎首页 / Welcome

![MD阅读助手欢迎首页](screenshots/01-home.png)

### Markdown 阅读模式 / Reader

![MD阅读助手 Markdown 阅读模式](screenshots/02-reader.png)

### 左侧实时预览、右侧语法高亮编辑 / Split Editor

![MD阅读助手分栏编辑模式](screenshots/03-split-editor.png)

---

## 中文

MD阅读助手是一款面向 Windows 的本地 Markdown 阅读与编辑工具。它提供舒适的长文阅读排版、章节导航，以及左侧实时预览、右侧语法高亮编辑的分栏工作区。

### 技术栈

- JavaScript：应用逻辑与 Electron 主进程、渲染进程
- HTML + CSS：Windows 桌面界面与阅读排版
- Electron + Node.js：跨 Windows 桌面运行和本地文件访问
- CodeMirror：Markdown 语法高亮编辑器
- Marked、DOMPurify、highlight.js：Markdown 渲染、安全处理与代码高亮
- electron-builder + NSIS：生成 Windows 分步安装程序和文件关联

### 功能特色

- 打开 `.md`、`.markdown`、`.mdown`、`.mkd` 和 `.txt` 文档
- 打开文件夹并集中浏览其中的 Markdown 文件
- 最近阅读即时更新，可移除记录而不删除原始文件
- GitHub 风格 Markdown、表格、任务列表、引用和代码高亮
- 右侧章节目录点击定位、滚动跟随和当前章节高亮
- CodeMirror 编辑器：行号、折叠、语法高亮、自动换行和编辑器内搜索
- 左侧实时预览、右侧源码编辑，输入后自动刷新预览
- 保存、另存为和未保存退出保护
- 明暗主题、阅读字号调整、文档内搜索和打印
- 长文阅读进度、预计阅读时间及“回到顶部”按钮
- Windows 安装向导、桌面快捷方式和 Markdown 文件关联

### 系统要求

- Windows 10 或 Windows 11，64 位
- Node.js 20 或更高版本（仅源码开发需要）

### 本地开发

```powershell
npm install
npm run dev
```

### 构建安装程序

```powershell
npm run build
```

构建产物位于 `release` 目录，文件名类似：

```text
MD阅读助手-安装程序-1.3.1-x64.exe
```

### 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Ctrl + O` | 打开文档 |
| `Ctrl + Shift + O` | 打开文件夹 |
| `Ctrl + E` | 切换阅读/编辑模式 |
| `Ctrl + S` | 保存 |
| `Ctrl + Shift + S` | 另存为 |
| `Ctrl + F` | 搜索 |
| `Ctrl + P` | 打印 |
| `Ctrl + 0` | 恢复默认字号 |

### 项目结构

```text
MD阅读助手/
├─ src/                 Electron 主进程、预加载脚本与界面源码
├─ scripts/             应用图标生成脚本
├─ build/               应用图标资源
├─ package.json         项目与打包配置
├─ package-lock.json    依赖锁定文件
├─ LICENSE              MIT 开源许可
└─ README.md            中英文项目说明
```

### 隐私

文档读取、编辑、搜索和渲染均在本地完成。应用不会主动上传文档内容。

### 参与贡献

欢迎提交 Issue 和 Pull Request。提交代码前，请确保 `npm run build:renderer` 能够正常完成，并尽量说明修改目的和验证方式。

### 开源许可

本项目采用 [MIT License](LICENSE)。

---

## English

MD Reader Assistant is a local Markdown reader and editor for Windows. It combines a calm long-form reading experience, navigable document outlines, and a split workspace with live preview on the left and syntax-highlighted editing on the right.

### Technology Stack

- JavaScript for application logic and Electron processes
- HTML and CSS for the Windows desktop UI and reading layout
- Electron and Node.js for desktop runtime and local file access
- CodeMirror for syntax-highlighted Markdown editing
- Marked, DOMPurify, and highlight.js for rendering, sanitization, and code highlighting
- electron-builder and NSIS for the guided Windows installer and file associations

### Features

- Open `.md`, `.markdown`, `.mdown`, `.mkd`, and `.txt` documents
- Browse Markdown files from an entire folder
- Update recent documents immediately and remove history entries without deleting files
- GitHub-flavored Markdown, tables, task lists, blockquotes, and code highlighting
- Clickable document outline with scroll tracking and active-section highlighting
- CodeMirror editor with line numbers, folding, syntax highlighting, wrapping, and search
- Live preview on the left and source editing on the right
- Save, Save As, and unsaved-change protection
- Light/dark themes, adjustable reading size, in-document search, and printing
- Reading progress, estimated reading time, and a back-to-top button
- Guided Windows installer, desktop shortcut, and Markdown file associations

### Requirements

- 64-bit Windows 10 or Windows 11
- Node.js 20 or later for source development

### Development

```powershell
npm install
npm run dev
```

### Build the Windows Installer

```powershell
npm run build
```

Build artifacts are written to `release`, for example:

```text
MD阅读助手-安装程序-1.3.1-x64.exe
```

### Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + O` | Open document |
| `Ctrl + Shift + O` | Open folder |
| `Ctrl + E` | Toggle reader/editor mode |
| `Ctrl + S` | Save |
| `Ctrl + Shift + S` | Save As |
| `Ctrl + F` | Search |
| `Ctrl + P` | Print |
| `Ctrl + 0` | Reset text size |

### Project Structure

```text
MD阅读助手/
├─ src/                 Electron main process, preload, and UI source
├─ scripts/             Application icon generator
├─ build/               Application icon assets
├─ package.json         Project and packaging configuration
├─ package-lock.json    Dependency lockfile
├─ LICENSE              MIT license
└─ README.md            Chinese and English documentation
```

### Privacy

Documents are read, edited, searched, and rendered locally. The application does not upload document content.

### Contributing

Issues and pull requests are welcome. Before submitting code, make sure `npm run build:renderer` completes successfully and describe the purpose of the change and how it was verified.

### License

This project is released under the [MIT License](LICENSE).
