# Changelog

All notable changes to MD Reader Assistant are documented here.

## [2.2.2] - 2026-07-21

### Changed

- Adopted native left-side macOS window controls, application menus, system fonts, and Command shortcuts while preserving the Windows interface.
- Standardized GitHub Release titles and downloadable asset names as `md-reader-assistant 2.2.2` and ASCII-safe platform filenames.
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
