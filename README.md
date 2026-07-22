<div align="center">
  <img src="build/appicon.png" width="96" alt="MD Reader Assistant icon">
  <h1>MD Reader Assistant</h1>
  <p><strong>A fast, local-first Markdown reader, viewer and editor — about 7 MB on Windows.</strong></p>
  <p>Live preview · Syntax highlighting · Plain local files · Windows, macOS and Linux</p>
  <p><strong>English</strong> · <a href="README.zh-CN.md">简体中文</a></p>
  <p>
    <a href="https://github.com/liuhang798/md-reader-assistant/actions/workflows/release.yml"><img src="https://github.com/liuhang798/md-reader-assistant/actions/workflows/release.yml/badge.svg" alt="Build status"></a>
    <a href="https://github.com/liuhang798/md-reader-assistant/releases/latest"><img src="https://img.shields.io/github/v/release/liuhang798/md-reader-assistant" alt="Latest release"></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/liuhang798/md-reader-assistant" alt="MIT License"></a>
    <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-526b58" alt="Windows, macOS and Linux">
  </p>
  <p>
    <a href="https://liuhang798.github.io/"><strong>Official website</strong></a>
    ·
    <a href="https://github.com/liuhang798/md-reader-assistant/releases/latest"><strong>Download latest release</strong></a>
    · <a href="#screenshots">Screenshots</a>
    · <a href="#development">Build from source</a>
  </p>
</div>

![MD Reader Assistant split-view Markdown editor with live preview and syntax highlighting](screenshots/03-split-editor.png)

## Why MD Reader Assistant?

- **Lightweight by design:** the Windows installer is only about **7 MB**, built with Go and Wails instead of Electron.
- **Local-first and private:** open and edit ordinary Markdown files on your computer—no account, proprietary vault or cloud lock-in.
- **Reading and editing together:** switch from a focused Markdown reader to split-view editing with live preview and syntax highlighting.
- **Practical desktop integration:** recent files, resource explorer, autosave, native dialogs, file associations and update notifications.
- **Cross-platform and open source:** one MIT-licensed Markdown desktop app for Windows, macOS and Linux.

It is a good fit for reading long Markdown documents, editing README files, maintaining technical notes and working with local documentation folders.

## Download

