<div align="center">
  <img src="build/icon.png" width="88" alt="MD阅读助手图标">
  <h1>MD阅读助手</h1>
  <p>美观易用的 Windows 本地 Markdown 阅读、实时预览与语法高亮编辑器。</p>
  <p><a href="README.md">English</a> · <strong>简体中文</strong></p>
</div>

---

## 项目截图

### 欢迎首页

![MD阅读助手欢迎首页](screenshots/01-home.png)

### Markdown 阅读模式

![MD阅读助手 Markdown 阅读模式](screenshots/02-reader.png)

### 左侧实时预览、右侧语法高亮编辑

![MD阅读助手分栏编辑模式](screenshots/03-split-editor.png)

### 简体中文与 English 界面

![MD阅读助手界面语言选择](screenshots/05-language-switch.png)

## 功能特色

- 打开 `.md`、`.markdown`、`.mdown`、`.mkd` 和 `.txt` 文档
- 打开文件夹并集中浏览其中的 Markdown 文件
- 最近阅读即时更新，可移除记录而不删除原始文件
- GitHub 风格 Markdown、表格、任务列表、引用和代码高亮
- 右侧章节目录点击定位、滚动跟随和当前章节高亮
- CodeMirror 编辑器：行号、折叠、语法高亮、自动换行和编辑器内搜索
- 左侧实时预览、右侧源码编辑，输入后自动刷新预览
- 简体中文与 English 即时切换，并自动记住语言选择
- 保存、另存为和未保存退出保护
- 明暗主题、阅读字号调整、文档内搜索和打印
- 长文阅读进度、预计阅读时间及“回到顶部”按钮
- Windows 安装向导、桌面快捷方式和 Markdown 文件关联

## 技术栈

- JavaScript：应用逻辑与 Electron 主进程、渲染进程
- HTML + CSS：Windows 桌面界面与阅读排版
- Electron + Node.js：桌面运行环境和本地文件访问
- CodeMirror：Markdown 语法高亮编辑器
- Marked、DOMPurify、highlight.js：Markdown 渲染、安全处理与代码高亮
- electron-builder + NSIS：生成 Windows 分步安装程序和文件关联

## 系统要求

- Windows 10 或 Windows 11，64 位
- Node.js 20 或更高版本（仅源码开发需要）

## 本地开发

```powershell
npm install
npm run dev
```

## 构建 Windows 安装程序

```powershell
npm run build
```

构建产物位于 `release` 目录，例如：

```text
MD阅读助手-安装程序-1.4.0-x64.exe
```

## 界面语言

点击右上角的 **更多选项（⋯）**，在“界面语言”中选择 **简体中文** 或 **English**。界面文案与 Windows 文件对话框会立即切换，并在下次启动时自动恢复所选语言。

## 快捷键

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

## 项目结构

```text
MD阅读助手/
├─ src/                 Electron 主进程、预加载脚本和界面源码
├─ scripts/             应用图标生成脚本
├─ build/               应用图标资源
├─ screenshots/         项目截图
├─ package.json         项目与打包配置
├─ package-lock.json    依赖锁定文件
├─ LICENSE              MIT 开源许可证
├─ README.md            英文项目说明
└─ README.zh-CN.md      简体中文项目说明
```

## 隐私

文档读取、编辑、搜索和渲染均在本地完成，应用不会主动上传文档内容。

## 参与贡献

欢迎提交 Issue 和 Pull Request。提交代码前，请确保 `npm run build:renderer` 能够正常完成，并说明修改目的和验证方式。

## 开源许可

本项目采用 [MIT License](LICENSE)。
