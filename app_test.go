package main

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestCreateNewMarkdownFileUsesFirstWritableDirectory(t *testing.T) {
	first := filepath.Join(t.TempDir(), "install")
	fallback := filepath.Join(t.TempDir(), "documents")
	now := time.Date(2026, 7, 21, 12, 34, 56, 0, time.Local)
	filePath, err := createNewMarkdownFile([]string{first, fallback}, "New document", now)
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Dir(filePath) != first {
		t.Fatalf("created document in %q, want %q", filepath.Dir(filePath), first)
	}
	if filepath.Base(filePath) != "New document-20260721-123456.md" {
		t.Fatalf("unexpected generated name: %q", filepath.Base(filePath))
	}

	secondPath, err := createNewMarkdownFile([]string{first}, "New document", now)
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Base(secondPath) != "New document-20260721-123456-2.md" {
		t.Fatalf("collision did not get a unique suffix: %q", filepath.Base(secondPath))
	}
}

func TestReplaceDraftRemovesTemporaryFileAndRecentRecord(t *testing.T) {
	app := testApp(t)
	root := t.TempDir()
	draftPath := filepath.Join(root, "New document-20260721-123456.md")
	savedPath := filepath.Join(root, "final.md")
	if err := os.WriteFile(draftPath, []byte("draft"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(savedPath, []byte("final"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := app.rememberFile(draftPath); err != nil {
		t.Fatal(err)
	}
	if err := app.rememberFile(savedPath); err != nil {
		t.Fatal(err)
	}
	app.markDraft(draftPath)
	prefsBeforeRestart, err := app.GetPreferences()
	if err != nil {
		t.Fatal(err)
	}
	if len(prefsBeforeRestart.DraftFiles) != 1 || prefsBeforeRestart.DraftFiles[0] != draftPath {
		t.Fatalf("draft was not persisted: %#v", prefsBeforeRestart.DraftFiles)
	}

	// Simulate closing and reopening the application before Save As.
	app = &App{language: "zh-CN", preferencesOverride: app.preferencesOverride}
	app.restoreDrafts(prefsBeforeRestart.DraftFiles)

	replacedPath, err := app.replaceDraft(draftPath, savedPath)
	if err != nil {
		t.Fatal(err)
	}
	if replacedPath != draftPath {
		t.Fatalf("replaced path = %q, want %q", replacedPath, draftPath)
	}
	if _, err := os.Stat(draftPath); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("temporary draft was not removed: %v", err)
	}
	prefs, err := app.GetPreferences()
	if err != nil {
		t.Fatal(err)
	}
	if len(prefs.RecentFiles) != 1 || prefs.RecentFiles[0] != savedPath {
		t.Fatalf("unexpected recent records after replacement: %#v", prefs.RecentFiles)
	}
	if len(prefs.DraftFiles) != 0 {
		t.Fatalf("draft record was not cleared: %#v", prefs.DraftFiles)
	}

	regularPath := filepath.Join(root, "existing.md")
	if err := os.WriteFile(regularPath, []byte("keep"), 0o644); err != nil {
		t.Fatal(err)
	}
	if replaced, err := app.replaceDraft(regularPath, savedPath); err != nil || replaced != "" {
		t.Fatalf("ordinary document was treated as a draft: replaced=%q err=%v", replaced, err)
	}
	if _, err := os.Stat(regularPath); err != nil {
		t.Fatalf("ordinary document was removed: %v", err)
	}
}

func TestReadImageDataSupportsRelativeLocalImages(t *testing.T) {
	root := t.TempDir()
	pngBytes, err := base64.StdEncoding.DecodeString("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")
	if err != nil {
		t.Fatal(err)
	}
	imagePath := filepath.Join(root, "preview image.png")
	if err := os.WriteFile(imagePath, pngBytes, 0o644); err != nil {
		t.Fatal(err)
	}
	dataURL, err := testApp(t).ReadImageData("preview%20image.png", root)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(dataURL, "data:image/png;base64,") {
		t.Fatalf("unexpected image data URL prefix: %.40q", dataURL)
	}
}

func testApp(t *testing.T) *App {
	t.Helper()
	return &App{
		language:            "zh-CN",
		preferencesOverride: filepath.Join(t.TempDir(), "preferences.json"),
	}
}

func TestSnoozeUpdatesSuppressesAutomaticChecks(t *testing.T) {
	app := testApp(t)
	if err := app.SnoozeUpdates(30); err != nil {
		t.Fatal(err)
	}
	prefs, err := app.GetPreferences()
	if err != nil {
		t.Fatal(err)
	}
	until, err := time.Parse(time.RFC3339, prefs.SuppressUpdateUntil)
	if err != nil {
		t.Fatalf("invalid suppression timestamp %q: %v", prefs.SuppressUpdateUntil, err)
	}
	if until.Before(time.Now().Add(29 * 24 * time.Hour)) {
		t.Fatalf("suppression period is too short: %s", until)
	}
	info, err := app.CheckForUpdates(false)
	if err != nil {
		t.Fatal(err)
	}
	if !info.Suppressed || info.Checked {
		t.Fatalf("automatic update check was not suppressed: %#v", info)
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
	markerPath := app.languageSelectionMarkerPath()
	if err := os.MkdirAll(filepath.Dir(markerPath), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(markerPath, []byte("new-install"), 0o600); err != nil {
		t.Fatal(err)
	}
	if !app.NeedsLanguageSelection() {
		t.Fatal("expected a new installation to require language selection")
	}
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
	if app.NeedsLanguageSelection() {
		t.Fatal("language selection marker was not cleared")
	}

	legacyRoot := t.TempDir()
	legacyPreferences := filepath.Join(legacyRoot, "preferences.json")
	legacyMarker := filepath.Join(legacyRoot, "first-run-language.flag")
	if needsLanguageSelection("windows", legacyPreferences, legacyMarker) {
		t.Fatal("an installation without the new marker must be treated as an upgrade")
	}
	if !needsLanguageSelection("darwin", legacyPreferences, legacyMarker) {
		t.Fatal("a new macOS/Linux installation without preferences should ask for a language")
	}
	if err := os.WriteFile(legacyPreferences, []byte(`{"language":"zh-CN"}`), 0o600); err != nil {
		t.Fatal(err)
	}
	if needsLanguageSelection("linux", legacyPreferences, legacyMarker) {
		t.Fatal("an existing macOS/Linux preference file must suppress the upgrade prompt")
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
