package main

import (
	"os"
	"path/filepath"
	"strings"
)

const macBundleIdentifier = "com.liuhang.quillite-markdown"

// findMountedMacInstallerImages returns only volumes that match the layout of
// the official drag-to-Applications DMG. hdiutil performs the final check that
// each candidate is an attached disk image before it can be detached.
func findMountedMacInstallerImages(volumesRoot string) []string {
	entries, err := os.ReadDir(volumesRoot)
	if err != nil {
		return nil
	}

	installerName := appNameZH
	appBundleName := appNameZH + ".app"
	matches := make([]string, 0, 1)
	for _, entry := range entries {
		if !entry.IsDir() || (entry.Name() != installerName && !strings.HasPrefix(entry.Name(), installerName+" ")) {
			continue
		}

		mountPoint := filepath.Join(volumesRoot, entry.Name())
		applicationsTarget, err := os.Readlink(filepath.Join(mountPoint, "Applications"))
		if err != nil || filepath.Clean(applicationsTarget) != string(filepath.Separator)+"Applications" {
			continue
		}

		appBundle := filepath.Join(mountPoint, appBundleName)
		info, err := os.Stat(appBundle)
		if err != nil || !info.IsDir() {
			continue
		}
		plist, err := os.ReadFile(filepath.Join(appBundle, "Contents", "Info.plist"))
		if err != nil {
			continue
		}
		plistText := string(plist)
		if !strings.Contains(plistText, "<key>CFBundleIdentifier</key>") ||
			!strings.Contains(plistText, "<string>"+macBundleIdentifier+"</string>") {
			continue
		}
		matches = append(matches, mountPoint)
	}
	return matches
}

func isInstalledMacApplication(executable, homeDir string) bool {
	installRoots := []string{string(filepath.Separator) + "Applications"}
	if strings.TrimSpace(homeDir) != "" {
		installRoots = append(installRoots, filepath.Join(homeDir, "Applications"))
	}
	for _, root := range installRoots {
		relative, err := filepath.Rel(root, executable)
		if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
			continue
		}
		if strings.Contains(filepath.ToSlash(relative), ".app/Contents/MacOS/") {
			return true
		}
	}
	return false
}
