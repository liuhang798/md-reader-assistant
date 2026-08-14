# Changelog

All notable changes to MD Reader Assistant are documented here.

## [2.4.3] - 2026-08-14

### 简体中文

- 文字放大缩小现在作用于全局：阅读正文、左侧最近阅读/资源浏览器、右侧本页目录同步缩放。
- 左侧文档库与右侧目录的拖动分隔条不再限制最大宽度，可自由调整（仅保留正文最小空间），宽度自动记忆。

### English

- Text zoom now applies globally: the reading content, the recent/explorer sidebar, and the table of contents all scale together.
- The sidebar and table-of-contents dividers no longer have a maximum width; they can be dragged freely (a minimal content width is kept) and the width is remembered.

## [2.4.2] - 2026-08-14

### 简体中文

- 编辑分栏（左侧预览 / 右侧编辑器）新增拖动分隔条，可自由调整两侧宽度，无最大宽度限制，宽度自动记忆，下次打开保持。
- 编辑模式新增“格式刷”：选中一段带格式的文本（加粗、斜体、删除线、高亮、行内代码、标题、引用或列表），点击工具栏格式刷复制格式，再选中目标文本即自动应用，按 Esc 取消。

### English

- The editor split panes (live preview / editor) now have a draggable divider with no maximum width limit; the width is remembered and restored on the next launch.
- Added a “format painter” to the editor: select text with formatting (bold, italic, strikethrough, highlight, inline code, heading, quote, or list), click the painter button to copy the format, then select the target text to apply it automatically. Press Esc to cancel.

## [2.4.1] - 2026-08-12

### 简体中文

- 编辑模式新增“光标定位预览”：移动光标或输入内容时，左侧实时预览会跟随滚动到当前所在章节/段落，方便边写边看排版效果。
- 编辑器头部新增“退出编辑”按钮，点击即可离开编辑状态回到沉浸式阅读页。
- 插入代码块时可以选择常用编程语言（JavaScript、Python、Go、Java、C/C++、Rust、HTML、SQL 等 19 种），并自动写入带语言标识的围栏代码块。

### English

- Editing now keeps the live preview in sync with the cursor: as the caret moves or you type, the left preview scrolls to the block being edited.
- The editor header now has an “Exit editing” button that returns to the immersive reading view.
- Inserting a code block now lets you pick a common programming language (JavaScript, Python, Go, Java, C/C++, Rust, HTML, SQL, and more), and the language-tagged fence is written automatically.

## [2.4.0] - 2026-08-12

### 简体中文

- 正式发布稳定的 Windows 应用内无安装更新：新版本下载并校验后，由独立 Go 辅助进程等待旧程序退出、替换主程序并自动重启，不再调用安装向导。
- 解决中文用户名或中文安装路径导致更新脚本无法运行，以及更新 helper 自身占用主程序、导致 Windows 拒绝覆盖的问题。
- 更新失败时会把等待超时、文件替换或重启错误写入 `apply-update.log`，并由真实 Windows 端到端测试覆盖完整自更新链路。

### English

- Officially released stable installer-free Windows in-app updates. After downloading and verifying a release, a separate Go helper waits for the old process, replaces the application, and restarts it without launching an installer wizard.
- Fixed both non-ASCII user/install paths that broke command scripts and the updater helper locking the installed executable that Windows needed to replace.
- Update timeout, replacement, and restart failures are recorded in `apply-update.log`, with the complete self-update flow protected by a real Windows end-to-end test.

## [2.3.13] - 2026-08-12

### 简体中文

- 修复 Windows 应用内更新仍可能无法覆盖旧程序的问题：更新辅助进程现在会先复制到独立临时 exe 后再启动，避免辅助进程自身占用安装目录中的主程序文件；下载校验完成后可可靠等待旧进程退出、替换程序并自动重启，无需再次运行安装向导。
- 更新辅助进程会将等待超时、文件替换失败或新版本启动失败的具体原因写入 `apply-update.log`，便于排查权限或安全软件拦截。
- 新增真实 Windows 端到端回归测试，覆盖“安装目录旧程序发起更新、被新二进制替换并自动重启”的完整链路。

### English

