# Accent Themes and Color Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the eight bundled visual themes with eight independent accent colors plus an independent light/dark mode, with matching in-app Logo colors and green/light defaults.

**Architecture:** Keep `renderer.js` as the single frontend state source, but replace `state.theme` with `state.accentTheme` and `state.colorMode`. CSS uses orthogonal `data-accent` and `data-color-mode` root attributes: mode selectors own neutral surfaces while accent selectors own brand/action tokens. Deterministically generated PNG Logo variants are selected from the accent registry; the native application icon remains green.

**Tech Stack:** Wails 2.13, Go 1.25, native HTML/CSS/JavaScript, Vite 7, Node test runner, Pillow.

## Global Constraints

- Keep the frontend framework-free and preserve `window.leafMD` as the only backend bridge.
- Default to the supplied image 1 green and light mode.
- Provide exactly eight accent colors and allow all 16 accent/mode combinations.
- Only `colorMode` may call `window.leafMD.setTheme(dark)`.
- Runtime brand Logo instances follow the accent; native executable, installer, taskbar, Dock and shortcut icons stay green.
- Preserve existing uncommitted icon work and unrelated user changes.
- Keep Chinese and English UI labels synchronized.
- Do not commit generated `frontend/dist`, dependency directories or credentials.

---

### Task 1: Split persisted appearance state

**Files:**
- Modify: `frontend/tests/themes.test.mjs`
- Modify: `frontend/src/renderer.js`

**Interfaces:**
- Produces: `ACCENT_THEMES`, `normalizeAccentTheme(value)`, `normalizeColorMode(value)`, `readAppearanceStorage(storage)`, `setAccentTheme(id)`, and `setColorMode(mode)`.
- Produces root attributes: `data-accent` and `data-color-mode`.

- [ ] **Step 1: Write failing migration and state tests**

Add executable tests that import an appearance-state module or run its exported pure functions against a real storage-shaped object. Assert literal outcomes for the defaults (`green`, `light`), each current legacy theme mapping, invalid values, and the rule that a present new key is not overwritten by a legacy value.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/themes.test.mjs` from `frontend`.

Expected: FAIL because the independent state functions/keys do not exist and the current implementation still exposes `state.theme`.

- [ ] **Step 3: Implement the minimal independent state model**

Create a small pure `frontend/src/appearance.js` module with the eight-entry registry and migration functions. Initialize `state.accentTheme` and `state.colorMode` from it, persist to `accentTheme`/`colorMode`, update root attributes independently, and call `window.leafMD.setTheme(mode === 'dark')` only from mode application.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/themes.test.mjs` from `frontend`.

Expected: all appearance state and migration tests pass.

### Task 2: Build two independent accessible toolbar controls

**Files:**
- Modify: `frontend/tests/themes.test.mjs`
- Modify: `frontend/index.html`
- Modify: `frontend/src/renderer.js`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: Task 1 `ACCENT_THEMES`, `setAccentTheme`, and `setColorMode`.
- Produces: `#accentButton`, `#colorModeButton`, `#accentMenu`, and eight `[data-accent-option]` radio items.

- [ ] **Step 1: Write failing control and accessibility tests**

Assert the real parsed HTML contains two distinct buttons, the accent menu has exactly eight radio items, the mode button has no popup role, and all translation hooks exist. Assert the selection handler updates `aria-checked` independently from the mode toggle.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/themes.test.mjs` from `frontend`.

Expected: FAIL because the page still has one `#themeButton` controlling a bundled theme menu.

- [ ] **Step 3: Implement toolbar markup, interaction, translations and layout**

Replace the old button/menu with a palette icon button plus an adjacent sun/moon button. Rename menu selectors to accent terminology, render the eight approved bilingual names, keep click-outside/Escape/focus restoration behavior, and switch sun/moon visibility using `data-color-mode` only.

- [ ] **Step 4: Run focused and full frontend tests**

Run: `npm test` from `frontend`.

Expected: all tests pass with no warnings.

### Task 3: Refactor CSS into neutral modes and eight accent palettes

**Files:**
- Modify: `frontend/tests/themes.test.mjs`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes root `data-accent` and `data-color-mode` attributes.
- Produces semantic tokens `--accent`, `--accent-strong`, `--accent-soft`, `--accent-border`, and `--accent-contrast` for every component and editor theme.

