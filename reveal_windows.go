//go:build windows

package main

import (
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

const (
	allowAnyProcess        = uintptr(0xFFFFFFFF)
	windowTopmost          = ^uintptr(0)
	windowNotTopmost       = ^uintptr(1)
	showWindowRestore      = 9
	setWindowNoSize        = 0x0001
	setWindowNoMove        = 0x0002
	setWindowShow          = 0x0040
	explorerFocusTimeout   = 2 * time.Second
	explorerFocusPollDelay = 75 * time.Millisecond
)

var (
	user32DLL                    = syscall.NewLazyDLL("user32.dll")
	allowSetForegroundWindowProc = user32DLL.NewProc("AllowSetForegroundWindow")
	enumWindowsProc              = user32DLL.NewProc("EnumWindows")
	getClassNameProc             = user32DLL.NewProc("GetClassNameW")
	getWindowTextProc            = user32DLL.NewProc("GetWindowTextW")
	isWindowVisibleProc          = user32DLL.NewProc("IsWindowVisible")
	setForegroundWindowProc      = user32DLL.NewProc("SetForegroundWindow")
	setWindowPosProc             = user32DLL.NewProc("SetWindowPos")
	showWindowProc               = user32DLL.NewProc("ShowWindow")
)

// revealInFolder asks Explorer to select the file and explicitly gives the
// Windows shell permission to become the foreground application. Windows can
// otherwise reuse an existing Explorer window behind the Wails window.
func revealInFolder(filePath string) error {
	cleanedPath := filepath.Clean(filePath)
	targetDirectory := filepath.Dir(cleanedPath)

	// The current foreground process may grant this permission. Explorer uses
	// it when activating a reused folder window.
	_, _, _ = allowSetForegroundWindowProc.Call(allowAnyProcess)

	if err := exec.Command("explorer.exe", "/select,"+cleanedPath).Start(); err != nil {
		return err
	}

	// Some Windows 10/11 configurations still leave an already-open Explorer
	// window behind the app. Poll briefly and activate the best matching shell
	// window as a fallback, without delaying the frontend call.
	go focusExplorerWindow(targetDirectory)
	return nil
}

func focusExplorerWindow(targetDirectory string) {
	startedAt := time.Now()
	deadline := startedAt.Add(explorerFocusTimeout)
	fallbackAt := startedAt.Add(500 * time.Millisecond)
	time.Sleep(explorerFocusPollDelay)
	for time.Now().Before(deadline) {
		windows := enumerateExplorerWindows()
		if len(windows) > 0 {
			var target *explorerWindow
			for _, candidate := range windows {
				if explorerTitleMatchesDirectory(candidate.title, targetDirectory) {
					matched := candidate
					target = &matched
					break
				}
			}
			// Give Explorer time to create or navigate the requested window before
			// falling back to its highest window in Z order. This avoids briefly
			// activating an unrelated folder when several Explorer windows exist.
			if target == nil && time.Now().After(fallbackAt) {
				target = &windows[0]
			}
			if target != nil {
				if bringExplorerWindowToFront(target.handle) {
					return
				}
			}
		}
		time.Sleep(explorerFocusPollDelay)
	}
}

func bringExplorerWindowToFront(hwnd uintptr) bool {
	showWindowProc.Call(hwnd, showWindowRestore)

	// SetForegroundWindow is intentionally restricted by Windows and can fail
	// when a Wails binding runs outside the UI thread. A topmost -> not-topmost
	// transition reliably moves Explorer above this app while immediately
	// restoring Explorer's normal (non-always-on-top) behaviour.
	flags := uintptr(setWindowNoSize | setWindowNoMove | setWindowShow)
	raised, _, _ := setWindowPosProc.Call(hwnd, windowTopmost, 0, 0, 0, 0, flags)
	restored, _, _ := setWindowPosProc.Call(hwnd, windowNotTopmost, 0, 0, 0, 0, flags)
	setForegroundWindowProc.Call(hwnd)
	return raised != 0 && restored != 0
}

type explorerWindow struct {
	handle uintptr
	title  string
}

func enumerateExplorerWindows() []explorerWindow {
	var result []explorerWindow
	callback := syscall.NewCallback(func(hwnd uintptr, _ uintptr) uintptr {
		visible, _, _ := isWindowVisibleProc.Call(hwnd)
		if visible == 0 {
			return 1
		}

		className := windowString(hwnd, getClassNameProc)
		if !isExplorerWindowClass(className) {
			return 1
		}
		result = append(result, explorerWindow{handle: hwnd, title: windowString(hwnd, getWindowTextProc)})
		return 1
	})
	enumWindowsProc.Call(callback, 0)
	return result
}

func windowString(hwnd uintptr, proc *syscall.LazyProc) string {
	buffer := make([]uint16, 512)
	length, _, _ := proc.Call(hwnd, uintptr(unsafe.Pointer(&buffer[0])), uintptr(len(buffer)))
	if length == 0 {
		return ""
	}
	return syscall.UTF16ToString(buffer[:length])
}

func isExplorerWindowClass(className string) bool {
	return className == "CabinetWClass" || className == "ExploreWClass"
}

func explorerTitleMatchesDirectory(title, directory string) bool {
	directoryName := filepath.Base(filepath.Clean(directory))
	if directoryName == "." || directoryName == string(filepath.Separator) || directoryName == "" {
		return false
	}
	title = strings.TrimSpace(title)
	foldedTitle := strings.ToLower(title)
	foldedDirectory := strings.ToLower(directoryName)
	if foldedTitle == foldedDirectory {
		return true
	}
	for _, separator := range []string{" -", " ", " [", " ("} {
		if strings.HasPrefix(foldedTitle, foldedDirectory+separator) {
			return true
		}
	}
	return false
}
