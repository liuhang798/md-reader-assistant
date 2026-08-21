//go:build darwin

package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestFindExtractedMacAppRequiresExactlyOneBundle(t *testing.T) {
	root := t.TempDir()
	if _, err := findExtractedMacApp(root); err == nil {
		t.Fatal("an archive without an .app bundle must be rejected")
	}

	wanted := filepath.Join(root, "轻阅 Markdown.app")
	if err := os.MkdirAll(wanted, 0o755); err != nil {
		t.Fatal(err)
	}
	got, err := findExtractedMacApp(root)
	if err != nil {
		t.Fatal(err)
	}
	if got != wanted {
		t.Fatalf("findExtractedMacApp() = %q, want %q", got, wanted)
	}

	if err := os.MkdirAll(filepath.Join(root, "Other.app"), 0o755); err != nil {
		t.Fatal(err)
	}
	if _, err := findExtractedMacApp(root); err == nil {
		t.Fatal("an archive with multiple .app bundles must be rejected")
	}
}

func TestShellQuoteProtectsMacUpdatePaths(t *testing.T) {
	quoted := shellQuote("/Applications/轻阅 Markdown's copy.app")
	if !strings.HasPrefix(quoted, "'") || !strings.HasSuffix(quoted, "'") {
		t.Fatalf("shellQuote() did not wrap the path: %q", quoted)
	}
	if !strings.Contains(quoted, "'\\''") {
		t.Fatalf("shellQuote() did not escape a single quote: %q", quoted)
	}
}
