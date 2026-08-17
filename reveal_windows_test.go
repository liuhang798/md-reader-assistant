//go:build windows

package main

import "testing"

func TestExplorerWindowClassRecognition(t *testing.T) {
	for _, className := range []string{"CabinetWClass", "ExploreWClass"} {
		if !isExplorerWindowClass(className) {
			t.Fatalf("expected %q to be recognized as an Explorer window", className)
		}
	}
	for _, className := range []string{"", "Progman", "ApplicationFrameWindow"} {
		if isExplorerWindowClass(className) {
			t.Fatalf("did not expect %q to be recognized as an Explorer window", className)
		}
	}
}

func TestExplorerTitleMatchesDirectory(t *testing.T) {
	tests := []struct {
		title     string
		directory string
		want      bool
	}{
		{title: "docs", directory: `D:\work\docs`, want: true},
		{title: "docs - 文件资源管理器", directory: `D:\work\docs`, want: true},
		{title: "docs [develop-project]", directory: `D:\work\docs`, want: true},
		{title: "DOCS", directory: `D:\work\docs`, want: true},
		{title: "images", directory: `D:\work\docs`, want: false},
	}
	for _, test := range tests {
		if got := explorerTitleMatchesDirectory(test.title, test.directory); got != test.want {
			t.Fatalf("explorerTitleMatchesDirectory(%q, %q) = %v, want %v", test.title, test.directory, got, test.want)
		}
	}
}