- Fixed a remaining Windows in-app update failure: the updater helper is now staged as a separate temporary executable before launch, so it no longer locks the installed application that it must replace. After download verification it can reliably wait for the old process, replace it, and restart without running the installer again.
- The updater now writes explicit timeout, replacement, and restart errors to `apply-update.log` for diagnosing permission or security-software interference.
- Added a real Windows end-to-end regression test covering an installed executable initiating the update, being replaced by the new binary, and restarting automatically.

## [2.3.12] - 2026-08-12

### 简体中文

- 修复 Windows 应用内更新仍可能无法覆盖旧程序的问题：更新辅助进程现在会先复制到独立临时 exe 后再启动，避免辅助进程自身占用安装目录中的主程序文件；下载校验完成后可可靠等待旧进程退出、替换程序并自动重启，无需再次运行安装向导。
- 更新辅助进程会将等待超时、文件替换失败或新版本启动失败的具体原因写入 `apply-update.log`，便于排查权限或安全软件拦截。

### English

- Fixed a remaining Windows in-app update failure: the updater helper is now staged as a separate temporary executable before launch, so it no longer locks the installed application that it must replace. After download verification it can reliably wait for the old process, replace it, and restart without running the installer again.
- The updater now writes explicit timeout, replacement, and restart errors to `apply-update.log` for diagnosing permission or security-software interference.

## [2.3.11] - 2026-08-12

### 简体中文

- 本版本用于验证 Windows 应用内更新的 Go 辅助进程自替换逻辑，无功能变化。

### English

- This release validates the Windows in-app updater's Go helper-process self-replace logic; no functional changes.

## [2.3.10] - 2026-08-12

### 简体中文

- 重构 Windows 应用内更新：替换与重启逻辑改为应用自带的 Go 辅助进程（不再使用 cmd/bat 脚本）。修复 cmd 无法处理中文路径（如用户名含中文时）导致更新脚本从未执行、更新静默失败的问题；等待旧进程退出、替换二进制、启动新版本均由 Go 通过系统 UTF-16 接口完成，并写入日志便于排查。

### English

- Reworked the Windows in-app updater: replacement and restart now run in a Go helper process instead of cmd/bat scripts. This fixes silent failures caused by cmd.exe being unable to resolve non-ASCII paths (for example Chinese user names), which previously meant the update script never ran. Waiting for the old process, replacing the binary and starting the new version all use Go's UTF-16 Win32 calls and are logged for troubleshooting.

## [2.3.9] - 2026-08-12

### 简体中文

- 修复 Windows 应用内更新的替换脚本：脚本改为纯 ASCII 并通过环境变量传递路径（避免中文路径在 cmd 中被错误解析），等待延迟改用 `ping`（修复 GUI 环境下 `timeout` 失效导致更新脚本过早超时的问题）。

### English

- Fixed the Windows in-app updater script: it is now pure ASCII and receives paths through environment variables (so non-ASCII paths survive cmd.exe parsing), and the wait delay uses `ping` instead of `timeout`, which fails when stdin is unavailable in a GUI process.

## [2.3.8] - 2026-08-12

### 简体中文

- 本版本用于验证 Windows 应用内更新的自替换逻辑（便携版与安装版均适用），无功能变化。

### English

- This release validates the Windows in-app updater's self-replace logic (works for both portable and installed deployments); no functional changes.

## [2.3.7] - 2026-08-12

### 简体中文

- 修复 Windows 应用内更新：改为直接替换正在运行的可执行文件（不再依赖静默安装器），绿色便携版与安装版均可自动升级并重启；升级过程写入日志便于排查。

### English

- Fixed Windows in-app updates: the running executable is now replaced directly instead of relying on a silent installer, so both portable and installed deployments upgrade and restart automatically. The update process writes a log for troubleshooting.

## [2.3.6] - 2026-08-12

### 简体中文

- 本版本用于验证应用内自动更新链路，无功能变化。从上一版本开始，macOS 与 Windows 用户可在更新弹窗中直接“下载并更新”，应用内完成下载、完整性校验、替换与自动重启。

### English

- This release validates the in-app automatic update pipeline; no functional changes. Starting from the previous version, macOS and Windows users can pick “Download & Update” in the update dialog to download, verify, replace and restart in-app.

## [2.3.5] - 2026-08-12

### 简体中文