- [ ] **Step 1: Write failing palette isolation tests**

Assert that mode selectors define neutral surface tokens but no fixed theme accent, each of the eight accent selectors defines the approved literal base color, and legacy selectors/green-specific component variables are absent.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/themes.test.mjs` from `frontend`.

Expected: FAIL because current `data-theme` blocks mix surfaces, text and accent colors.

- [ ] **Step 3: Implement orthogonal CSS tokens**

Define the light neutral base in `:root`, dark neutral overrides in `[data-color-mode="dark"]`, and one accent token block per approved ID. Replace component references from `--green*` to semantic `--accent*`; keep print styling light and ensure the editor/Markdown accent tokens derive from the selected accent.

- [ ] **Step 4: Run tests and production build**

Run: `npm test` and `npm run build` from `frontend`.

Expected: both commands exit 0.

### Task 4: Generate and wire exact Logo variants

**Files:**
- Modify: `scripts/test_make_transparent_icon.py`
- Modify: `scripts/make-transparent-icon.py`
- Create: `frontend/src/assets/images/app-logo-green.png`
- Create: `frontend/src/assets/images/app-logo-blue.png`
- Create: `frontend/src/assets/images/app-logo-orange.png`
- Create: `frontend/src/assets/images/app-logo-violet.png`
- Create: `frontend/src/assets/images/app-logo-coral.png`
- Create: `frontend/src/assets/images/app-logo-cyan.png`
- Create: `frontend/src/assets/images/app-logo-slate.png`
- Create: `frontend/src/assets/images/app-logo-clay.png`
- Modify: `frontend/src/renderer.js`
- Modify: `frontend/index.html`
- Modify: `app_test.go`

**Interfaces:**
- Produces: `generate_accent_logo(source, target_rgb)` preserving alpha and non-green white/neutral pixels.
- Consumes: `ACCENT_THEMES[id].logo` to update all `[data-themed-logo]` image sources.

- [ ] **Step 1: Write failing pixel-behavior and asset tests**

Use a synthetic RGBA icon containing green, white and transparent pixels. Assert recoloring changes the green pixel to a hand-derived target hue, preserves white and alpha, and the repository contains eight synchronized 256×256 transparent Logo files whose sampled brand pixels differ according to the approved palette.

- [ ] **Step 2: Run the Python tests and verify RED**

Run: `python -m unittest scripts/test_make_transparent_icon.py -v`.

Expected: FAIL because accent Logo generation and assets do not exist.

- [ ] **Step 3: Implement deterministic Logo recoloring and generate assets**

Extend the existing Pillow script to hue-map green-dominant pixels while preserving luminance variation, white book details, shadows and alpha. Generate all eight frontend PNGs from the green master; keep the existing green native PNG/ICO outputs unchanged.

- [ ] **Step 4: Wire every in-app Logo and run tests**

Mark all runtime Logo images with `[data-themed-logo]`, update their `src` from the selected accent registry, then run Python, frontend and Go asset tests where tools are available.

Expected: all logo tests pass and native icon files remain byte-stable unless regenerated from the same green master.

### Task 5: Documentation, visual QA and final verification

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/superpowers/plans/2026-08-07-accent-and-color-mode.md`

**Interfaces:**
- Consumes all prior tasks.
- Produces user-facing bilingual documentation and verification evidence.

- [ ] **Step 1: Update documentation**

Document the eight independent accent colors, separate light/dark toggle, green default and runtime Logo behavior in Chinese/English. Consolidate the Unreleased changelog entries with the earlier transparent icon work without duplicating claims.

- [ ] **Step 2: Run visual Product Design QA**

Launch the local frontend, capture the default green/light page, one non-green/light page and one non-green/dark page. Compare toolbar placement, accent-only switching, Logo color, contrast, clipping and menu focus against the supplied references; fix any discrepancy and recapture.

- [ ] **Step 3: Run the complete verification set**

Run Python unit tests, `npm test`, `npm run build`, `go test ./...`, `go vet ./...`, and `git diff --check`. If Go is unavailable, record the exact missing-tool evidence instead of claiming those checks passed.

- [ ] **Step 4: Review the final diff and requirement checklist**

Verify exactly eight accents, 16 combinations, green/light defaults, independent persistence, complete legacy migration, accessible controls, all runtime Logo mappings, unchanged native green icon intent, bilingual docs, and absence of generated build/dependency files.

