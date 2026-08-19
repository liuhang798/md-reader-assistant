//go:build darwin

package main

import (
	"os"
	"os/exec"
)

// scheduleMacInstallerImageCleanup removes the read-only installer copy from
// Launch Services by ejecting a still-mounted official DMG after the installed
// application has started. It never runs when the app itself is on the DMG.
func scheduleMacInstallerImageCleanup() {
	executable, err := os.Executable()
	if err != nil {
		return
	}
	homeDir, _ := os.UserHomeDir()
	if !isInstalledMacApplication(executable, homeDir) {
		return
	}
	for _, mountPoint := range findMountedMacInstallerImages("/Volumes") {
		mountPoint := mountPoint
		go func() {
			_ = exec.Command("/usr/bin/hdiutil", "detach", mountPoint).Run()
		}()
	}
}