- 兼容纯文本 TXT 文件：阅读页与编辑实时预览按纯文本渲染（保留原始换行与空格，不解析 Markdown 语法），编辑模式使用纯文本语法；可通过“打开文档”对话框、拖放或文件夹浏览直接打开，安装时注册 `.txt` 文件关联，双击即可用本应用打开。
- 插入图片支持填写在线链接：点击工具栏“插入图片”可在弹窗中粘贴 `http://` 或 `https://` 图片地址并附可选图片说明，也可以继续选择本地图片。
- 新增应用内自动更新：检测到新版本后可直接“下载并更新”，应用内下载（带进度条）、校验完整性后自动替换并重启，无需手动下载安装或再到系统设置授权；macOS 与 Windows 均支持，Linux 保持手动下载。

### English

- Plain-text `.txt` files are now fully supported: the reader and the live editor preview render them as-is, preserving line breaks and spaces without Markdown parsing, and the editor uses plain text mode. Files can be opened from the dialog, drag-in, or folder explorer, and the installer registers the `.txt` association so double-clicking opens them directly.
- Inserting an image now supports online links: the image dialog accepts an `http://` or `https://` image URL with an optional description, alongside the existing local file picker.
- Added in-app automatic updates: the update dialog can download and apply the new version directly with a progress bar and integrity check, then restart automatically — no manual download, installer wizard, or macOS Gatekeeper approval needed. Supported on macOS and Windows; Linux keeps the manual download flow.

## [2.3.4] - 2026-08-11

### 简体中文

- 新增当前文档外部修改自动刷新：应用重新获得焦点时会从磁盘重新读取并更新阅读页或无未保存内容的编辑页；若本软件存在未保存编辑则安全跳过，避免覆盖用户输入。
- 新增文档宽度调整：在“更多”菜单中可选择窄 / 中 / 宽 / 全宽四档内容宽度，阅读页与编辑实时预览同时生效并自动记忆。
- 修复阅读页查找主动跳过 Markdown 行内代码和代码块的问题；代码文字现在会进入匹配计数，并支持高亮及上一个/下一个定位。

### English

- Added automatic refresh for externally modified active documents. When the app regains focus, it reloads the reader or a clean editor from disk; local unsaved edits safely block replacement.
- Added document width presets in the More menu: narrow / medium / wide / full width. Both the reader and the live editor preview respect the chosen width, which is remembered.
- Fixed reader search intentionally skipping Markdown inline code and fenced code blocks. Code text now participates in match counts, highlighting, and previous/next navigation.

## [2.3.3] - 2026-08-10

### 简体中文

- 新增文档预览鼠标滚轮缩放：Windows/Linux 使用 `Ctrl + 滚轮`，macOS 使用 `Command + 滚轮`；支持阅读页和编辑模式实时预览，并自动记忆字号。
- 修复 Windows 同版本覆盖安装时，旧快捷方式或 Markdown 文件关联图标被资源管理器占用而导致安装中断的问题；两类关联现在都直接使用程序内置图标，并安全延迟清理旧图标文件。升级时若检测到旧版仍在运行，安装器会提供确认关闭并继续安装的选项。
- 新增持久化文档收藏：可在“最近阅读”和“资源浏览器”中右键收藏或取消收藏，并通过侧栏“收藏”视图集中打开、编辑和定位文档。
- 最近阅读、收藏和资源浏览器中的已收藏文档会显示主题色实心五角星，浏览列表时可快速区分。
- 收藏记录与最近阅读互不影响；取消收藏只移除记录，绝不会删除用户原文件。
- 已移动、删除或磁盘暂时不可用的收藏仍会保留并显示为不可用，方便用户随时取消收藏。
- 新建草稿另存为正式文档后，已有收藏会自动迁移到新路径，避免留下失效或重复记录。

### English

- Added mouse-wheel text zoom for document previews: `Ctrl + wheel` on Windows/Linux and `Command + wheel` on macOS. It works in both the reader and live preview and preserves the selected text size.
- Fixed Windows same-version reinstalls failing when Explorer kept old shortcut or Markdown file-association icons locked. Both associations now use the icon embedded in the executable, while legacy icons are safely removed or deferred until reboot. If the old application is still running, the installer offers to close it and continue.
- Added persistent document favorites. Right-click documents in Recent or Explorer to add or remove them, then manage them from the new Favorites sidebar view.
- Favorited documents display a filled accent-colored star in Recent, Favorites, and Explorer for quick recognition.
- Favorites remain independent from Recent, and removing a favorite never deletes the original file.
- Moved, deleted, or temporarily unavailable favorites remain visible as unavailable records so they can still be removed.
- When a favorited draft is saved as a permanent document, its favorite automatically follows the new path without leaving stale or duplicate entries.

