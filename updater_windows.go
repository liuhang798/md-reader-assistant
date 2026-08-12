//go:build windows

package main

import (
	"os/exec"
	"syscall"
)

// applyUpdate runs the downloaded NSIS installer in silent mode (/S). The
// installer closes the running application (see EnsureApplicationClosed in
// project.nsi), replaces the files, and starts the new version. The project
// installer also restarts the app after a silent upgrade.
func applyUpdate(downloadPath string) error {
	command := exec.Command(downloadPath, "/S")
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return command.Start()
}
