//go:build !windows

package main

import (
	"os/exec"
	"path/filepath"
	"runtime"
)

func revealInFolder(filePath string) error {
	if runtime.GOOS == "darwin" {
		return exec.Command("open", "-R", filePath).Start()
	}
	return exec.Command("xdg-open", filepath.Dir(filePath)).Start()
}
