@echo off
setlocal EnableExtensions EnableDelayedExpansion

title MD Reader Assistant - Upload Assets to Gitee Release
cd /d "%~dp0"

set "GITHUB_REPO=liuhang798/md-reader-assistant"
set "GITEE_OWNER=liuhang798"
set "GITEE_REPO=md-reader-assistant"
set "RELEASE_TAG=%~1"
set "SYSTEM_PROXY="
set "WORK_DIR=%TEMP%\md-reader-attach-%RANDOM%"

if "%RELEASE_TAG%"=="" (
    for /f "usebackq delims=" %%V in (`powershell.exe -NoProfile -Command "(Get-Content wails.json -Raw | ConvertFrom-Json).info.productVersion"`) do set "RELEASE_TAG=v%%V"
)
if "%RELEASE_TAG%"=="" (
    echo [ERROR] Cannot determine release tag. Usage: %~nx0 [vX.Y.Z]
    goto :failed
)

echo.
echo ========================================
echo   Upload Release Assets to Gitee Release
echo   Tag    : %RELEASE_TAG%
echo   Target : https://gitee.com/%GITEE_OWNER%/%GITEE_REPO%/releases
echo ========================================
echo.

rem ---- token handling ----
rem The token is NEVER stored in this script or written to disk.
rem Priority: 1) environment variable GITEE_TOKEN (if already set)
rem           2) interactive masked prompt (kept in memory only for this run)
if "%GITEE_TOKEN%"=="" (
    echo Enter your Gitee personal token ^(projects permission^). Input is hidden:
    for /f "usebackq delims=" %%T in (`powershell.exe -NoProfile -Command "$p=Read-Host -Prompt 'Gitee token' -AsSecureString; $b=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($p); [Runtime.InteropServices.Marshal]::PtrToStringAuto($b)"`) do set "GITEE_TOKEN=%%T"
)
if "%GITEE_TOKEN%"=="" (
    echo [ERROR] No token provided.
    goto :failed
)

where gh >nul 2>&1
if errorlevel 1 (
    echo [ERROR] GitHub CLI ^(gh^) not found. Install from https://cli.github.com/
    goto :failed
)

rem ---- read Windows system proxy for GitHub download ----
for /f "usebackq delims=" %%P in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'; if($p.ProxyEnable -eq 1 -and $p.ProxyServer){$v=[string]$p.ProxyServer; if($v -match '(?:^|;)https=([^;]+)'){$v=$Matches[1]} elseif($v -match '(?:^|;)http=([^;]+)'){$v=$Matches[1]}; if($v -notmatch '^[a-z]+://'){$v='http://'+$v}; $v}"`) do set "SYSTEM_PROXY=%%P"
if defined SYSTEM_PROXY (
    echo   GitHub proxy: %SYSTEM_PROXY%
    set "HTTPS_PROXY=!SYSTEM_PROXY!"
    set "HTTP_PROXY=!SYSTEM_PROXY!"
)
echo.

echo [1/4] Downloading release assets from GitHub...
if exist "%WORK_DIR%" rmdir /s /q "%WORK_DIR%"
mkdir "%WORK_DIR%" >nul
gh release download "%RELEASE_TAG%" --repo "%GITHUB_REPO%" --dir "%WORK_DIR%" --pattern "*"
if errorlevel 1 (
    echo [ERROR] Failed to download assets for %RELEASE_TAG% from GitHub.
    goto :failed
)
dir /b "%WORK_DIR%"
echo.

echo [2/4] Looking up Gitee release id for %RELEASE_TAG%...
for /f "usebackq delims=" %%I in (`powershell.exe -NoProfile -Command "(Invoke-RestMethod 'https://gitee.com/api/v5/repos/%GITEE_OWNER%/%GITEE_REPO%/releases/tags/%RELEASE_TAG%').id"`) do set "RELEASE_ID=%%I"
if "%RELEASE_ID%"=="" (
    echo [ERROR] Release %RELEASE_TAG% not found on Gitee. Create it first ^(or run the workflow / GitHub Actions^).
    goto :failed
)
echo       Release id: %RELEASE_ID%
echo.

echo [3/4] Uploading assets ^(direct connection, no proxy^)...
set "UPLOAD_FAILED="
for %%F in ("%WORK_DIR%\*") do (
    echo   Uploading %%~nxF ...
    curl -sS --max-time 300 -X POST "https://gitee.com/api/v5/repos/%GITEE_OWNER%/%GITEE_REPO%/releases/%RELEASE_ID%/attach_files" -F "access_token=%GITEE_TOKEN%" -F "file=@%%F" > "%WORK_DIR%\resp.json"
    if errorlevel 1 (
        echo     [WARNING] curl failed for %%~nxF
        set "UPLOAD_FAILED=1"
    ) else (
        findstr /c:"message" "%WORK_DIR%\resp.json" >nul && (
            echo     [WARNING] Gitee reported: !type "%WORK_DIR%\resp.json"!
            set "UPLOAD_FAILED=1"
        ) || echo     OK
    )
)
echo.

echo [4/4] Cleaning up...
rmdir /s /q "%WORK_DIR%" 2>nul

if defined UPLOAD_FAILED (
    echo [WARNING] Some uploads may have failed. Check the Gitee release page.
) else (
    echo ========================================
    echo   Done! Assets on the Gitee release page:
    echo   https://gitee.com/%GITEE_OWNER%/%GITEE_REPO%/releases/%RELEASE_TAG%
    echo ========================================
)
ping 127.0.0.1 -n 4 >nul
exit /b 0

:failed
echo.
echo The operation did not complete. This window will close in 10 seconds.
ping 127.0.0.1 -n 11 >nul
exit /b 1
