//go:build windows

package main

import "testing"

func TestFeedbackSystemCommandNeverShowsAConsoleWindow(t *testing.T) {
	command := feedbackSystemCommand("cmd", "/C", "ver")
	if command.SysProcAttr == nil {
		t.Fatal("expected Windows process attributes")
	}
	if !command.SysProcAttr.HideWindow {
		t.Fatal("feedback system command must hide its window")
	}
	if command.SysProcAttr.CreationFlags&createNoWindow == 0 {
		t.Fatal("feedback system command must use CREATE_NO_WINDOW")
	}
}
