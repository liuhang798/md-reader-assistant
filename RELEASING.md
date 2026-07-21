# Release Guide

## 1. Update the version

Keep the version synchronized in:

- `app.go` (`appVersion`)
- `wails.json` (`info.productVersion`)
- `frontend/package.json` and `frontend/package-lock.json`
- visible version labels in `frontend/index.html`, `frontend/src/main.js`, and `frontend/src/renderer.js`
- `build/windows/installer/project.nsi`

Update `CHANGELOG.md` and both README files for user-visible changes.

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

## 3. Publish

Push the source changes, then create a tag that exactly matches `wails.json`:

```bash
git tag -a v2.2.1 -m "MD Reader Assistant v2.2.1"
git push origin v2.2.1
```

The `Build and Release` workflow validates the tag/version match, builds Windows, macOS, and Linux packages, and uploads them to the corresponding GitHub Release.

### Rebuild an existing Release

If a platform build fails after the tag and Release have already been created:

1. Fix and push the workflow or source changes to `main`.
2. Open **Actions → Build and Release → Run workflow**.
3. Keep the branch set to `main` and enter the existing tag, such as `v2.2.1`.
4. Run the workflow. Successful assets are uploaded to the existing Release and files with the same names are replaced.

The manual tag must exactly match the version in `wails.json`.

## 4. Verify the release

- Confirm all platform assets are present.
- Install the Windows package and check the desktop icon and Markdown file association.
- Verify that the in-app update checker opens the published Release page.
