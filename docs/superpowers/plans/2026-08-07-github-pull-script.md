# GitHub Pull Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a double-clickable Windows BAT file that safely updates the local `main` branch from GitHub without overwriting local work.

**Architecture:** A single root-level batch script performs prerequisite checks, rejects dirty worktrees, configures `origin`, fetches with bounded retry and system-proxy compatibility, then updates only through a fast-forward merge. A PowerShell test harness uses a temporary fake Git executable to verify command flow without touching GitHub.

**Tech Stack:** Windows Batch, PowerShell, Git for Windows

## Global Constraints

- Work directly in `D:\mycode\MD阅读助手-Go`.
- Never use destructive Git commands or overwrite uncommitted files.
- Update only `main` from `origin/main` and refuse divergent histories.
- Do not modify global Git proxy configuration.

---

### Task 1: Add executable behavior tests

**Files:**
- Create: `scripts/test-pull-from-github.ps1`
- Test: `pull-from-github.bat`

**Interfaces:**
- Consumes: `pull-from-github.bat` in the project root.
- Produces: exit status and a fake-Git command log used to verify safe behavior.

- [ ] **Step 1: Write the failing test**

Create a PowerShell harness that copies the BAT to a temporary repository, places a fake `git.cmd` first on `PATH`, and asserts that a clean run calls `fetch` and `merge --ff-only`, while a dirty run exits non-zero before either command.

- [ ] **Step 2: Run test to verify it fails**

Run: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-pull-from-github.ps1`

Expected: failure because `pull-from-github.bat` does not exist.

### Task 2: Implement the safe pull script

**Files:**
- Create: `pull-from-github.bat`
- Test: `scripts/test-pull-from-github.ps1`

**Interfaces:**
- Consumes: Git for Windows, Windows internet proxy settings, local `.git` metadata.
- Produces: a fast-forwarded local `main` branch or a non-zero exit with an actionable message.

- [ ] **Step 1: Add prerequisite and worktree checks**

Implement script-directory navigation, Git/repository validation, and `git status --porcelain --untracked-files=all` refusal.

- [ ] **Step 2: Add safe network update**

Configure `origin`, detect the Windows proxy, retry `git fetch --no-tags --prune origin main` three times, check out/create `main`, and execute `git merge --ff-only origin/main`.

- [ ] **Step 3: Run behavior tests**

Run: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-pull-from-github.ps1`

Expected: both clean and dirty scenarios pass.

- [ ] **Step 4: Run repository checks**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors; only planned files are changed.

- [ ] **Step 5: Commit**

```powershell
git add pull-from-github.bat scripts/test-pull-from-github.ps1 docs/superpowers/plans/2026-08-07-github-pull-script.md
git commit -m "Add safe GitHub pull script"
```
