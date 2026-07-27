# Chinese-First README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Simplified Chinese the default GitHub repository introduction while preserving a complete English README and compatibility for the old Chinese README URL.

**Architecture:** Move the current complete English `README.md` to `README.en.md`, move the complete Chinese `README.zh-CN.md` to `README.md`, and recreate `README.zh-CN.md` as a small compatibility page. Update language navigation and repository-maintainer documentation without changing application code or version 2.2.4.

**Tech Stack:** GitHub-flavored Markdown, relative repository links, Git.

## Global Constraints

- `README.md` is the complete Simplified Chinese default page.
- `README.en.md` is the complete English page.
- `README.zh-CN.md` remains present as a compatibility entry.
- Preserve all current uncommitted text-scale documentation changes.
- Keep screenshots, download URLs, badges and source-build sections intact.
- Do not change application source, version number or generated installer.

---

### Task 1: Reorganize README language files

**Files:**
- Create: `README.en.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: current complete English `README.md` and complete Chinese `README.zh-CN.md`.
- Produces: Chinese-first GitHub landing page with reciprocal language navigation and a non-broken legacy Chinese path.

- [ ] **Step 1: Move the complete English page**

Move the current `README.md` content to `README.en.md`, then change its language selector to:

```html
<p><a href="README.md">简体中文</a> · <strong>English</strong></p>
```

- [ ] **Step 2: Move the complete Chinese page to the default path**

Move the current `README.zh-CN.md` content to `README.md`, then change its language selector to:

```html
<p><strong>简体中文</strong> · <a href="README.en.md">English</a></p>
```

- [ ] **Step 3: Restore the compatibility path**

Create `README.zh-CN.md` with a short Chinese notice and links to `README.md` and `README.en.md`.

- [ ] **Step 4: Update maintainer documentation**

Define `README.md` as the default Simplified Chinese homepage, `README.en.md` as the English homepage, and `README.zh-CN.md` as the compatibility entry in `AGENTS.md`.

- [ ] **Step 5: Verify structure and links**

Run:

```powershell
rg -n "README\.md|README\.en\.md|README\.zh-CN\.md" README.md README.en.md README.zh-CN.md AGENTS.md
git diff --check
git status --short
```

Expected: all three README files exist; Chinese is the first full page in `README.md`; English is the first full page in `README.en.md`; all relative language links target existing files; `git diff --check` exits 0.