## [2.3.2] - 2026-08-09

### 简体中文

- 修复 macOS 全屏关闭后应用进入后台，再次点击 Dock 图标无法恢复窗口的问题；全屏关闭现在只隐藏应用而不主动隐藏窗口，与普通关闭行为一致，Dock 恢复时再取消应用隐藏并检查全屏残留状态。

### English

- Fixed a macOS issue where, after closing the window from fullscreen and hiding the app, clicking the Dock icon could not bring the window back. Fullscreen close now hides the application only, matching the normal close behaviour, and the Dock reopen path unhides the application first and clears any leftover fullscreen state.

## [2.3.1] - 2026-08-09

### 简体中文

- macOS 自动跟随系统白天/黑夜模式时，现在允许用户临时手动切换；临时选择会保持到系统下一次外观变化，随后自动恢复跟随。
- 修复 macOS 应用在后台运行时点击 Dock 图标偶发不显示窗口或窗口未置于最前方的问题；隐藏或最小化的主窗口现在会恢复并获得焦点。
- 左侧“最近阅读”现在使用右键菜单提供“编辑”“打开所在文件夹”和“移除”；“编辑”会直接打开对应 Markdown 文档并进入编辑模式，不存在的记录仍可移除。
- 修复 macOS 全屏状态下点击左上角关闭按钮偶发只退出全屏、窗口仍然显示的问题；现在会等待原生全屏退出通知后可靠隐藏窗口，并保留超时兜底。

### English

- While following the macOS light/dark appearance automatically, the app now allows a temporary manual switch that remains active until the next system appearance change, when automatic following resumes.
- Fixed an intermittent macOS issue where clicking the Dock icon while the app was running in the background did not show the window or bring it to the front. Hidden and minimized main windows are now restored and focused.
- Recent now provides a right-click menu with Edit, Show in Folder and Remove. Edit opens the selected Markdown document directly in editing mode, while unavailable records can still be removed.
- Fixed an intermittent macOS issue where clicking the top-left close button in fullscreen only exited fullscreen and left the window visible. The app now waits for the native fullscreen-exit notification before reliably hiding the window, with a timeout fallback.

## [2.3.0] - 2026-08-08

### 简体中文

- macOS 现在自动跟随电脑的白天/黑夜外观：启动时立即采用系统模式，系统外观变化时界面和原生标题栏同步切换，不再被旧的本地明暗设置覆盖。
- 修复 macOS 半屏平铺或调整窗口尺寸时原生红、黄、绿按钮短暂上下跳动，以及退出全屏时 Logo 和软件名称复位延迟造成的画面重叠。
- macOS 进入全屏后，Logo 与软件名称会自动向左对齐到内容边距；退出全屏后恢复窗口按钮安全间距，切换过程平滑且不依赖屏幕尺寸猜测。
- macOS 原生红、黄、绿窗口按钮现在会在 42px 轻薄标题栏内垂直居中，并在窗口缩放、重新获得焦点及进出全屏后保持对齐。
- 修复 macOS 新建文档被错误保存在可替换的 `.app` 应用包内、导致重新安装后显示丢失的问题；新文档现在固定保存到用户“文稿/MD Reader Assistant”，不会随应用升级被覆盖，已恢复的旧草稿也会自动更新最近阅读路径。
- 最近阅读会检测原文件是否仍然存在；已删除、移动或暂时无法访问的文档会显示为灰色删除线并禁用打开，同时保留清理记录按钮，避免外接磁盘未挂载时误删历史。
- Markdown 格式工具栏取消横向滚动条，窗口宽度不足时会按优先级自动把格式收进“更多格式”；同时补充粗斜体、自动链接、Markdown 转义和 HTML 区块。
- macOS 新增标准 `Command + W` 关闭窗口快捷键，行为与红色关闭按钮一致；保留 `Command + Q` 真正退出应用及未保存内容确认。
- 补全 Markdown 编辑格式：新增 H4–H6、删除线、高亮、下划线、上下标、分隔线、强制换行、脚注、引用式链接、折叠区块、键盘按键和注释；高亮与脚注已同步支持安全实时预览。
- 修复 macOS 全屏状态下点击红色关闭按钮偶发无法隐藏窗口的问题；应用会先完成退出全屏动画，再可靠隐藏并继续在后台运行。
- macOS 顶部工具条改为更轻薄的原生隐藏标题栏布局，移除额外 Toolbar 空间，并分别适配白天与黑夜模式。
- 移除阅读页与实时预览中行内代码的色块背景，保留清晰的代码文字颜色。
- 左侧当前选中的文档卡片新增随主题变化的轻量描边，让当前文档更易识别。

