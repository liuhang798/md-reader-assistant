//go:build windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

// applyUpdate starts a hidden helper instance of the same executable that
// performs the replacement after this process exits. A batch script cannot be
// used here: cmd.exe is unable to resolve non-ASCII paths (the update folder
// lives under a user profile whose name is Chinese on this machine), so the
// whole flow runs in Go, which passes UTF-16 paths to the Win32 API.
func applyUpdate(downloadPath string) error {
	executable, err := os.Executable()
	if err != nil {
		return err
	}
	command := exec.Command(executable, "--apply-update", downloadPath, executable, strconv.Itoa(os.Getpid()))
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return command.Start()
}

// runUpdateHelperIfRequested handles the "--apply-update" helper mode: it
// waits for the parent process to exit, replaces the old executable with the
// verified new binary, and starts the new version.
func runUpdateHelperIfRequested() {
	if len(os.Args) < 5 || os.Args[1] != "--apply-update" {
		return
	}
	err := runUpdateHelper(os.Args[2], os.Args[3], os.Args[4], filepath.Join(filepath.Dir(os.Args[2]), "apply-update.log"))
	if err != nil {
		os.Exit(1)
	}
	os.Exit(0)
}

func runUpdateHelper(newBinary, oldExecutable, parentPID, logPath string) error {
	writeLog := func(format string, args ...any) {
		file, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
		if err != nil {
			return
		}
		defer file.Close()
		_, _ = fmt.Fprintf(file, format+"\n", args...)
	}

	writeLog("[apply-update] helper started, waiting for pid %s to exit", parentPID)
	deadline := time.Now().Add(90 * time.Second)
	for time.Now().Before(deadline) {
		if !processAlive(parentPID) {
			break
		}
		time.Sleep(time.Second)
	}
	if processAlive(parentPID) {
		return fmt.Errorf("timed out waiting for the old process to exit")
	}

	writeLog("[apply-update] replacing %s", oldExecutable)
	if err := replaceFile(newBinary, oldExecutable); err != nil {
		return fmt.Errorf("replace failed: %w", err)
	}

	writeLog("[apply-update] starting the new version")
	if err := exec.Command(oldExecutable).Start(); err != nil {
		return fmt.Errorf("start failed: %w", err)
	}
	writeLog("[apply-update] done")
	return nil
}

func processAlive(pid string) bool {
	output, err := exec.Command("tasklist", "/FI", "PID eq "+pid, "/NH").Output()
	return err == nil && strings.Contains(string(output), pid)
}

func replaceFile(source, target string) error {
	data, err := os.ReadFile(source)
	if err != nil {
		return err
	}
	return os.WriteFile(target, data, 0o755)
}
