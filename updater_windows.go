//go:build windows

package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

// applyUpdate replaces the running application's executable through a detached
// batch script. The script waits for this process to exit (releasing the
// single-instance lock), copies the verified binary over the old one, and
// starts the new version. This works for both installed and portable
// deployments: it always replaces the executable that is actually running.
//
// The batch file itself is pure ASCII: every path is passed through environment
// variables (which Windows stores as UTF-16), so non-ASCII user names and
// folders survive cmd.exe's ANSI code page parsing. Delays use ping instead of
// timeout because timeout fails when stdin is unavailable in a GUI process.
func applyUpdate(downloadPath string) error {
	executable, err := os.Executable()
	if err != nil {
		return err
	}
	logPath := filepath.Join(filepath.Dir(downloadPath), "apply-update.log")
	scriptPath := filepath.Join(filepath.Dir(downloadPath), "apply-update.bat")
	script := windowsUpdateScript()
	if err := os.WriteFile(scriptPath, []byte(script), 0o644); err != nil {
		return err
	}
	command := exec.Command("cmd", "/C", scriptPath)
	command.Env = append(os.Environ(),
		"UPDATE_PROC="+filepath.Base(executable),
		"UPDATE_NEW="+downloadPath,
		"UPDATE_OLD="+executable,
		"UPDATE_LOG="+logPath,
	)
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return command.Start()
}

func windowsUpdateScript() string {
	return `@echo off
rem In-app updater: wait for the old process to exit, replace it, restart.
set /a tries=0
:loop
tasklist /FI "IMAGENAME eq %UPDATE_PROC%" 2>nul | find /I "%UPDATE_PROC%" >nul
if errorlevel 1 goto copy
set /a tries+=1
if %tries% geq 90 (
  echo [apply-update] timed out waiting for the old process to exit >> "%UPDATE_LOG%"
  exit /b 1
)
ping -n 2 127.0.0.1 >nul
goto loop
:copy
echo [apply-update] replacing the old binary >> "%UPDATE_LOG%"
copy /Y "%UPDATE_NEW%" "%UPDATE_OLD%" >> "%UPDATE_LOG%" 2>&1
if errorlevel 1 (
  echo [apply-update] copy failed >> "%UPDATE_LOG%"
  exit /b 1
)
echo [apply-update] starting the new version >> "%UPDATE_LOG%"
start "" "%UPDATE_OLD%"
`
}
