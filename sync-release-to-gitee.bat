@echo off
setlocal EnableExtensions EnableDelayedExpansion

title MD Reader Assistant - Sync Release Assets to Gitee
cd /d "%~dp0"

set "GITHUB_REPO=liuhang798/md-reader-assistant"
set "GITEE_REPO_URL=https://gitee.com/liuhang798/md-reader-assistant.git"
set "BRANCH=release-assets"
set "RELEASE_TAG=%~1"
set "SYSTEM_PROXY="
set "WORK_DIR=%TEMP%\md-reader-assets-%RANDOM%"

if "%RELEASE_TAG%"=="" (
    for /f "usebackq delims=" %%V in (`powershell.exe -NoProfile -Command "(Get-Content wails.json -Raw | ConvertFrom-Json).info.productVersion"`) do set "RELEASE_TAG=v%%V"
)
if "%RELEASE_TAG%"=="" (
    echo [ERROR] Cannot determine release tag. Usage: %~nx0 [vX.Y.Z]
    goto :failed
)

echo.
echo ========================================
echo   Sync GitHub Release Assets to Gitee
echo   GitHub : %GITHUB_REPO% @ %RELEASE_TAG%
echo   Target : %GITEE_REPO_URL% ^(%BRANCH%^)
echo ========================================
echo.

where gh >nul 2>&1
if errorlevel 1 (
    echo [ERROR] GitHub CLI ^(gh^) not found. Install from https://cli.github.com/
    goto :failed
)

rem ---- read Windows system proxy (same as push-to-github.bat) ----
for /f "usebackq delims=" %%P in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'; if($p.ProxyEnable -eq 1 -and $p.ProxyServer){$v=[string]$p.ProxyServer; if($v -match '(?:^|;)https=([^;]+)'){$v=$Matches[1]} elseif($v -match '(?:^|;)http=([^;]+)'){$v=$Matches[1]}; if($v -notmatch '^[a-z]+://'){$v='http://'+$v}; $v}"`) do set "SYSTEM_PROXY=%%P"
if defined SYSTEM_PROXY (
    echo   GitHub proxy: %SYSTEM_PROXY%
    set "HTTPS_PROXY=!SYSTEM_PROXY!"
    set "HTTP_PROXY=!SYSTEM_PROXY!"
) else (
    echo   GitHub proxy: none ^(direct connection^)
)
echo.

echo [1/4] Downloading release assets from GitHub...
if exist "%WORK_DIR%" rmdir /s /q "%WORK_DIR%"
mkdir "%WORK_DIR%" >nul
gh release download "%RELEASE_TAG%" --repo "%GITHUB_REPO%" --dir "%WORK_DIR%" --pattern "*"
if errorlevel 1 (
    echo [ERROR] Failed to download assets for %RELEASE_TAG% from GitHub.
    echo Check that the tag exists and gh is authenticated.
    goto :failed
)
echo       Downloaded files:
dir /b "%WORK_DIR%" | findstr /r ".*" >nul && dir /b "%WORK_DIR%"
echo.

echo [2/4] Preparing git repo for branch %BRANCH%...
pushd "%WORK_DIR%" >nul
git init -q -b "%BRANCH%"
if errorlevel 1 goto :pop_failed
git add -A
git -c user.name="md-reader-assistant" -c user.email="liuhang798@users.noreply.gitee.com" commit -q -m "release %RELEASE_TAG% assets"
if errorlevel 1 goto :pop_failed
echo       Committed %RELEASE_TAG% assets.
echo.

echo [3/4] Pushing to Gitee %BRANCH% branch ^(direct connection, no proxy^)...
git remote add origin "%GITEE_REPO_URL%"
git -c http.postBuffer=524288000 -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=300 push origin "%BRANCH%" --force
if errorlevel 1 (
    echo [ERROR] Push to Gitee failed. Check Gitee credentials ^(git credential manager^).
    goto :pop_failed
)
echo.

echo [4/4] Cleaning up...
popd >nul
rmdir /s /q "%WORK_DIR%" 2>nul

echo.
echo ========================================
echo   Done! Assets available at:
echo   https://gitee.com/liuhang798/md-reader-assistant/tree/%BRANCH%
echo ========================================
ping 127.0.0.1 -n 4 >nul
exit /b 0

:pop_failed
popd >nul
rmdir /s /q "%WORK_DIR%" 2>nul

:failed
echo.
echo The operation did not complete. This window will close in 10 seconds.
ping 127.0.0.1 -n 11 >nul
exit /b 1
