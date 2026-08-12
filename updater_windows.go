//go:build windows

package main

import (
	"fmt"
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
// Progress and errors are appended to apply-update.log in the update folder.
func applyUpdate(downloadPath string) error {
	executable, err := os.Executable()
	if err != nil {
		return err
	}
	logPath := filepath.Join(filepath.Dir(downloadPath), "apply-update.log")
	scriptPath := filepath.Join(filepath.Dir(downloadPath), "apply-update.bat")
	script := windowsUpdateScript(downloadPath, executable, logPath)
	if err := os.WriteFile(scriptPath, []byte(script), 0o644); err != nil {
		return err
	}
	command := exec.Command("cmd", "/C", scriptPath)
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return command.Start()
}

func windowsUpdateScript(downloadPath, executable, logPath string) string {
	processName := filepath.Base(executable)
	return fmt.Sprintf(`@echo off
rem In-app updater: wait for the old process, replace it, restart.
set /a tries=0
:loop
tasklist /FI "IMAGENAME eq %s" 2>nul | find /I "%s" >nul
if errorlevel 1 goto copy
set /a tries+=1
if %%tries%% geq 90 (
  echo [apply-update] timed out waiting for "%s" to exit >> "%s"
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto loop
:copy
echo [apply-update] replacing %s with %s >> "%s"
copy /Y "%s" "%s" >> "%s" 2>&1
if errorlevel 1 (
  echo [apply-update] copy failed >> "%s"
  exit /b 1
)
start "" "%s"
`, processName, processName, processName, logPath, executable, downloadPath, logPath, downloadPath, executable, logPath, logPath, executable)
}
