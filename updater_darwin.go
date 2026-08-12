//go:build darwin

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// applyUpdate replaces the running application's executable inside the .app
// bundle through a detached shell script. The script waits for this process to
// exit, copies the verified binary over the old one, and relaunches the app.
// Because the new file is written by the application itself it carries no
// quarantine attribute, so Gatekeeper does not ask for permission again.
// Note: this direct binary swap assumes an unsigned bundle. Once the app is
// Developer ID signed, replacing the executable invalidates the signature and
// Gatekeeper will report the bundle as damaged; a signed build must re-sign
// (or replace the whole .app) instead.
func applyUpdate(downloadPath string) error {
	executable, err := os.Executable()
	if err != nil {
		return err
	}
	appBundle := filepath.Dir(filepath.Dir(filepath.Dir(executable)))
	logPath := filepath.Join(filepath.Dir(downloadPath), "apply-update.log")
	scriptPath := filepath.Join(filepath.Dir(downloadPath), "apply-update.sh")
	script := fmt.Sprintf(`#!/bin/sh
exec >>"%s" 2>&1
set -e
while kill -0 %d 2>/dev/null; do sleep 0.3; done
cp "%s" "%s"
chmod +x "%s"
open "%s"
`, logPath, os.Getpid(), downloadPath, executable, executable, appBundle)
	if err := os.WriteFile(scriptPath, []byte(script), 0o755); err != nil {
		return err
	}
	return exec.Command("/bin/sh", scriptPath).Start()
}

// runUpdateHelperIfRequested is a no-op on darwin: the shell script handles
// the replacement there.
func runUpdateHelperIfRequested() {}
