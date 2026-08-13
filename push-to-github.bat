@echo off
setlocal EnableExtensions EnableDelayedExpansion

title MD Reader Assistant - Automatic GitHub Push
cd /d "%~dp0"

set "REPO_URL=https://github.com/liuhang798/md-reader-assistant.git"
set "GITEE_REPO_URL=https://gitee.com/liuhang798/md-reader-assistant.git"
set "BRANCH=main"
set "COMMIT_MSG=Release v2.4.0: stable installer-free in-app updates"
set "MAX_RETRIES=3"
set "SYSTEM_PROXY="

echo.
echo ========================================
echo   MD Reader Assistant - Automatic Push
echo ========================================
echo   Project: %CD%
echo   Remote : %REPO_URL%   Gitee: %GITEE_REPO_URL%
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git was not found.
    echo Install Git for Windows from:
    echo https://git-scm.com/download/win
    goto :failed
)

for /f "usebackq delims=" %%P in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'; if($p.ProxyEnable -eq 1 -and $p.ProxyServer){$v=[string]$p.ProxyServer; if($v -match '(?:^|;)https=([^;]+)'){$v=$Matches[1]} elseif($v -match '(?:^|;)http=([^;]+)'){$v=$Matches[1]}; if($v -notmatch '^[a-z]+://'){$v='http://'+$v}; $v}"`) do set "SYSTEM_PROXY=%%P"
if defined SYSTEM_PROXY (
    echo   Network: Windows system proxy detected and enabled for Git.
) else (
    echo   Network: Direct connection.
)
echo.

if not exist ".git" (
    echo [1/9] Initializing the Git repository...
    git init
    if errorlevel 1 goto :failed
) else (
    echo [1/9] Git repository already initialized.
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin "%REPO_URL%"
) else (
    git remote set-url origin "%REPO_URL%"
)
if errorlevel 1 goto :failed

git remote get-url gitee >nul 2>&1
if errorlevel 1 (
    git remote add gitee "%GITEE_REPO_URL%"
) else (
    git remote set-url gitee "%GITEE_REPO_URL%"
)
if errorlevel 1 goto :failed

echo [2/9] Configuring Git author information...
git config user.name >nul 2>&1
if errorlevel 1 git config user.name "liuhang798"
git config user.email >nul 2>&1
if errorlevel 1 git config user.email "liuhang798@users.noreply.github.com"

echo [3/9] Configuring the main branch...
git branch -M "%BRANCH%"
if errorlevel 1 goto :failed

echo [4/9] Fetching the latest GitHub history...
call :fetch_with_retry
if errorlevel 1 goto :push_failed

git rev-parse --verify HEAD >nul 2>&1
if errorlevel 1 (
    echo [5/9] Connecting this folder to the GitHub history...
    git reset --mixed "origin/%BRANCH%"
    if errorlevel 1 goto :failed
) else (
    git merge-base HEAD "origin/%BRANCH%" >nul 2>&1
    if errorlevel 1 (
        echo [5/9] Repairing unrelated local and GitHub histories...
        git reset --soft "origin/%BRANCH%"
        if errorlevel 1 goto :failed
    ) else (
        git merge-base --is-ancestor "origin/%BRANCH%" HEAD >nul 2>&1
        if errorlevel 1 (
            echo [5/9] Applying local work on top of the latest GitHub version...
            git rebase --autostash "origin/%BRANCH%"
            if errorlevel 1 goto :failed
        ) else (
            echo [5/9] Local history is ready.
        )
    )
)

echo [6/9] Staging project files...
git add .
if errorlevel 1 goto :failed

git diff --cached --check -- . ":(exclude)frontend/wailsjs/**" ":(exclude)build/windows/installer/wails_tools.nsh"
if errorlevel 1 (
    echo [ERROR] Git found whitespace or conflict-marker problems in staged files.
    goto :failed
)

git diff --cached --quiet
if errorlevel 1 (
    echo [7/9] Creating an automatic commit...
    git commit -m "%COMMIT_MSG%"
    if errorlevel 1 goto :failed
) else (
    echo [7/9] No new changes to commit.
)

echo [8/9] Pushing to GitHub...
call :push_with_retry
if errorlevel 1 goto :push_failed

echo [9/9] Syncing to the Gitee mirror...
call :push_gitee_with_retry
if errorlevel 1 (
    echo [WARNING] Gitee mirror sync failed, but the GitHub push already succeeded.
    echo           Sync it manually later with:  git push gitee main
)

echo.
echo ========================================
echo   Push completed successfully.
echo   https://github.com/liuhang798/md-reader-assistant
echo   https://gitee.com/liuhang798/md-reader-assistant
echo ========================================
ping 127.0.0.1 -n 4 >nul
exit /b 0

:fetch_with_retry
set /a "ATTEMPT=1"
:fetch_retry
echo       Network attempt !ATTEMPT!/%MAX_RETRIES%...
if defined SYSTEM_PROXY (
    git -c http.version=HTTP/1.1 -c "http.proxy=!SYSTEM_PROXY!" fetch --no-tags --prune origin "%BRANCH%"
) else (
    git -c http.version=HTTP/1.1 fetch --no-tags --prune origin "%BRANCH%"
)
if not errorlevel 1 exit /b 0
if !ATTEMPT! GEQ %MAX_RETRIES% exit /b 1
set /a "ATTEMPT+=1"
echo       Connection interrupted. Retrying in 5 seconds...
timeout /t 5 /nobreak >nul
goto :fetch_retry

:push_with_retry
set /a "ATTEMPT=1"
:push_retry
echo       Network attempt !ATTEMPT!/%MAX_RETRIES%...
if defined SYSTEM_PROXY (
    git -c http.version=HTTP/1.1 -c "http.proxy=!SYSTEM_PROXY!" push -u origin "%BRANCH%"
) else (
    git -c http.version=HTTP/1.1 push -u origin "%BRANCH%"
)
if not errorlevel 1 exit /b 0
if !ATTEMPT! GEQ %MAX_RETRIES% exit /b 1
set /a "ATTEMPT+=1"
echo       Connection interrupted. Retrying in 5 seconds...
timeout /t 5 /nobreak >nul
goto :push_retry

:push_gitee_with_retry
set /a "ATTEMPT=1"
:push_gitee_retry
echo       Network attempt !ATTEMPT!/%MAX_RETRIES%...
git -c http.version=HTTP/1.1 -c "http.proxy=" push -u gitee "%BRANCH%"
if not errorlevel 1 exit /b 0
if !ATTEMPT! GEQ %MAX_RETRIES% exit /b 1
set /a "ATTEMPT+=1"
echo       Connection interrupted. Retrying in 5 seconds...
timeout /t 5 /nobreak >nul
goto :push_gitee_retry

:push_failed
echo.
echo [ERROR] GitHub push failed.
echo The script retried %MAX_RETRIES% times with HTTP/1.1 compatibility enabled.
echo Open https://github.com in your browser to check the connection,
echo then disable an unstable VPN/proxy if necessary and run this file again.
goto :failed

:failed
echo.
echo The operation did not complete. This window will close in 10 seconds.
ping 127.0.0.1 -n 11 >nul
exit /b 1
