# Document Favorites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent document favorites to Recent, Explorer, and a new Favorites sidebar view, then ship a verified Windows v2.3.3 installer.

**Architecture:** Extend the existing JSON preferences and Go/Wails API with favorite path operations, then reuse the current sidebar file-card renderer and context menu with mode-aware actions. Keep `renderer.js` state authoritative and isolate pure path/view normalization in a small testable frontend module.

**Tech Stack:** Go 1.25, Wails 2.13, native JavaScript, Vitest, Vite 7, NSIS.

## Global Constraints

- Favorites store paths only and never copy, move, or delete user documents.
- Missing files remain removable from Favorites.
- Paths are normalized and compared case-insensitively for Windows compatibility.
- Existing preferences without favorite fields must load safely.
- All visible copy is available in Simplified Chinese and English.
- Release version is `2.3.3`; generated build artifacts stay ignored by Git.

---

### Task 1: Persistent favorite preferences

**Files:**
- Modify: `app.go`
- Test: `app_test.go`

**Interfaces:**
- Produces: `(*App).AddFavorite(string) (Preferences, error)` and `(*App).RemoveFavorite(string) (Preferences, error)`.
- Produces: `Preferences.favoriteFiles` and `Preferences.favoriteFileStatuses` JSON fields.

- [ ] **Step 1: Write failing Go tests** for add/remove persistence, case-insensitive idempotence, independence from Recent, missing-file status, and Save As draft path migration.
- [ ] **Step 2: Run `go test ./...`** and verify failures name the missing favorite fields or methods.
- [ ] **Step 3: Implement the minimal preference fields, normalization, status hydration, mutations, and Save As migration.**
- [ ] **Step 4: Run `go test ./...`** and verify all tests pass.

### Task 2: Favorite view and context actions

**Files:**
- Create: `frontend/src/library-state.js`
- Create: `frontend/src/library-state.test.js`
- Modify: `frontend/src/main.js`
- Modify: `frontend/src/renderer.js`
- Modify: `frontend/index.html`
- Modify: `frontend/src/styles.css`
- Regenerate: `frontend/wailsjs/go/main/App.js`
- Regenerate: `frontend/wailsjs/go/main/App.d.ts`

**Interfaces:**
- Consumes: `AddFavorite`, `RemoveFavorite`, `favoriteFiles`, and `favoriteFileStatuses` from Task 1.
- Produces: `normalizeSidebarMode`, `filesFromPreferencePaths`, and `sameDocumentPath` pure helpers.

- [ ] **Step 1: Write failing Vitest tests** proving all three modes normalize correctly, status mapping keeps missing entries, and Windows-style path matching ignores case.
- [ ] **Step 2: Run `npm test -- --run`** and verify the new tests fail before implementation.
- [ ] **Step 3: Implement the pure helpers and bridge methods.**
- [ ] **Step 4: Add the Favorites tab, mode-aware rendering, and context-menu favorite toggle in both languages.**
- [ ] **Step 5: Run frontend tests and `npm run build`** and verify passing output.

### Task 3: Release metadata, documentation, and installer

**Files:**
- Modify: `app.go`, `wails.json`, `frontend/package.json`, `frontend/package-lock.json`
- Modify: `frontend/index.html`, `frontend/src/main.js`, `frontend/src/renderer.js`
- Modify: `build/windows/installer/project.nsi`
- Modify: `README.md`, `README.en.md`, `CHANGELOG.md`, `RELEASING.md`, `AGENTS.md`

**Interfaces:**
- Consumes: completed favorite feature.
- Produces: consistent v2.3.3 application metadata and a current-user Windows NSIS installer.

- [ ] **Step 1: Update every product-version source to `2.3.3` and document Favorites in Chinese and English.**
- [ ] **Step 2: Run `go test ./...`, `go vet ./...`, frontend tests, frontend production build, and `git diff --check`.**
- [ ] **Step 3: Build with `wails build -clean -platform windows/amd64 -nsis -installscope user -webview2 embed -trimpath`.**
- [ ] **Step 4: Verify installer filename, size, SHA-256, version resources, and a clean source diff excluding ignored build output.**

## Self-review

- Spec coverage: all confirmed entry points, persistence, missing-file behavior, bilingual copy, Save As migration, and packaging are assigned.
- Placeholder scan: no deferred implementation placeholders remain.
- Type consistency: frontend bridge names match the Go public methods and preference JSON fields exactly.
