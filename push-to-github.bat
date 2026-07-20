@echo off
setlocal EnableExtensions EnableDelayedExpansion

title MD Reader Assistant - Push to GitHub
cd /d "%~dp0"

set "REPO_URL=https://github.com/liuhang798/md-reader-assistant.git"
set "BRANCH=main"

echo.
echo ========================================
echo   MD Reader Assistant - GitHub Push
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
    echo [1/6] Initializing the Git repository...
    git init
    if errorlevel 1 goto :failed
) else (
    echo [1/6] Git repository already initialized.
)

echo [2/6] Checking Git author information...
set "GIT_USER="
set "GIT_EMAIL="
for /f "delims=" %%I in ('git config user.name 2^>nul') do set "GIT_USER=%%I"
for /f "delims=" %%I in ('git config user.email 2^>nul') do set "GIT_EMAIL=%%I"

if not defined GIT_USER (
    set /p "GIT_USER=Enter your GitHub username: "
    if not defined GIT_USER (
        echo [ERROR] Username cannot be empty.
        goto :failed
    )
    git config user.name "!GIT_USER!"
    if errorlevel 1 goto :failed
)

if not defined GIT_EMAIL (
    set /p "GIT_EMAIL=Enter your GitHub email: "
    if not defined GIT_EMAIL (
        echo [ERROR] Email cannot be empty.
        goto :failed
    )
    git config user.email "!GIT_EMAIL!"
    if errorlevel 1 goto :failed
)

echo [3/6] Configuring the main branch and remote...
git branch -M "%BRANCH%"
if errorlevel 1 goto :failed

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin "%REPO_URL%"
) else (
    git remote set-url origin "%REPO_URL%"
)
if errorlevel 1 goto :failed

echo [4/6] Staging project files...
git add .
if errorlevel 1 goto :failed

git diff --cached --quiet
if errorlevel 1 (
    set "COMMIT_MSG=%~1"
    if not defined COMMIT_MSG set /p "COMMIT_MSG=Commit message [Update MD Reader Assistant]: "
    if not defined COMMIT_MSG set "COMMIT_MSG=Update MD Reader Assistant"

    echo [5/6] Creating commit: !COMMIT_MSG!
    git commit -m "!COMMIT_MSG!"
    if errorlevel 1 goto :failed
) else (
    echo [5/6] No new changes to commit.
)

echo [6/6] Pushing to GitHub...
echo Complete the GitHub sign-in if a browser window appears.
git push -u origin "%BRANCH%"
if errorlevel 1 goto :push_failed

echo.
echo ========================================
echo   Push completed successfully.
echo   https://github.com/liuhang798/md-reader-assistant
echo ========================================
echo.
pause
exit /b 0

:push_failed
echo.
echo [ERROR] GitHub push failed.
echo If the remote repository already contains a README, run:
echo git pull --rebase origin main
echo Resolve any conflicts, then run this script again.
goto :failed

:failed
echo.
echo The operation did not complete. Review the message above and retry.
echo.
pause
exit /b 1
