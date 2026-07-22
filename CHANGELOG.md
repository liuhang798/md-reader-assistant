# Changelog

All notable changes to MD Reader Assistant are documented here.

## [2.2.3] - 2026-07-21

### 简体中文

- 新增 Markdown 格式工具栏：标题、引用、加粗、斜体、链接、有序/无序列表、任务列表、表格、图片、行内代码和代码块。
- 新增 `Ctrl/Cmd + B`、`Ctrl/Cmd + I`、`Ctrl/Cmd + K` 编辑快捷键。
- 新增 Markdown 文件创建功能，无需选择目录即可在安装目录自动创建并进入编辑；安装目录不可写时会自动回退到用户“文档”目录。
- 编辑状态下每 10 秒自动保存，并避免保存期间继续输入造成内容覆盖。
- 左侧文档库新增“最近阅读 / 资源浏览器”双视图及资源列表刷新功能。
- 更新弹窗新增“30 天内不再提醒”，手动检查更新不受该设置影响。
- 调整顶部主操作样式：“新建文档”改为绿色主按钮，“打开文档”改为无背景按钮。
- 编辑工具栏新增撤回按钮；每次打开文档都会建立独立撤回历史，`Ctrl/Cmd + Z` 最多只能回到文档刚打开时的原始内容。
- 修复本地图片预览失败：改由 Go 后端安全读取绝对路径和相对路径图片，不再依赖被 WebView 限制的 `file://` 地址。
- 修复新建文档“另存为”后出现两条最近阅读记录；另存成功后会删除自动创建的临时草稿及其记录，草稿标记在软件重启后仍然有效。
- 修复升级安装后 Windows 可能出现两个“MD阅读助手”应用或快捷方式的问题；安装范围统一为当前用户，安装器会清理旧 Electron/早期版本遗留的重复卸载项和快捷方式。
- Windows 更新安装时自动沿用上次选择的安装目录；从未记录目录的 2.2.2 升级时，也会根据现有卸载信息识别原安装位置。
- Windows 安装完成页默认勾选“运行 MD阅读助手”，点击“完成”后直接启动应用，并允许用户取消勾选。
- Windows 安装向导新增简体中文与 English 语言选择，欢迎页、目录页、安装进度和完成页会使用所选语言。
- 全新安装后第一次启动会要求选择软件界面语言；选择结果会持久保存，后续启动不再弹出，从不含此功能的旧版本升级也不会弹出。

### English

- Added a Markdown formatting toolbar for headings, quotes, bold, italic, links, ordered/unordered/task lists, tables, images, inline code and code blocks.
- Added `Ctrl/Cmd + B`, `Ctrl/Cmd + I` and `Ctrl/Cmd + K` editor shortcuts.
- Added Markdown file creation without a location prompt: files are created beside the application, with a silent fallback to the user's Documents directory when needed.
- Added 10-second autosave while editing, without overwriting changes made during an in-flight save.
- Added Recent and Resource Explorer views to the sidebar, including explorer refresh.
- Added a 30-day update reminder pause; manual update checks always remain available.
- Promoted New Document to the primary toolbar action and changed Open Document to a background-free secondary action.
- Added an Undo toolbar button and per-document history isolation, so `Ctrl/Cmd + Z` stops at the content originally loaded for that document.
- Fixed local image previews by loading image files through the Go backend instead of blocked `file://` URLs.
- Fixed duplicate Recent entries after saving a newly created document under another name; the auto-created draft and its record are removed after a successful Save As, even after restarting the app.
- Fixed duplicate Windows app entries or shortcuts after upgrading by consistently using per-user installation and cleaning stale uninstall records and shortcuts left by Electron or early installers.
- Windows upgrades now reuse the previously selected installation directory, with a compatibility fallback that detects the install location used by 2.2.2.
- The Windows setup completion page now launches MD Reader Assistant by default after Finish, with an option to opt out.
- Added Simplified Chinese and English selection for the complete Windows setup flow.
- A new installation asks for the app interface language on its first launch and remembers the choice; upgrades from versions that predate this feature are explicitly excluded from the prompt.

## [2.2.2] - 2026-07-21

### 简体中文

- macOS 改用左侧原生窗口控制按钮、应用菜单、系统字体和 Command 快捷键，并增大窗口按钮与软件名称之间的距离。
- 启动软件时自动检查 GitHub 最新稳定版本，不再因 24 小时时间限制错过刚发布的更新。
- 更新弹窗现在支持排版显示 Markdown 更新说明。
- GitHub Release 标题和各平台安装包统一采用 `md-reader-assistant 2.2.2` 英文命名。
- 发布流程自动从本文件提取当前版本内容作为更新说明。

### English

- Adopted native left-side macOS window controls, application menus, system fonts, and Command shortcuts, with more space before the app brand.
- Checks the latest stable GitHub Release once on every startup so newly published versions are not missed by a 24-hour throttle.
- Renders Markdown release notes properly in the update dialog.
- Standardized GitHub Release titles and downloadable asset names as `md-reader-assistant 2.2.2` and ASCII-safe platform filenames.
- Automatically extracts the current version section from this changelog for GitHub Release notes.
- Aligned GitHub Actions with Go 1.25 used by the project.

### Fixed

- Removed the Windows-style title-bar controls from macOS builds.
- Existing Releases now replace legacy `MD.-...` assets with consistently named packages.

## [2.2.1] - 2026-07-21

### Added

- Daily background checks for the latest stable GitHub Release.
- Manual update checks from Settings, with release notes and a direct download-page action.
- Bilingual About and update dialogs.

### Changed

- Replaced the Electron desktop shell with Go and Wails while preserving the existing interface and editor workflow.
- Reduced the Windows installer from roughly 90 MB to about 8.3 MB.
- Added a transparent multi-size application icon without a white square canvas.

### Fixed

- Table-of-contents links now navigate to their document sections.
- Opened documents appear in Recent immediately, and individual recent records can be removed.
- The split editor reliably accepts pointer focus and displays live preview on the left.
- Desktop shortcuts are recreated with a versioned icon path to avoid stale Windows icon caching.

[2.2.1]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.2.1
[2.2.2]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.2.2
[2.2.3]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.2.3
