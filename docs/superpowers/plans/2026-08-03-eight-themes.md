# Eight Color Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the binary light/dark toggle with eight complete, persistent, bilingual color themes across the reader, preview, editor, menus, dialogs, and native window chrome.

**Architecture:** Keep all theme definitions in the existing CSS custom-property system and use a small theme registry in `renderer.js` as the only source for IDs, labels, and light/dark native-window mapping. Store the selected ID in `localStorage.theme`, migrate legacy `light`/`dark` values, and render one accessible theme chooser popover from static HTML.

**Tech Stack:** Go 1.25, Wails 2.13, native HTML/CSS/JavaScript, CodeMirror 6, Node.js built-in test runner, Vite 7.

## Global Constraints

- Final theme count is exactly 8: 5 light and 3 dark.
- Chinese theme names are `经典浅色`、`经典深色`、`青翠新语`、`云海湛蓝`、`紫藤雾`、`琥珀书页`、`深海夜航`、`墨夜紫晶`.
- English theme names are `Classic Light`, `Classic Dark`, `Verdant Voice`, `Azure Cloud`, `Wisteria`, `Amber Paper`, `Deep Ocean`, and `Amethyst Night`.
- Preserve legacy `localStorage.theme` values: `light` maps to `classic-light`; `dark` maps to `classic-dark`.
- Unknown or missing values fall back to `classic-light`.
- Native Wails theme remains synchronized through the existing `window.leafMD.setTheme(dark: boolean)` bridge; do not change the Go API.
- Do not add dependencies, frameworks, or direct component-specific theme colors.
- Print output remains light regardless of the active app theme.

---

### Task 1: Theme Registry, Migration, and Persistence

**Files:**
- Create: `frontend/tests/themes.test.mjs`
- Modify: `frontend/src/renderer.js:18-35, 45-105, 120-160, 464-469, 1100-1150`

**Interfaces:**
- Produces: `THEMES: Record<string, { mode: 'light'|'dark', zhCN: string, en: string }>`
- Produces: `normalizeTheme(theme: string | null): string`
- Produces: `setTheme(themeId: string, silent?: boolean): void`
- Consumes: existing `window.leafMD.setTheme(dark: boolean)`.

- [ ] **Step 1: Write the failing theme contract tests**

