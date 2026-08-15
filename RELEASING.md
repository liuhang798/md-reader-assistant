# Release Guide

## 1. Update the version

Keep the version synchronized in:

- `app.go` (`appVersion`)
- `wails.json` (`info.productVersion`)
- `frontend/package.json` and `frontend/package-lock.json`
- visible version labels in `frontend/index.html`, `frontend/src/main.js`, and `frontend/src/renderer.js`
- `build/windows/installer/project.nsi`

Update `CHANGELOG.md` and both README files for user-visible changes.

Every release must have a matching `## [version]` section in `CHANGELOG.md`. The release workflow automatically uses that section for both the GitHub Release page and the in-app update dialog.

## 2. Verify locally

```bash
go test ./...
cd frontend
npm install
npm run build
```

On Windows, build the installer with:

```bash
wails build -clean -platform windows/amd64 -nsis -installscope user -webview2 embed -trimpath
```

On macOS, use the repository wrapper so both the bundle filename and display name are `MD阅读助手`:

```bash
bash scripts/build-macos.sh darwin/universal
```

## 3. Publish

### 推送代码

双击 `push-to-github.bat`，它会提交改动并推送 GitHub（带 3 次重试），或手动执行：

```bash
git push origin main
```

### 打 tag 触发构建

创建与 `wails.json` 完全一致的 tag 并推送到 GitHub（`release.yml` 由 push tag 自动触发）：

```bash
git tag -a v2.4.3 -m "MD Reader Assistant v2.4.3"
git push origin v2.4.3
```

The `Build and Release` workflow validates the tag/version match, builds Windows, macOS, and Linux packages, and uploads them to the GitHub Release.

### Rebuild an existing Release

If a platform build fails after the tag and Release have already been created:

1. Fix and push the workflow or source changes to `main`.
2. Open **Actions → Build and Release → Run workflow**.
3. Keep the branch set to `main` and enter the existing tag, such as `v2.4.3`.
4. Run the workflow. Successful assets are uploaded to the existing Release and files with the same names are replaced.

The manual tag must exactly match the version in `wails.json`.

## 4. Verify the release

- Confirm all platform assets are present.
- Install the Windows package and check the desktop icon and Markdown file association.
- Mount the macOS DMG, confirm it contains exactly one `MD阅读助手.app`, and verify Spotlight shows `MD阅读助手` rather than the internal project name.
- Verify that the in-app update checker opens the published Release page.
