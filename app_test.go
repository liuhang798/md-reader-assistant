package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func testApp(t *testing.T) *App {
	t.Helper()
	return &App{
		language:            "zh-CN",
		preferencesOverride: filepath.Join(t.TempDir(), "preferences.json"),
	}
}

func TestReadSaveAndRecent(t *testing.T) {
	app := testApp(t)
	dir := t.TempDir()
	filePath := filepath.Join(dir, "sample.md")
	if err := os.WriteFile(filePath, []byte("# First"), 0o644); err != nil {
		t.Fatal(err)
	}

	doc, err := app.ReadFile(filePath)
	if err != nil {
		t.Fatal(err)
	}
	if doc.Content != "# First" || doc.Name != "sample.md" {
		t.Fatalf("unexpected document: %#v", doc)
	}

	app.SetDirty(true)
	saved, err := app.SaveFile(filePath, "# Updated")
	if err != nil {
		t.Fatal(err)
	}
	if saved.Content != "# Updated" {
		t.Fatalf("save returned %q", saved.Content)
	}
	prefs, err := app.GetPreferences()
	if err != nil {
		t.Fatal(err)
	}
	if len(prefs.RecentFiles) != 1 || prefs.RecentFiles[0] != filePath {
		t.Fatalf("recent files not updated: %#v", prefs.RecentFiles)
	}
	app.mu.RLock()
	dirty := app.dirty
	app.mu.RUnlock()
	if dirty {
		t.Fatal("save did not clear dirty state")
	}
}

func TestFolderListingAndRecentRemoval(t *testing.T) {
	app := testApp(t)
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "docs", "nested"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(root, "node_modules"), 0o755); err != nil {
		t.Fatal(err)
	}
	for path, content := range map[string]string{
		filepath.Join(root, "README.md"):                  "# Root",
		filepath.Join(root, "docs", "guide.markdown"):     "# Guide",
		filepath.Join(root, "docs", "nested", "note.txt"): "note",
		filepath.Join(root, "node_modules", "skip.md"):    "skip",
		filepath.Join(root, "ignore.png"):                 "png",
	} {
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	listing, err := app.ListFolder(root)
	if err != nil {
		t.Fatal(err)
	}
	if len(listing.Files) != 3 {
		t.Fatalf("expected 3 Markdown/text files, got %d: %#v", len(listing.Files), listing.Files)
	}
	if _, err := app.ReadFile(filepath.Join(root, "README.md")); err != nil {
		t.Fatal(err)
	}
	prefs, err := app.RemoveRecent(filepath.Join(root, "README.md"))
	if err != nil {
		t.Fatal(err)
	}
	if len(prefs.RecentFiles) != 0 {
		t.Fatalf("recent record was not removed: %#v", prefs.RecentFiles)
	}
}

func TestLanguagePersistenceAndArgumentDetection(t *testing.T) {
	app := testApp(t)
	language, err := app.SetLanguage("en")
	if err != nil {
		t.Fatal(err)
	}
	if language != "en" {
		t.Fatalf("expected en, got %s", language)
	}
	prefs, err := app.GetPreferences()
	if err != nil {
		t.Fatal(err)
	}
	if prefs.Language != "en" {
		t.Fatalf("language was not persisted: %#v", prefs)
	}

	expected := filepath.Join("C:\\docs", "guide.md")
	if actual := findMarkdownArgument([]string{"app.exe", expected}); actual != expected {
		t.Fatalf("argument detection returned %q", actual)
	}
	if actual := findMarkdownArgument([]string{"app.exe", "image.png"}); actual != "" {
		t.Fatalf("unexpected argument detection: %q", actual)
	}
}

func TestCompareVersions(t *testing.T) {
	tests := []struct {
		left, right string
		want        int
	}{
		{"v2.2.0", "2.1.0", 1},
		{"2.1.0", "2.1.0", 0},
		{"2.0.9", "2.1.0", -1},
		{"v2.1.10", "2.1.9", 1},
		{"2.1.0-beta.1", "2.1.0", 0},
		{"2.1", "2.1.0", 0},
	}
	for _, test := range tests {
		if got := compareVersions(test.left, test.right); got != test.want {
			t.Errorf("compareVersions(%q, %q) = %d, want %d", test.left, test.right, got, test.want)
		}
	}
}

func TestReleaseVersionConsistency(t *testing.T) {
	var wailsConfig struct {
		Info struct {
			ProductVersion string `json:"productVersion"`
		} `json:"info"`
	}
	data, err := os.ReadFile("wails.json")
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(data, &wailsConfig); err != nil {
		t.Fatal(err)
	}
	if wailsConfig.Info.ProductVersion != appVersion {
		t.Fatalf("wails.json version %q does not match app version %q", wailsConfig.Info.ProductVersion, appVersion)
	}

	var frontendPackage struct {
		Version string `json:"version"`
	}
	data, err = os.ReadFile(filepath.Join("frontend", "package.json"))
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(data, &frontendPackage); err != nil {
		t.Fatal(err)
	}
	if frontendPackage.Version != appVersion {
		t.Fatalf("frontend version %q does not match app version %q", frontendPackage.Version, appVersion)
	}

	visibleVersionFiles := []string{
		filepath.Join("frontend", "index.html"),
		filepath.Join("frontend", "src", "main.js"),
		filepath.Join("frontend", "src", "renderer.js"),
		filepath.Join("build", "windows", "installer", "project.nsi"),
	}
	for _, path := range visibleVersionFiles {
		data, err = os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(string(data), appVersion) {
			t.Errorf("%s does not contain release version %s", path, appVersion)
		}
	}
}
