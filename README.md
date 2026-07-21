<div align="center">
  <img src="build/appicon.png" width="96" alt="MD Reader Assistant icon">
  <h1>MD Reader Assistant</h1>
  <p>A beautiful, focused, cross-platform Markdown reader and editor.</p>
  <p><strong>English</strong> · <a href="README.zh-CN.md">简体中文</a></p>
  <p>
    <a href="https://github.com/liuhang798/md-reader-assistant/actions/workflows/release.yml"><img src="https://github.com/liuhang798/md-reader-assistant/actions/workflows/release.yml/badge.svg" alt="Build status"></a>
    <a href="https://github.com/liuhang798/md-reader-assistant/releases/latest"><img src="https://img.shields.io/github/v/release/liuhang798/md-reader-assistant" alt="Latest release"></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/liuhang798/md-reader-assistant" alt="MIT License"></a>
  </p>
</div>

## Download and install

Download the latest package for your platform from [GitHub Releases](https://github.com/liuhang798/md-reader-assistant/releases/latest). On Windows, run `MD阅读助手-安装程序-version-amd64.exe` and follow the setup wizard. The installer can create a desktop shortcut and register Markdown file associations.

## Highlights

- Read and edit Markdown with the same calm, polished interface.
- Split editing mode: live preview on the left, syntax-highlighted editor on the right.
- Clickable table of contents, active section tracking, search, print and back-to-top.
- Recent documents update immediately and individual records can be removed.
- Simplified Chinese and English interface with persistent language selection.
- Light/dark themes and adjustable reading font size.
- Open folders, browse Markdown collections and drag files into the window.
- Native file open/save dialogs and `.md`, `.markdown`, `.mdown`, `.mkd` associations.
- Single-instance file opening and unsaved-change protection.
- A new split reading/editing brand icon with transparent rounded corners and no white square canvas, plus an About screen with the author email and a direct repository link.
- A daily background check for the latest stable GitHub Release, plus manual checks from Settings, release notes, and one-click access to the download page.

## Screenshots

| Home | Reader |
|---|---|
| ![Home](screenshots/01-home.png) | ![Reader](screenshots/02-reader.png) |

![Split editor](screenshots/03-split-editor.png)

![About screen](screenshots/04-about.png)

![Update available](screenshots/05-update-available.png)

## Go + Wails v2

Version 2.0 and later replace Electron with Go and Wails while retaining the existing HTML/CSS interface and CodeMirror editor. The current Windows installer is about 8.3 MB, compared with about 90 MB for the previous Electron build.

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

Push a tag such as `v2.2.1` to run the Windows, macOS and Linux workflow in `.github/workflows/release.yml` and publish all packages to GitHub Releases. The app checks the repository's latest stable Release when notifying users about updates.

## Project documentation

- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Release guide](RELEASING.md)
- [Design QA](design-qa.md)

## License

[MIT](LICENSE)
