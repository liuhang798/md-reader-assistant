@echo off
setlocal EnableExtensions EnableDelayedExpansion

title MD Reader Assistant - Automatic GitHub Push
cd /d "%~dp0"

set "REPO_URL=https://github.com/liuhang798/md-reader-assistant.git"
set "BRANCH=main"
set "COMMIT_MSG=Automatic update - MD Reader Assistant"

echo.
echo ========================================
echo   MD Reader Assistant - Automatic Push
echo ========================================
echo   Project: %CD%
echo   Remote : %REPO_URL%
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git was not found.
    echo Install Git for Windows from:
    echo https://git-scm.com/download/win
    goto :failed
)

if not exist ".git" (
    echo [1/8] Initializing the Git repository...
    git init
    if errorlevel 1 goto :failed
) else (
    echo [1/8] Git repository already initialized.
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin "%REPO_URL%"
) else (
    git remote set-url origin "%REPO_URL%"
)
if errorlevel 1 goto :failed

echo [2/8] Configuring Git author information...
git config user.name >nul 2>&1
if errorlevel 1 git config user.name "liuhang798"
git config user.email >nul 2>&1
if errorlevel 1 git config user.email "liuhang798@users.noreply.github.com"

echo [3/8] Configuring the main branch...
git branch -M "%BRANCH%"
if errorlevel 1 goto :failed

echo [4/8] Fetching the latest GitHub history...
git fetch origin "%BRANCH%"
if errorlevel 1 goto :push_failed

git rev-parse --verify HEAD >nul 2>&1
if errorlevel 1 (
    echo [5/8] Connecting this folder to the GitHub history...
    git reset --mixed "origin/%BRANCH%"
    if errorlevel 1 goto :failed
) else (
    git merge-base HEAD "origin/%BRANCH%" >nul 2>&1
    if errorlevel 1 (
        echo [5/8] Repairing unrelated local and GitHub histories...
        git reset --soft "origin/%BRANCH%"
        if errorlevel 1 goto :failed
    ) else (
        git merge-base --is-ancestor "origin/%BRANCH%" HEAD >nul 2>&1
        if errorlevel 1 (
            echo [5/8] Applying local work on top of the latest GitHub version...
            git rebase --autostash "origin/%BRANCH%"
            if errorlevel 1 goto :failed
        ) else (
            echo [5/8] Local history is ready.
        )
    )
)

echo [6/8] Staging project files...
git add .
if errorlevel 1 goto :failed

git diff --cached --quiet
if errorlevel 1 (
    echo [7/8] Creating an automatic commit...
    git commit -m "%COMMIT_MSG%"
    if errorlevel 1 goto :failed
) else (
    echo [7/8] No new changes to commit.
)

echo [8/8] Pushing to GitHub...
git push -u origin "%BRANCH%"
if errorlevel 1 goto :push_failed

echo.
echo ========================================
echo   Push completed successfully.
echo   https://github.com/liuhang798/md-reader-assistant
echo ========================================
timeout /t 3 /nobreak >nul
exit /b 0

:push_failed
echo.
echo [ERROR] GitHub push failed.
echo Check your network connection or GitHub sign-in and run this file again.
goto :failed

:failed
echo.
echo The operation did not complete. This window will close in 10 seconds.
timeout /t 10 /nobreak >nul
exit /b 1