| Platform | Package | Download |
|---|---|---|
| Windows x64 | Step-by-step installer (`.exe`) | [Latest release](https://github.com/liuhang798/md-reader-assistant/releases/latest) |
| macOS | Universal Intel + Apple Silicon (`.dmg`) | [Latest release](https://github.com/liuhang798/md-reader-assistant/releases/latest) |
| Linux x64 | Debian package + portable AppImage | [Latest release](https://github.com/liuhang798/md-reader-assistant/releases/latest) |

On Windows, run `md-reader-assistant-version-windows-amd64.exe` and follow the setup wizard. The installer can create a desktop shortcut, register Markdown file associations, automatically reuse the previous installation directory during an upgrade, and launch the app after setup.

The macOS build uses native left-side window controls and application menus, including standard Command shortcuts.

## What's new in 2.2.4

- `Ctrl/Cmd + F` now searches Markdown source directly inside the editor, highlights matches and scrolls to each result without leaving edit mode.
- The find-and-replace panel follows the selected Simplified Chinese or English interface language and uses a polished toolbar that matches the application.
- Drag the library and document-outline dividers to choose comfortable panel widths; both widths are restored at the next launch.
- The Resource Explorer remembers the selected folder and active sidebar view between launches.
- Click the already active Explorer tab to choose a different folder at any time.

## Highlights

- Read and edit Markdown with the same calm, polished interface.
- Split editing mode: live preview on the left, syntax-highlighted editor on the right.
- Formatting toolbar for headings, quotes, bold, italic, links, ordered/unordered/task lists, tables, images, inline code and code blocks, including `Ctrl/Cmd + B`, `Ctrl/Cmd + I` and `Ctrl/Cmd + K`.
- Undo from the toolbar or with `Ctrl/Cmd + Z`; each document has isolated history that stops at the originally loaded content.
- `Ctrl/Cmd + F` searches Markdown source in place, highlights matches and scrolls to the selected result; the polished find-and-replace panel follows the selected Chinese or English interface language.
- Create a Markdown file and begin editing immediately, with autosave every 10 seconds while editing.
- Clickable table of contents, active section tracking, search, print and back-to-top.
- Recent documents update immediately and individual records can be removed.
- Simplified Chinese and English interface with persistent language selection.
- Light/dark themes and adjustable reading font size.
- Switch the left sidebar between Recent and a refreshable resource explorer for Markdown folders.
- Drag the library and document-outline dividers to customize panel widths; the layout is remembered locally.
- The resource explorer remembers its selected folder and active view across launches; click the active Explorer tab again to choose another folder.
- Native file open/save dialogs and `.md`, `.markdown`, `.mdown`, `.mkd` associations.
- Single-instance file opening and unsaved-change protection.
- A new split reading/editing brand icon with transparent rounded corners and no white square canvas, plus an About screen with the author email and a direct repository link.
- Automatic checks for the latest stable GitHub Release, with release notes, one-click access to downloads, manual checks, and a 30-day reminder pause.

## Screenshots

| Home | Reader |
|---|---|
| ![Home](screenshots/01-home.png) | ![Reader](screenshots/02-reader.png) |

![About screen](screenshots/04-about.png)

![Update available](screenshots/05-update-available.png)

## Go + Wails v2

Version 2.0 and later replace Electron with Go and Wails while retaining the existing HTML/CSS interface and CodeMirror editor. The current Windows installer is about **7 MB**, compared with about 90 MB for the previous Electron build.

- Backend: Go 1.23+
- Desktop framework: Wails 2.13
- Frontend: HTML, CSS, JavaScript and Vite
- Markdown: marked, DOMPurify and highlight.js
- Editor: CodeMirror 6
- Windows installer: NSIS

## Project structure

- `main.go`: Wails startup and window configuration.
- `app.go`: documents, folders, recent files, preferences, and desktop integration.
- `updates.go`: GitHub Releases checks and version comparison.
- `frontend/`: Markdown reader, CodeMirror editor, and bilingual interface.
- `build/`: application icons and platform build configuration.
- `packaging/`: Linux desktop integration and package metadata.
- `scripts/`: repeatable project asset-maintenance scripts.

New Markdown documents are created immediately beside the installed application. If that location is read-only, the app silently uses `Documents/MD Reader Assistant`. Saving a new document under another name removes its auto-created draft and duplicate Recent entry. Local images referenced by absolute or relative paths are loaded securely through the Go backend for reliable previewing.

## Downloads

Tagged releases are built automatically for:

- Windows x64: step-by-step NSIS installer
- macOS Universal: Intel and Apple Silicon DMG
- Linux x64: DEB and AppImage

Unsigned development builds may trigger Windows SmartScreen or macOS Gatekeeper warnings. Production signing certificates are not included in this repository.

## Development

Requirements: Go 1.23+, Node.js 22+, Wails 2.13 and the platform dependencies listed by Wails.

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.13.0
wails dev
```

Run tests:

```bash
go test ./...
cd frontend
npm install
npm run build
```

Build on the current platform:

```bash
wails build -clean -trimpath
```

Build the Windows installer:

```bash
wails build -clean -platform windows/amd64 -nsis -installscope user -webview2 embed -trimpath
```

Push a tag such as `v2.2.4` to run the Windows, macOS and Linux workflow in `.github/workflows/release.yml` and publish all packages to GitHub Releases. The app checks the repository's latest stable Release when notifying users about updates.

## Project documentation

- [Official website](https://liuhang798.github.io/)
- [Official website source](https://github.com/liuhang798/liuhang798.github.io)
- [Changelog](CHANGELOG.md)
- [AI project technical guide](AGENTS.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Release guide](RELEASING.md)
- [Design QA](design-qa.md)

## License

[MIT](LICENSE)
