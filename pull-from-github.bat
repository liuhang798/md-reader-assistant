@echo off
setlocal EnableExtensions EnableDelayedExpansion

title Quillite Markdown - Get Latest Code
cd /d "%~dp0"

set "REPO_URL=https://github.com/liuhang798/quillite-markdown.git"
set "BRANCH=main"
set "MAX_RETRIES=3"
set "SYSTEM_PROXY="
set "STATUS_FILE=%TEMP%\md-reader-pull-%RANDOM%-%RANDOM%.tmp"

echo.
echo ========================================
echo   Quillite Markdown - Get Latest Code
echo ========================================
echo   Project: %CD%
echo   Remote : %REPO_URL%
echo   Branch : %BRANCH%
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git was not found.
    echo Install Git for Windows from:
    echo https://git-scm.com/download/win
    goto :failed
)

if not exist ".git" (
    echo [ERROR] This folder is not a Git repository.
    echo Run this file from the Quillite Markdown project folder.
    goto :failed
)

echo [1/6] Checking the local worktree...
git status --porcelain --untracked-files=all >"%STATUS_FILE%"
if errorlevel 1 (
    echo [ERROR] Git could not inspect the local worktree.
    goto :failed
)

for %%S in ("%STATUS_FILE%") do if %%~zS GTR 0 (
    echo [STOP] Local changes were found. Nothing was downloaded.
    echo.
    type "%STATUS_FILE%"
    echo.
    echo Commit, push, stash, or remove these changes before trying again.
    goto :failed
)
del /q "%STATUS_FILE%" >nul 2>&1

echo [2/6] Configuring the GitHub remote...
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin "%REPO_URL%"
) else (
    git remote set-url origin "%REPO_URL%"
)
if errorlevel 1 (
    echo [ERROR] Git could not configure the origin remote.
    goto :failed
)

for /f "usebackq delims=" %%P in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'; if($p.ProxyEnable -eq 1 -and $p.ProxyServer){$v=[string]$p.ProxyServer; if($v -match '(?:^|;)https=([^;]+)'){$v=$Matches[1]} elseif($v -match '(?:^|;)http=([^;]+)'){$v=$Matches[1]}; if($v -notmatch '^[a-z]+://'){$v='http://'+$v}; $v}"`) do set "SYSTEM_PROXY=%%P"

if defined SYSTEM_PROXY (
    echo [3/6] Windows system proxy detected for this update.
) else (
    echo [3/6] Using a direct network connection.
)

echo [4/6] Fetching the latest GitHub history...
call :fetch_with_retry
if errorlevel 1 goto :network_failed

git show-ref --verify --quiet "refs/remotes/origin/%BRANCH%"
if errorlevel 1 (
    echo [ERROR] origin/%BRANCH% was not found after fetching.
    goto :failed
)

echo [5/6] Switching to the local %BRANCH% branch...
git checkout "%BRANCH%" >nul 2>&1
if errorlevel 1 (
    git checkout -b "%BRANCH%" --track "origin/%BRANCH%"
    if errorlevel 1 (
        echo [ERROR] Git could not switch to the %BRANCH% branch.
        goto :failed
    )
)

echo [6/6] Applying the update with fast-forward only...
git merge --ff-only "origin/%BRANCH%"
if errorlevel 1 (
    echo.
    echo [STOP] Local and GitHub history have diverged.
    echo No files were overwritten and no automatic merge was created.
    echo Push or reconcile the local commits before trying again.
    goto :failed
)

echo.
echo Current version:
git log -1 --oneline
echo.
echo ========================================
echo   Latest code downloaded successfully.
echo ========================================
if not defined PULL_SCRIPT_TEST ping 127.0.0.1 -n 4 >nul
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
if not defined PULL_SCRIPT_TEST timeout /t 5 /nobreak >nul
goto :fetch_retry

:network_failed
echo.
echo [ERROR] GitHub download failed after %MAX_RETRIES% attempts.
echo Open https://github.com in a browser to check the connection,
echo then disable an unstable VPN/proxy if necessary and try again.
goto :failed

:failed
if exist "%STATUS_FILE%" del /q "%STATUS_FILE%" >nul 2>&1
echo.
echo The update did not complete. Your local files were not overwritten.
if not defined PULL_SCRIPT_TEST ping 127.0.0.1 -n 11 >nul
exit /b 1