### English

- macOS now follows the computer's light/dark appearance automatically at launch and whenever the system setting changes, keeping the interface and native title bar in sync without letting an old local mode override the system.
- Fixed native macOS traffic lights briefly jumping vertically during tiling or window resizing, and removed the delayed Logo/title reset that could overlap the controls while leaving fullscreen.
- On macOS, the Logo and application name now move left to the content margin in fullscreen and restore the traffic-light safe area when returning to a window, using the native fullscreen state rather than screen-size guesses.
- Centered the native macOS red, yellow and green window controls vertically within the compact 42 px title bar, retaining alignment after resize, focus and fullscreen transitions.
- Fixed new macOS documents being stored inside the replaceable `.app` bundle and appearing lost after reinstalling. New documents now live in the user's `Documents/MD Reader Assistant` folder and survive application upgrades, while references to recovered legacy drafts are migrated automatically.
- Recent now detects whether each source file is still available. Deleted, moved or temporarily unavailable documents appear muted with a strikethrough and cannot be opened, while their remove-record action remains available so disconnected drives do not erase history automatically.
- Removed horizontal scrolling from the Markdown toolbar. Controls now collapse into More Formats by priority when space is limited, with new bold-italic, autolink, Markdown escaping and HTML-block actions.
- Added the standard macOS `Command + W` close-window shortcut with the same behavior as the red close button, while retaining `Command + Q` for quitting with unsaved-change confirmation.
- Completed the Markdown editing set with H4–H6, strikethrough, highlight, underline, superscript, subscript, horizontal rules, hard breaks, footnotes, reference links, collapsible sections, keyboard keys and comments, including safe live rendering for highlights and footnotes.
- Fixed an intermittent macOS issue where the red close button could fail to hide a fullscreen window. The app now completes the fullscreen exit before hiding in the background.
- Reworked the macOS top bar into a slimmer native hidden-titlebar layout without the extra Toolbar space, with dedicated light and dark appearances.
- Removed the filled background from inline code in reading and live-preview views while preserving a clear code text color.
- Added a lightweight theme-colored frame to the selected sidebar document card for clearer current-document identification.

## [2.2.6] - 2026-08-07

### 简体中文

- 将主题颜色与白天/黑夜模式拆分为两个独立功能；新增清新绿、晴空蓝、活力橙、灵动紫、珊瑚红、湖水蓝、雾蓝灰和陶土棕 8 种强调色，可与两种明暗模式自由组合，图 1 绿色为默认颜色。
- 更新应用品牌图标为亮绿色书页与羽毛标识，移除外部黑色画布并保留透明圆角；应用内 Logo 会随主题颜色切换，Windows、macOS、Linux、安装器和项目主页继续使用默认绿色图标。
- 自动迁移旧版完整主题设置，分别恢复为最接近的强调色与明暗模式组合。
- 降低 Logo、主操作按钮、首页叶子图标和“回到顶部”按钮的强调色阴影，让界面层次更加轻盈克制。

### English

- Split accent color and light/dark mode into independent controls. Fresh Green, Clear Blue, Vivid Orange, Vivid Violet, Coral Red, Lake Cyan, Mist Slate and Clay Brown can be combined with either mode, with the supplied green as the default.
- Updated the application brand icon to the bright-green book-and-feather mark with transparent outer corners. In-app Logos follow the selected accent while Windows, macOS, Linux, installer and project-page icons stay green.
- Migrated legacy complete-theme settings to the closest independent accent and color-mode combination.
- Reduced accent-colored shadows on Logos, primary actions, the welcome illustration and the back-to-top control for a lighter, more restrained visual hierarchy.

