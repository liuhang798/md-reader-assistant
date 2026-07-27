# Editor Font Scaling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the persisted reading text scale also resize CodeMirror source text and line numbers, with a 200% maximum suitable for 4K displays.

**Architecture:** Keep `state.fontScale`, `localStorage.fontScale`, and the root `--font-scale` custom property as the single state path. Let CodeMirror inherit a calculated font size from that property so changing the scale does not recreate or reconfigure the editor and therefore preserves selection, scroll position, and undo history.

**Tech Stack:** Native JavaScript, CSS custom properties, CodeMirror 6, Vite 7, Node.js built-in test runner.

## Global Constraints

- Reading content, live preview, CodeMirror source text, Markdown syntax highlighting, and line numbers use one scale.
- Scale range is exactly 82%–200%; reset is exactly 100%; each control action remains 8%.
- Persist the scale in `localStorage.fontScale` and restore it during application initialization.
- Do not recreate `EditorView` or `EditorState` when scaling.
- Do not scale toolbars, menus, dialogs, or the CodeMirror search panel.
- Do not bump version 2.2.4 or build an installer for this change.

---

### Task 1: Add source-level font scaling regression test

**Files:**
- Create: `frontend/tests/font-scaling.test.mjs`
- Modify: `frontend/package.json`
- Test: `frontend/tests/font-scaling.test.mjs`

**Interfaces:**
- Consumes: `frontend/src/renderer.js` and `frontend/src/styles.css` as UTF-8 text.
- Produces: `npm test`, which verifies the scale boundary, persistence, initialization, shared CSS variable, and CodeMirror font inheritance.

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const renderer = await readFile(new URL('../src/renderer.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('font scale persists and supports up to 200 percent', () => {
  assert.match(renderer, /Math\.max\(\.82, Math\.min\(2, scale\)\)/);
  assert.match(renderer, /localStorage\.setItem\('fontScale', state\.fontScale\)/);
  assert.match(renderer, /setFontScale\(state\.fontScale, true\)/);
});

test('CodeMirror source text and gutters inherit the shared font scale', () => {
  assert.match(styles, /#markdownEditor \.cm-editor\s*\{[^}]*font-size:\s*calc\(15px \* var\(--font-scale\)\)/s);
  assert.doesNotMatch(styles, /#markdownEditor\s*\{[^}]*font-size:\s*15px/s);
});
```

- [ ] **Step 2: Add and run the test script to verify it fails**

Add to `frontend/package.json`:

```json
"test": "node --test tests/*.test.mjs"
```

Run: `npm test`

Expected: FAIL because the current maximum is `1.35`, CodeMirror has no scaled font declaration, and `#markdownEditor` still fixes the host at `15px`.

### Task 2: Apply the shared scale to CodeMirror

**Files:**
- Modify: `frontend/src/renderer.js:471-475`
- Modify: `frontend/src/styles.css:284-287`
- Test: `frontend/tests/font-scaling.test.mjs`

**Interfaces:**
- Consumes: root custom property `--font-scale` written by `setFontScale(scale, silent)`.
- Produces: CodeMirror root font size `calc(15px * var(--font-scale))` inherited by source text and gutters.

- [ ] **Step 1: Expand the scale maximum**

Change the clamp to:

```js
state.fontScale = Math.max(.82, Math.min(2, scale));
```

- [ ] **Step 2: Move the editor font size onto the CodeMirror root**

Use:

```css
#markdownEditor { flex: 1; width: 100%; min-height: 0; overflow: hidden; background: transparent; user-select: text; }
#markdownEditor .cm-editor { position: relative; z-index: 1; height: 100%; outline: none; pointer-events: auto; font-size: calc(15px * var(--font-scale)); }
```

This deliberately leaves the search panel's explicit control sizes unchanged.

- [ ] **Step 3: Run focused tests**

Run: `npm test`

Expected: 2 tests PASS.

- [ ] **Step 4: Commit implementation**

```powershell
git add -- frontend/package.json frontend/tests/font-scaling.test.mjs frontend/src/renderer.js frontend/src/styles.css
git commit -m "Scale editor text for high DPI displays"
```

### Task 3: Document and verify the user-visible behavior

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`

**Interfaces:**
- Consumes: implemented persisted editor scaling behavior.
- Produces: bilingual user documentation stating that reading and editing text zoom together and persist across launches.

- [ ] **Step 1: Update bilingual documentation**

Add concise 2.2.4 notes explaining synchronized reading/editor zoom, 200% maximum, and persisted preference without changing the version number.

- [ ] **Step 2: Run the full verification set**

Run in order:

```powershell
Set-Location frontend
npm test
npm run build
Set-Location ..
go test ./...
go vet ./...
git diff --check
git status --short
```

Expected: all commands exit 0; only the planned source, test, documentation, and plan files differ from `HEAD`.

- [ ] **Step 3: Commit documentation**

```powershell
git add -- CHANGELOG.md README.md README.zh-CN.md docs/superpowers/plans/2026-07-23-editor-font-scaling.md
git commit -m "Document synchronized editor zoom"
```