Create `frontend/tests/themes.test.mjs` that reads `renderer.js`, `styles.css`, and `index.html` and asserts:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const renderer = await readFile(new URL('../src/renderer.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

const ids = ['classic-light', 'classic-dark', 'wechat-green', 'alipay-blue', 'wisteria', 'amber-paper', 'deep-ocean', 'amethyst-night'];

test('theme registry exposes exactly eight persistent themes', () => {
  for (const id of ids) assert.match(renderer, new RegExp(`['\"]${id}['\"]\\s*:`));
  assert.match(renderer, /light:\s*'classic-light'/);
  assert.match(renderer, /dark:\s*'classic-dark'/);
  assert.match(renderer, /localStorage\.setItem\('theme', state\.theme\)/);
});

test('theme names are bilingual and use four Chinese characters', () => {
  for (const name of ['经典浅色','经典深色','青翠新语','云海湛蓝','紫藤雾','琥珀书页','深海夜航','墨夜紫晶']) assert.match(renderer, new RegExp(name));
  for (const name of ['Classic Light','Classic Dark','Verdant Voice','Azure Cloud','Wisteria','Amber Paper','Deep Ocean','Amethyst Night']) assert.match(renderer, new RegExp(name));
});

test('all themes have CSS palettes and an accessible chooser', () => {
  for (const id of ids.slice(1)) assert.match(styles, new RegExp(`data-theme=[\"']${id}[\"']`));
  assert.match(html, /id="themeMenu"/);
  assert.match(html, /role="menu"/);
});
```

- [ ] **Step 2: Run the tests and confirm failure**

Run: `cd frontend && npm test`

Expected: `themes.test.mjs` fails because the registry, names, palettes, and menu do not exist.

- [ ] **Step 3: Implement the theme registry and migration**

In `frontend/src/renderer.js`, define the registry and normalization before `state`:

```js
const THEMES = {
  'classic-light': { mode: 'light', zhCN: '经典浅色', en: 'Classic Light' },
  'classic-dark': { mode: 'dark', zhCN: '经典深色', en: 'Classic Dark' },
  'wechat-green': { mode: 'light', zhCN: '青翠新语', en: 'Verdant Voice' },
  'alipay-blue': { mode: 'light', zhCN: '云海湛蓝', en: 'Azure Cloud' },
  wisteria: { mode: 'light', zhCN: '紫藤雾', en: 'Wisteria' },
  'amber-paper': { mode: 'light', zhCN: '琥珀书页', en: 'Amber Paper' },
  'deep-ocean': { mode: 'dark', zhCN: '深海夜航', en: 'Deep Ocean' },
  'amethyst-night': { mode: 'dark', zhCN: '墨夜紫晶', en: 'Amethyst Night' }
};

function normalizeTheme(theme) {
  if (theme === 'light') return 'classic-light';
  if (theme === 'dark') return 'classic-dark';
  return THEMES[theme] ? theme : 'classic-light';
}
```

Replace `state.dark` with `state.theme: normalizeTheme(localStorage.getItem('theme'))`. Rewrite `setTheme` to normalize, assign `document.documentElement.dataset.theme`, persist the ID, update selected cards, and call `window.leafMD.setTheme(THEMES[state.theme].mode === 'dark')`. Initialize with `setTheme(state.theme, true)`.

- [ ] **Step 4: Run tests and verify the model contract passes as far as implemented**

Run: `cd frontend && npm test`

Expected: registry, names, migration, and persistence assertions pass; CSS/menu assertions may remain failing until Task 2.

- [ ] **Step 5: Commit the theme model**

```bash
git add frontend/src/renderer.js frontend/tests/themes.test.mjs
git commit -m "Add persistent eight-theme model"
```

### Task 2: Theme Chooser and Complete Palettes

**Files:**
- Modify: `frontend/index.html:35-50, 205-230`
- Modify: `frontend/src/styles.css:1-70, 120-140, 300-350, 420-435`
- Modify: `frontend/src/renderer.js:45-105, 120-160, 465-500, 1135-1160`
- Test: `frontend/tests/themes.test.mjs`

**Interfaces:**
- Consumes: `THEMES`, `state.theme`, and `setTheme(themeId, silent)` from Task 1.
- Produces: `#themeMenu` containing eight `[data-theme-option]` buttons.
- Produces: complete CSS variable palettes keyed by `data-theme`.

- [ ] **Step 1: Extend failing tests for the chooser behavior and palettes**

Add assertions that the HTML contains eight `data-theme-option` IDs; renderer click handling calls `setTheme(button.dataset.themeOption)`; `applyStaticTranslations()` updates the visible theme names; and every non-default selector includes `--bg`, `--paper`, `--text`, `--muted`, `--line`, `--green`, `--green-deep`, `--green-soft`, `--code`, and the syntax variables.

- [ ] **Step 2: Run the tests and confirm the new assertions fail**

Run: `cd frontend && npm test`

Expected: failures identify missing menu cards, click handling, and palettes.

- [ ] **Step 3: Add the accessible theme chooser markup**

Add a `#themeMenu.popover.theme-menu.hidden` after `#moreMenu` with `role="menu"`, a bilingual heading via `data-i18n="chooseTheme"`, and eight buttons:

```html
<button type="button" role="menuitemradio" data-theme-option="classic-light" aria-checked="false">
  <span class="theme-swatch theme-swatch-classic-light"></span><span class="theme-option-name"></span><span class="theme-check">✓</span>
</button>
```

Repeat with each exact theme ID. Add `aria-haspopup="menu"` and `aria-expanded="false"` to `#themeButton`.

- [ ] **Step 4: Add selection, dismissal, and bilingual rendering**

Add `chooseTheme: '选择主题' / 'Choose theme'` to translations. Extend static translation refresh to set each `.theme-option-name` from `THEMES[id].zhCN` or `.en`. Implement:

- `#themeButton` toggles only `#themeMenu` and closes `#moreMenu`.
- Clicking a theme card calls `setTheme`, then closes the menu.
- Outside click and `Escape` close the menu.
- Active card gets `.active`, `aria-checked="true"`, and the check mark.
- `aria-expanded` tracks menu visibility.

- [ ] **Step 5: Add eight complete CSS palettes**

Keep existing `:root` as `classic-light`; rename the dark selector to `:root[data-theme="classic-dark"]`. Add complete variable blocks for the six new IDs. Use these accent directions while tuning companion colors for contrast:

```css
:root[data-theme="wechat-green"] { --green: #07c160; --green-deep: #056b38; --green-soft: #e5f7ec; }
:root[data-theme="alipay-blue"] { --green: #1677ff; --green-deep: #0756bd; --green-soft: #e9f2ff; }
:root[data-theme="wisteria"] { --green: #765b7e; --green-deep: #59415f; --green-soft: #f0e8f2; }
:root[data-theme="amber-paper"] { --green: #986536; --green-deep: #6f4725; --green-soft: #f3e6d5; }
:root[data-theme="deep-ocean"] { --green: #70a9bd; --green-deep: #9cc7d5; --green-soft: #233942; }
:root[data-theme="amethyst-night"] { --green: #b39ac0; --green-deep: #d3bfdb; --green-soft: #352d3d; }
```

Change dark-only selectors from `[data-theme="dark"]` to `:is([data-theme="classic-dark"],[data-theme="deep-ocean"],[data-theme="amethyst-night"])`. Add a 2-column responsive theme-card layout, color preview circles, visible keyboard focus, active border/check, and mobile fallback.

- [ ] **Step 6: Run frontend tests and production build**

Run: `cd frontend && npm test && npm run build`

Expected: all Node tests pass and Vite completes without warnings or errors.

- [ ] **Step 7: Commit the complete theme UI**

```bash
git add frontend/index.html frontend/src/renderer.js frontend/src/styles.css frontend/tests/themes.test.mjs
git commit -m "Add eight complete color themes"
```

### Task 3: Documentation, Regression Verification, and Packaging Readiness

**Files:**
- Modify: `docs/superpowers/specs/2026-08-03-eight-themes-design.md`
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `CHANGELOG.md`
- Test: `app_test.go`

**Interfaces:**
- Consumes: final theme names and behavior from Tasks 1-2.
- Produces: user-facing bilingual feature documentation and a verified release-ready working tree.

- [ ] **Step 1: Update the approved design names**

Replace `微信绿 / WeChat Green` with `青翠新语 / Verdant Voice` and `支付宝蓝 / Alipay Blue` with `云海湛蓝 / Azure Cloud` in the design spec while retaining the stable internal IDs `wechat-green` and `alipay-blue`.

- [ ] **Step 2: Update Chinese and English product documentation**

Add one feature bullet to `README.md` describing eight complete themes with persistent selection and one corresponding bullet to `README.en.md`. Add a bilingual `2.2.4` unreleased-change note in `CHANGELOG.md` without changing the application version number.

- [ ] **Step 3: Run the complete verification suite**

Run from the repository root:

```powershell
go test ./...
go vet ./...
Push-Location frontend
npm test
npm run build
Pop-Location
git diff --check
```

Expected: all commands exit 0 and `git diff --check` prints no output.

- [ ] **Step 4: Inspect the final diff for generated or unrelated files**

Run: `git status --short` and `git diff --stat HEAD~2..HEAD`.

Expected: only source, tests, docs, and the implementation plan/spec are tracked; `frontend/dist`, `node_modules`, `build/bin`, and `.superpowers` are absent.

- [ ] **Step 5: Commit documentation and final verification changes**

```bash
git add docs/superpowers/specs/2026-08-03-eight-themes-design.md README.md README.en.md CHANGELOG.md
git commit -m "Document eight color themes"
```

- [ ] **Step 6: Prepare the user handoff**

Report the eight names, persistence/migration behavior, exact verification commands, commit hashes, and whether an installer was generated. Do not push or create a release unless separately requested.