## [2.2.5] - 2026-08-06

### 简体中文

- 新增 8 套完整配色主题：经典浅色、经典深色、青翠新语、云海湛蓝、紫藤雾色、琥珀书页、深海夜航和墨夜紫晶；阅读页、实时预览、Markdown 编辑器、语法高亮、菜单和弹窗会同步切换。
- 主题选择会自动保存并在下次启动时恢复；旧版 `light` / `dark` 设置会自动迁移，异常值安全回退到经典浅色。
- 放大、缩小和恢复字号现在会同时作用于阅读页、实时预览、Markdown 源码和编辑器行号，最高支持 200%，更适合 4K 高分辨率显示器。
- 字号比例会自动保存，关闭并重新打开软件后继续使用上次设置。
- macOS 点击左上角关闭按钮后改为隐藏窗口并继续在后台运行；从 Finder 打开 Markdown 文件时会在应用启动后直接显示文档。
- 点击“最近阅读”中的已有文档不再改变列表顺序。
- Windows 安装向导选择的语言会直接作为软件界面语言，首次进入软件不再重复要求选择。
- 优化 macOS 冷启动：Markdown 编辑器改为进入编辑模式时按需加载，资源浏览器目录在首屏显示后恢复，减少首次打开等待。

### English

- Added eight complete color themes: Classic Light, Classic Dark, Verdant Voice, Azure Cloud, Wisteria Mist, Amber Paper, Deep Ocean and Amethyst Night. The reader, live preview, Markdown editor, syntax highlighting, menus and dialogs switch together.
- Theme selection is saved and restored automatically; legacy `light` / `dark` values migrate safely and unknown values fall back to Classic Light.
- Increase, decrease and reset text size now apply to the reader, live preview, Markdown source and editor line numbers, with scaling up to 200% for high-DPI and 4K displays.
- The selected text scale is saved automatically and restored on the next launch.
- On macOS, the close button now hides the window while the app keeps running; Markdown files opened from Finder are displayed after startup.
- Opening an existing item from Recent no longer changes the list order.
- The Windows installer language now becomes the initial app language, avoiding a second language prompt on first launch.
- Improved macOS cold startup by loading the Markdown editor only when editing begins and restoring resource-explorer folders after the first paint.

## [2.2.4] - 2026-07-22

### 简体中文

- 修复编辑模式下 `Ctrl/Cmd + F` 会切换到预览页的问题；现在会保持在源码编辑器中查找、高亮并滚动定位匹配内容。
- 查找与替换面板新增简体中文/English 联动文案，并重新设计为与应用一致的绿色卡片式工具栏。
- 左侧文档库和右侧本页目录新增可拖动分隔条，调整后的宽度会在下次启动时自动恢复。
- 资源浏览器会记住已选择的文件夹和当前视图，下次启动自动恢复；在资源浏览器视图中再次点击标签即可更换文件夹。

### English

- Fixed `Ctrl/Cmd + F` leaving the source editor for preview mode; editor search now stays in place, highlights matches and scrolls to the selected result.
- Localized the find-and-replace panel for Simplified Chinese and English, with a polished green toolbar that matches the app.
- Added draggable dividers for the library and document outline, with panel widths restored on the next launch.
- The resource explorer now restores its selected folder and active view on launch; click the active Explorer tab again to choose another folder.

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
[2.2.4]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.2.4
[2.2.5]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.2.5
[2.2.6]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.2.6
[2.3.0]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.3.0
[2.3.1]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.3.1
[2.3.2]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.3.2
[2.3.3]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.3.3
[2.3.4]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.3.4
[2.3.5]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.3.5
[2.3.6]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.3.6
[2.3.7]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.3.7
[2.3.8]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.3.8
[2.3.9]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.3.9
[2.3.10]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.3.10
[2.3.11]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.3.11
[2.3.12]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.3.12
[2.3.13]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.3.13
[2.4.0]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.4.0
[2.4.1]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.4.1
[2.4.2]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.4.2
[2.4.3]: https://github.com/liuhang798/md-reader-assistant/releases/tag/v2.4.3
