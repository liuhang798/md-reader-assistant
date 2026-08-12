package main

import (
	"bytes"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/wailsapp/wails/v2/pkg/menu/keys"
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

func TestMacNewDocumentsNeverUseTheReplaceableApplicationBundle(t *testing.T) {
	executable := filepath.Join(string(filepath.Separator), "Applications", "MD阅读助手.app", "Contents", "MacOS", "MDReaderAssistant")
	home := filepath.Join(string(filepath.Separator), "Users", "reader")
	config := filepath.Join(home, "Library", "Application Support")

	directories := newDocumentDirectories("darwin", executable, home, config)
	want := []string{
		filepath.Join(home, "Documents", appNameEN),
		filepath.Join(config, appNameEN, "Documents"),
	}
	if !reflect.DeepEqual(directories, want) {
		t.Fatalf("macOS document directories = %#v, want %#v", directories, want)
	}
	for _, directory := range directories {
		if strings.Contains(filepath.ToSlash(directory), ".app/Contents/") {
			t.Fatalf("macOS user document would be stored inside the application bundle: %q", directory)
		}
	}
}

func TestOtherPlatformsRetainPortableExecutableDirectoryPreference(t *testing.T) {
	executable := filepath.Join(string(filepath.Separator), "opt", "md-reader", "MDReaderAssistant")
	home := filepath.Join(string(filepath.Separator), "Users", "reader")
	config := filepath.Join(home, ".config")

	for _, platform := range []string{"windows", "linux"} {
		directories := newDocumentDirectories(platform, executable, home, config)
		if len(directories) != 3 || directories[0] != filepath.Dir(executable) {
			t.Fatalf("%s portable directory preference changed: %#v", platform, directories)
		}
	}
}

func TestRecoveredMacDraftReferencesMoveToTheSafeDocumentsDirectory(t *testing.T) {
	app := testApp(t)
	home := t.TempDir()
	legacyPath := filepath.Join(string(filepath.Separator), "Applications", "MD阅读助手.app", "Contents", "MacOS", "新建文档-20260808-211433.md")
	recoveredPath := filepath.Join(home, "Documents", appNameEN, filepath.Base(legacyPath))
	if err := os.MkdirAll(filepath.Dir(recoveredPath), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(recoveredPath, []byte("recovered"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := app.updatePreferences(func(prefs *Preferences) {
		prefs.RecentFiles = []string{legacyPath}
		prefs.DraftFiles = []string{legacyPath}
		prefs.LastFile = legacyPath
	}); err != nil {
		t.Fatal(err)
	}
	prefs, err := app.readPreferences()
	if err != nil {
		t.Fatal(err)
	}
	prefs = app.migrateLegacyBundledDraftReferences("darwin", home, prefs)
	if !reflect.DeepEqual(prefs.RecentFiles, []string{recoveredPath}) {
		t.Fatalf("recent references were not migrated: %#v", prefs.RecentFiles)
	}
	if !reflect.DeepEqual(prefs.DraftFiles, []string{recoveredPath}) {
		t.Fatalf("draft references were not migrated: %#v", prefs.DraftFiles)
	}
	if prefs.LastFile != recoveredPath {
		t.Fatalf("last file = %q, want %q", prefs.LastFile, recoveredPath)
	}

	unchanged := app.migrateLegacyBundledDraftReferences("windows", home, prefs)
	if !reflect.DeepEqual(unchanged, prefs) {
		t.Fatal("legacy macOS migration affected another platform")
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

func TestReadingExistingRecentFileKeepsItsPosition(t *testing.T) {
	app := testApp(t)
	dir := t.TempDir()
	firstPath := filepath.Join(dir, "first.md")
	secondPath := filepath.Join(dir, "second.md")
	for _, filePath := range []string{firstPath, secondPath} {
		if err := os.WriteFile(filePath, []byte("# Document"), 0o644); err != nil {
			t.Fatal(err)
		}
		if _, err := app.ReadFile(filePath); err != nil {
			t.Fatal(err)
		}
	}

	if _, err := app.ReadFile(firstPath); err != nil {
		t.Fatal(err)
	}
	prefs, err := app.GetPreferences()
	if err != nil {
		t.Fatal(err)
	}
	want := []string{secondPath, firstPath}
	if len(prefs.RecentFiles) != len(want) {
		t.Fatalf("recent file count = %d, want %d: %#v", len(prefs.RecentFiles), len(want), prefs.RecentFiles)
	}
	for index := range want {
		if prefs.RecentFiles[index] != want[index] {
			t.Fatalf("recent files reordered: got %#v, want %#v", prefs.RecentFiles, want)
		}
	}
}

func TestGetPreferencesMarksMissingRecentFilesWithoutRemovingThem(t *testing.T) {
	app := testApp(t)
	dir := t.TempDir()
	existingPath := filepath.Join(dir, "existing.md")
	missingPath := filepath.Join(dir, "deleted.md")
	if err := os.WriteFile(existingPath, []byte("# Existing"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := app.rememberFile(existingPath); err != nil {
		t.Fatal(err)
	}
	if err := app.rememberFile(missingPath); err != nil {
		t.Fatal(err)
	}

	prefs, err := app.GetPreferences()
	if err != nil {
		t.Fatal(err)
	}
	wantFiles := []string{missingPath, existingPath}
	if !reflect.DeepEqual(prefs.RecentFiles, wantFiles) {
		t.Fatalf("missing recent file was removed or reordered: got %#v, want %#v", prefs.RecentFiles, wantFiles)
	}
	wantStatuses := []RecentFileStatus{
		{Path: missingPath, Exists: false},
		{Path: existingPath, Exists: true},
	}
	if !reflect.DeepEqual(prefs.RecentFileStatuses, wantStatuses) {
		t.Fatalf("unexpected recent file statuses: got %#v, want %#v", prefs.RecentFileStatuses, wantStatuses)
	}

	data, err := os.ReadFile(app.preferencePath())
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(data, []byte("recentFileStatuses")) {
		t.Fatalf("derived existence statuses were persisted: %s", data)
	}
}

func TestFavoritesPersistAndRemainIndependentFromRecentFiles(t *testing.T) {
	app := testApp(t)
	dir := t.TempDir()
	filePath := filepath.Join(dir, "favorite.md")
	if err := os.WriteFile(filePath, []byte("# Favorite"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := app.ReadFile(filePath); err != nil {
		t.Fatal(err)
	}

	prefs, err := app.AddFavorite(filePath)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(prefs.FavoriteFiles, []string{filePath}) {
		t.Fatalf("favorite was not added: %#v", prefs.FavoriteFiles)
	}
	if _, err := app.AddFavorite(strings.ToUpper(filePath)); err != nil {
		t.Fatal(err)
	}

	// A new App instance proves the record was written to disk rather than
	// being held only in memory.
	restarted := &App{language: "zh-CN", preferencesOverride: app.preferencesOverride}
	prefs, err = restarted.GetPreferences()
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(prefs.FavoriteFiles, []string{filePath}) {
		t.Fatalf("favorite was not persisted or was duplicated: %#v", prefs.FavoriteFiles)
	}
	if !reflect.DeepEqual(prefs.FavoriteFileStatuses, []RecentFileStatus{{Path: filePath, Exists: true}}) {
		t.Fatalf("unexpected favorite status: %#v", prefs.FavoriteFileStatuses)
	}

	if _, err := restarted.RemoveRecent(filePath); err != nil {
		t.Fatal(err)
	}
	prefs, err = restarted.GetPreferences()
	if err != nil {
		t.Fatal(err)
	}
	if len(prefs.RecentFiles) != 0 || !reflect.DeepEqual(prefs.FavoriteFiles, []string{filePath}) {
		t.Fatalf("removing Recent changed Favorites: recent=%#v favorites=%#v", prefs.RecentFiles, prefs.FavoriteFiles)
	}

	if _, err := restarted.RemoveFavorite(filePath); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filePath); err != nil {
		t.Fatalf("removing a favorite deleted the original file: %v", err)
	}
}

func TestFavoriteStatusesKeepMissingFilesAvailableForRemoval(t *testing.T) {
	app := testApp(t)
	missingPath := filepath.Join(t.TempDir(), "moved.md")
	if _, err := app.AddFavorite(missingPath); err != nil {
		t.Fatal(err)
	}
	prefs, err := app.GetPreferences()
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(prefs.FavoriteFiles, []string{missingPath}) {
		t.Fatalf("missing favorite was discarded: %#v", prefs.FavoriteFiles)
	}
	if !reflect.DeepEqual(prefs.FavoriteFileStatuses, []RecentFileStatus{{Path: missingPath, Exists: false}}) {
		t.Fatalf("missing favorite status = %#v", prefs.FavoriteFileStatuses)
	}
	data, err := os.ReadFile(app.preferencePath())
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(data, []byte("favoriteFileStatuses")) {
		t.Fatalf("derived favorite statuses were persisted: %s", data)
	}

	prefs, err = app.RemoveFavorite(missingPath)
	if err != nil {
		t.Fatal(err)
	}
	if len(prefs.FavoriteFiles) != 0 {
		t.Fatalf("missing favorite could not be removed: %#v", prefs.FavoriteFiles)
	}
}

func TestReplacingFavoritedDraftMigratesFavoriteToSavedDocument(t *testing.T) {
	app := testApp(t)
	root := t.TempDir()
	draftPath := filepath.Join(root, "New document-20260810-120000.md")
	savedPath := filepath.Join(root, "notes.md")
	if err := os.WriteFile(draftPath, []byte("draft"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(savedPath, []byte("saved"), 0o644); err != nil {
		t.Fatal(err)
	}
	app.markDraft(draftPath)
	if _, err := app.AddFavorite(draftPath); err != nil {
		t.Fatal(err)
	}

	if replacedPath, err := app.replaceDraft(draftPath, savedPath); err != nil || replacedPath != draftPath {
		t.Fatalf("replaceDraft() = %q, %v; want %q, nil", replacedPath, err, draftPath)
	}
	prefs, err := app.GetPreferences()
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(prefs.FavoriteFiles, []string{savedPath}) {
		t.Fatalf("draft favorite was not migrated: %#v", prefs.FavoriteFiles)
	}
}

func TestFileOpenBeforeFrontendReadyBecomesInitialDocument(t *testing.T) {
	app := testApp(t)
	filePath := filepath.Join(t.TempDir(), "opened-from-finder.md")
	if err := os.WriteFile(filePath, []byte("# Opened from Finder"), 0o644); err != nil {
		t.Fatal(err)
	}

	app.onFileOpen(filePath)
	doc, err := app.GetInitialFile()
	if err != nil {
		t.Fatal(err)
	}
	if doc == nil || doc.Path != filePath || doc.Content != "# Opened from Finder" {
		t.Fatalf("queued macOS file was not opened: %#v", doc)
	}

	doc, err = app.GetInitialFile()
	if err != nil {
		t.Fatal(err)
	}
	if doc != nil {
		t.Fatalf("initial document should only be consumed once: %#v", doc)
	}
}

func TestHideWindowOnCloseOnlyOnMacOS(t *testing.T) {
	if !hideWindowOnClose("darwin") {
		t.Fatal("macOS close button should hide the window")
	}
	for _, platform := range []string{"windows", "linux"} {
		if hideWindowOnClose(platform) {
			t.Fatalf("%s close button must keep the existing quit behaviour", platform)
		}
	}
}

func TestMacApplicationMenuProvidesConventionalCloseAndQuitShortcuts(t *testing.T) {
	applicationMenu := buildApplicationMenu("darwin")
	if applicationMenu == nil || len(applicationMenu.Items) != 3 {
		t.Fatalf("unexpected macOS application menu: %#v", applicationMenu)
	}
	if applicationMenu.Items[0].Role == 0 {
		t.Fatal("the native app menu containing Command+Q must remain present")
	}
	fileMenu := applicationMenu.Items[1]
	if fileMenu.Label != "File" || fileMenu.SubMenu == nil || len(fileMenu.SubMenu.Items) != 1 {
		t.Fatalf("unexpected File menu: %#v", fileMenu)
	}
	closeItem := fileMenu.SubMenu.Items[0]
	if closeItem.Label != "Close Window" || closeItem.Accelerator == nil || closeItem.Accelerator.Key != "w" {
		t.Fatalf("unexpected close-window item: %#v", closeItem)
	}
	if len(closeItem.Accelerator.Modifiers) != 1 || closeItem.Accelerator.Modifiers[0] != keys.CmdOrCtrlKey {
		t.Fatalf("close-window shortcut is not Command+W: %#v", closeItem.Accelerator)
	}
	if buildApplicationMenu("windows") != nil || buildApplicationMenu("linux") != nil {
		t.Fatal("the native macOS application menu must not affect other platforms")
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
	if err := app.rememberExplorerRoot(listing.Root); err != nil {
		t.Fatal(err)
	}
	restoredPreferences, err := app.GetPreferences()
	if err != nil {
		t.Fatal(err)
	}
	if restoredPreferences.ExplorerRoot != listing.Root {
		t.Fatalf("explorer root was not persisted: got %q, want %q", restoredPreferences.ExplorerRoot, listing.Root)
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

func TestWindowsInstallerUsesItsLanguageAsTheInitialAppLanguage(t *testing.T) {
	data, err := os.ReadFile(filepath.Join("build", "windows", "installer", "project.nsi"))
	if err != nil {
		t.Fatal(err)
	}
	installer := string(data)
	for _, required := range []string{
		`Delete "$APPDATA\${INFO_PRODUCTNAME}\first-run-language.flag"`,
		`IfFileExists "$APPDATA\${INFO_PRODUCTNAME}\preferences.json" installerLanguageDone`,
		`StrCmp $LANGUAGE ${LANG_ENGLISH} installerLanguageEnglish installerLanguageChinese`,
		`$\"language$\":$\"en$\"`,
		`$\"language$\":$\"zh-CN$\"`,
	} {
		if !strings.Contains(installer, required) {
			t.Errorf("Windows installer is missing initial-language rule %q", required)
		}
	}
	if strings.Contains(installer, `FileOpen $0 "$APPDATA\${INFO_PRODUCTNAME}\first-run-language.flag"`) {
		t.Fatal("Windows installer must not create a marker that asks for language again in the application")
	}
}

func TestWindowsInstallerUsesReinstallSafeShortcutIcons(t *testing.T) {
	data, err := os.ReadFile(filepath.Join("build", "windows", "installer", "project.nsi"))
	if err != nil {
		t.Fatal(err)
	}
	installer := string(data)

	if strings.Contains(installer, `File "/oname=MDReaderAssistant-${INFO_PRODUCTVERSION}.ico"`) {
		t.Fatal("Windows installer must not overwrite a standalone shortcut icon that Explorer may still have locked")
	}
	for _, required := range []string{
		`CreateShortcut "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}" "" "$INSTDIR\${PRODUCT_EXECUTABLE}" 0`,
		`CreateShortCut "$DESKTOP\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}" "" "$INSTDIR\${PRODUCT_EXECUTABLE}" 0`,
		`Delete /REBOOTOK "$INSTDIR\MDReaderAssistant-*.ico"`,
	} {
		if !strings.Contains(installer, required) {
			t.Errorf("Windows installer is missing reinstall-safe shortcut rule %q", required)
		}
	}
}

func TestWindowsInstallerUsesReinstallSafeFileAssociationIcons(t *testing.T) {
	data, err := os.ReadFile(filepath.Join("build", "windows", "installer", "project.nsi"))
	if err != nil {
		t.Fatal(err)
	}
	installer := string(data)

	if strings.Contains(installer, `!insertmacro wails.associateFiles`) {
		t.Fatal("Windows installer must not use Wails file associations that overwrite a standalone icon")
	}
	for _, required := range []string{
		`!macro AssociateMarkdownFiles`,
		`!insertmacro APP_ASSOCIATE "md" "Markdown Document" "Markdown 文档" "$INSTDIR\${PRODUCT_EXECUTABLE},0"`,
		`!insertmacro APP_ASSOCIATE "txt" "Text Document" "文本文件" "$INSTDIR\${PRODUCT_EXECUTABLE},0"`,
		`!insertmacro AssociateMarkdownFiles`,
		`Delete /REBOOTOK "$INSTDIR\mdFileIcon.ico"`,
	} {
		if !strings.Contains(installer, required) {
			t.Errorf("Windows installer is missing reinstall-safe file-association rule %q", required)
		}
	}
}

func TestWindowsInstallerOffersToCloseALockedRunningApplication(t *testing.T) {
	data, err := os.ReadFile(filepath.Join("build", "windows", "installer", "project.nsi"))
	if err != nil {
		t.Fatal(err)
	}
	installer := string(data)

	for _, required := range []string{
		`LangString CloseRunningAppPrompt ${LANG_ENGLISH}`,
		`LangString CloseRunningAppPrompt ${LANG_SIMPCHINESE}`,
		`Function EnsureApplicationClosed`,
		`Call EnsureApplicationClosed`,
		`MessageBox MB_YESNO|MB_ICONEXCLAMATION "$(CloseRunningAppPrompt)"`,
		`nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /T /IM "${PRODUCT_EXECUTABLE}"'`,
	} {
		if !strings.Contains(installer, required) {
			t.Errorf("Windows installer is missing running-application handling %q", required)
		}
	}

	closeCheck := strings.Index(installer, `Call EnsureApplicationClosed`)
	fileWrite := strings.Index(installer, `!insertmacro wails.files`)
	if closeCheck < 0 || fileWrite < 0 || closeCheck > fileWrite {
		t.Fatal("Windows installer must handle the running application before overwriting executable files")
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

func TestPlainTextFilesAreSupportedEverywhere(t *testing.T) {
	if !markdownExtensions[".txt"] {
		t.Fatal("markdownExtensions must include .txt so folders, command-line args and drag-in accept plain text files")
	}
	var wailsConfig struct {
		Info struct {
			FileAssociations []struct {
				Ext         string `json:"ext"`
				Name        string `json:"name"`
				Description string `json:"description"`
			} `json:"fileAssociations"`
		} `json:"info"`
	}
	data, err := os.ReadFile("wails.json")
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(data, &wailsConfig); err != nil {
		t.Fatal(err)
	}
	foundTXT := false
	for _, association := range wailsConfig.Info.FileAssociations {
		if association.Ext == "txt" {
			foundTXT = true
			if association.Name != "Text Document" || association.Description == "" {
				t.Fatalf("txt association metadata is incomplete: %+v", association)
			}
		}
	}
	if !foundTXT {
		t.Fatal("wails.json fileAssociations must include a .txt entry so the installer registers plain text files")
	}
}

func TestApplicationIconAssetsUseTransparentBrightGreenBrand(t *testing.T) {
	for _, path := range []string{
		filepath.Join("build", "appicon.png"),
		filepath.Join("frontend", "src", "assets", "images", "app-logo.png"),
	} {
		file, err := os.Open(path)
		if err != nil {
			t.Fatal(err)
		}
		icon, err := png.Decode(file)
		file.Close()
		if err != nil {
			t.Fatalf("decode %s: %v", path, err)
		}
		assertTransparentBrightGreenIcon(t, path, icon)
	}

	windowsIcon, err := os.ReadFile(filepath.Join("build", "windows", "icon.ico"))
	if err != nil {
		t.Fatal(err)
	}
	rootIcon, err := os.ReadFile(filepath.Join("build", "appicon.ico"))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(rootIcon, windowsIcon) {
		t.Fatal("build/appicon.ico and build/windows/icon.ico must be identical")
	}

	sizes, largestPNG, err := icoSizesAndLargestPNG(rootIcon)
	if err != nil {
		t.Fatal(err)
	}
	wantSizes := []int{16, 24, 32, 48, 64, 96, 128, 192, 256}
	if !reflect.DeepEqual(sizes, wantSizes) {
		t.Fatalf("Windows icon sizes = %v, want %v", sizes, wantSizes)
	}
	icon, err := png.Decode(bytes.NewReader(largestPNG))
	if err != nil {
		t.Fatalf("decode largest Windows icon: %v", err)
	}
	assertTransparentBrightGreenIcon(t, "build/windows/icon.ico", icon)
}

func assertTransparentBrightGreenIcon(t *testing.T, name string, icon image.Image) {
	t.Helper()
	bounds := icon.Bounds()
	for _, point := range []image.Point{
		bounds.Min,
		{X: bounds.Max.X - 1, Y: bounds.Min.Y},
		{X: bounds.Min.X, Y: bounds.Max.Y - 1},
		{X: bounds.Max.X - 1, Y: bounds.Max.Y - 1},
	} {
		_, _, _, alpha := icon.At(point.X, point.Y).RGBA()
		if alpha != 0 {
			t.Fatalf("%s corner %v alpha = %d, want 0", name, point, alpha)
		}
	}

	sampleX := bounds.Min.X + bounds.Dx()/2
	sampleY := bounds.Min.Y + bounds.Dy()/8
	red16, green16, blue16, alpha16 := icon.At(sampleX, sampleY).RGBA()
	red, green, blue, alpha := uint8(red16>>8), uint8(green16>>8), uint8(blue16>>8), uint8(alpha16>>8)
	if alpha < 250 || green < 150 || int(green)-int(red) < 60 || int(green)-int(blue) < 40 {
		t.Fatalf("%s theme sample = rgba(%d,%d,%d,%d), want opaque bright green", name, red, green, blue, alpha)
	}
}

func icoSizesAndLargestPNG(data []byte) ([]int, []byte, error) {
	if len(data) < 6 || binary.LittleEndian.Uint16(data[0:2]) != 0 || binary.LittleEndian.Uint16(data[2:4]) != 1 {
		return nil, nil, errors.New("invalid ICO header")
	}
	count := int(binary.LittleEndian.Uint16(data[4:6]))
	if len(data) < 6+count*16 {
		return nil, nil, errors.New("truncated ICO directory")
	}
	sizes := make([]int, 0, count)
	var largest []byte
	for index := 0; index < count; index++ {
		offset := 6 + index*16
		width := int(data[offset])
		if width == 0 {
			width = 256
		}
		sizes = append(sizes, width)
		length := int(binary.LittleEndian.Uint32(data[offset+8 : offset+12]))
		imageOffset := int(binary.LittleEndian.Uint32(data[offset+12 : offset+16]))
		if imageOffset < 0 || length < 0 || imageOffset+length > len(data) {
			return nil, nil, errors.New("invalid ICO image entry")
		}
		if width == 256 {
			largest = data[imageOffset : imageOffset+length]
		}
	}
	if len(largest) == 0 {
		return nil, nil, errors.New("ICO has no 256px image")
	}
	return sizes, largest, nil
}
