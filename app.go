package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"mime"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	goruntime "runtime"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/options"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	appNameZH  = "MD阅读助手"
	appNameEN  = "MD Reader Assistant"
	appVersion = "2.2.3"
	maxRecent  = 10
)

var markdownExtensions = map[string]bool{
	".md": true, ".markdown": true, ".mdown": true, ".mkd": true, ".txt": true,
}

type Document struct {
	Path         string `json:"path"`
	Name         string `json:"name"`
	Directory    string `json:"directory"`
	Content      string `json:"content"`
	ModifiedAt   string `json:"modifiedAt"`
	Size         int64  `json:"size"`
	ReplacedPath string `json:"replacedPath,omitempty"`
}

type FolderFile struct {
	Path         string `json:"path"`
	Name         string `json:"name"`
	RelativePath string `json:"relativePath"`
	Directory    string `json:"directory"`
}

type FolderResult struct {
	Root  string       `json:"root"`
	Name  string       `json:"name"`
	Files []FolderFile `json:"files"`
}

type Preferences struct {
	RecentFiles         []string `json:"recentFiles"`
	DraftFiles          []string `json:"draftFiles,omitempty"`
	LastFile            string   `json:"lastFile,omitempty"`
	Language            string   `json:"language"`
	LastUpdateCheck     string   `json:"lastUpdateCheck,omitempty"`
	SuppressUpdateUntil string   `json:"suppressUpdateUntil,omitempty"`
}

type App struct {
	ctx                 context.Context
	mu                  sync.RWMutex
	preferencesMu       sync.Mutex
	draftsMu            sync.Mutex
	draftFiles          map[string]bool
	dirty               bool
	language            string
	initialFile         string
	preferencesOverride string
}

func NewApp() *App {
	return &App{language: "zh-CN", initialFile: findMarkdownArgument(os.Args), draftFiles: make(map[string]bool)}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	prefs, _ := a.readPreferences()
	a.language = normaliseLanguage(prefs.Language)
	a.restoreDrafts(prefs.DraftFiles)
}

func (a *App) beforeClose(ctx context.Context) bool {
	a.mu.RLock()
	dirty := a.dirty
	a.mu.RUnlock()
	if !dirty {
		return false
	}
	return !a.confirmDiscard(ctx, true)
}

func (a *App) onSecondInstanceLaunch(data options.SecondInstanceData) {
	filePath := findMarkdownArgument(data.Args)
	if filePath != "" {
		if doc, err := a.ReadFile(filePath); err == nil {
			wailsruntime.EventsEmit(a.ctx, "file:open-from-main", doc)
		}
	}
	wailsruntime.WindowUnminimise(a.ctx)
	wailsruntime.WindowShow(a.ctx)
}

func (a *App) onFileOpen(filePath string) {
	if filePath == "" || a.ctx == nil {
		return
	}
	if doc, err := a.ReadFile(filePath); err == nil {
		wailsruntime.EventsEmit(a.ctx, "file:open-from-main", doc)
	}
}

func (a *App) preferencePath() string {
	if a.preferencesOverride != "" {
		return a.preferencesOverride
	}
	base, err := os.UserConfigDir()
	if err != nil {
		base = filepath.Dir(os.Args[0])
	}
	return filepath.Join(base, appNameZH, "preferences.json")
}

func (a *App) languageSelectionMarkerPath() string {
	return filepath.Join(filepath.Dir(a.preferencePath()), "first-run-language.flag")
}

func defaultPreferences() Preferences {
	return Preferences{RecentFiles: []string{}, DraftFiles: []string{}, Language: "zh-CN"}
}

func normaliseLanguage(language string) string {
	if language == "en" {
		return "en"
	}
	return "zh-CN"
}

func (a *App) readPreferences() (Preferences, error) {
	a.preferencesMu.Lock()
	defer a.preferencesMu.Unlock()
	return a.readPreferencesUnlocked()
}

func (a *App) readPreferencesUnlocked() (Preferences, error) {
	prefs := defaultPreferences()
	data, err := os.ReadFile(a.preferencePath())
	if errors.Is(err, os.ErrNotExist) {
		return prefs, nil
	}
	if err != nil {
		return prefs, err
	}
	if err := json.Unmarshal(data, &prefs); err != nil {
		return defaultPreferences(), nil
	}
	prefs.Language = normaliseLanguage(prefs.Language)
	if prefs.RecentFiles == nil {
		prefs.RecentFiles = []string{}
	}
	if prefs.DraftFiles == nil {
		prefs.DraftFiles = []string{}
	}
	return prefs, nil
}

func (a *App) writePreferences(prefs Preferences) error {
	a.preferencesMu.Lock()
	defer a.preferencesMu.Unlock()
	return a.writePreferencesUnlocked(prefs)
}

func (a *App) writePreferencesUnlocked(prefs Preferences) error {
	prefs.Language = normaliseLanguage(prefs.Language)
	path := a.preferencePath()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(prefs, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

func (a *App) updatePreferences(update func(*Preferences)) (Preferences, error) {
	a.preferencesMu.Lock()
	defer a.preferencesMu.Unlock()
	prefs, err := a.readPreferencesUnlocked()
	if err != nil {
		return prefs, err
	}
	update(&prefs)
	return prefs, a.writePreferencesUnlocked(prefs)
}

func (a *App) rememberFile(filePath string) error {
	cleaned := filepath.Clean(filePath)
	_, err := a.updatePreferences(func(prefs *Preferences) {
		recent := []string{cleaned}
		for _, item := range prefs.RecentFiles {
			if !strings.EqualFold(filepath.Clean(item), cleaned) {
				recent = append(recent, item)
			}
			if len(recent) >= maxRecent {
				break
			}
		}
		prefs.RecentFiles = recent
		prefs.LastFile = cleaned
	})
	return err
}

func (a *App) readDocument(filePath string, remember bool) (*Document, error) {
	absPath, err := filepath.Abs(filepath.Clean(filePath))
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(absPath)
	if err != nil {
		return nil, err
	}
	info, err := os.Stat(absPath)
	if err != nil {
		return nil, err
	}
	if remember {
		_ = a.rememberFile(absPath)
	}
	return &Document{
		Path: absPath, Name: filepath.Base(absPath), Directory: filepath.Dir(absPath),
		Content: string(data), ModifiedAt: info.ModTime().Format(time.RFC3339Nano), Size: info.Size(),
	}, nil
}

func (a *App) OpenFile() (*Document, error) {
	filePath, err := wailsruntime.OpenFileDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: a.text("openMarkdown"),
		Filters: []wailsruntime.FileFilter{
			{DisplayName: a.text("markdownDocument"), Pattern: "*.md;*.markdown;*.mdown;*.mkd"},
			{DisplayName: a.text("textFile"), Pattern: "*.txt"},
			{DisplayName: a.text("allFiles"), Pattern: "*.*"},
		},
	})
	if err != nil || filePath == "" {
		return nil, err
	}
	return a.ReadFile(filePath)
}

// NewFile creates the document silently beside the application. Installed
// copies use a per-user directory, but a Documents fallback keeps this safe
// for portable/read-only installations as well.
func (a *App) NewFile() (*Document, error) {
	directories := make([]string, 0, 3)
	if executable, err := os.Executable(); err == nil {
		directories = append(directories, filepath.Dir(executable))
	}
	if home, err := os.UserHomeDir(); err == nil {
		directories = append(directories, filepath.Join(home, "Documents", appNameEN))
	}
	if config, err := os.UserConfigDir(); err == nil {
		directories = append(directories, filepath.Join(config, appNameEN, "Documents"))
	}
	baseName := strings.TrimSuffix(a.text("newDocument"), filepath.Ext(a.text("newDocument")))
	filePath, err := createNewMarkdownFile(directories, baseName, time.Now())
	if err != nil {
		return nil, err
	}
	a.markDraft(filePath)
	return a.readDocument(filePath, true)
}

func (a *App) markDraft(filePath string) {
	filePath = filepath.Clean(filePath)
	a.draftsMu.Lock()
	if a.draftFiles == nil {
		a.draftFiles = make(map[string]bool)
	}
	a.draftFiles[draftPathKey(filePath)] = true
	a.draftsMu.Unlock()
	_, _ = a.updatePreferences(func(prefs *Preferences) {
		for _, item := range prefs.DraftFiles {
			if draftPathKey(item) == draftPathKey(filePath) {
				return
			}
		}
		prefs.DraftFiles = append(prefs.DraftFiles, filePath)
	})
}

func (a *App) restoreDrafts(draftFiles []string) {
	a.draftsMu.Lock()
	defer a.draftsMu.Unlock()
	if a.draftFiles == nil {
		a.draftFiles = make(map[string]bool)
	}
	for _, filePath := range draftFiles {
		if strings.TrimSpace(filePath) != "" {
			a.draftFiles[draftPathKey(filePath)] = true
		}
	}
}

func draftPathKey(filePath string) string {
	cleaned := filepath.Clean(filePath)
	if goruntime.GOOS == "windows" {
		return strings.ToLower(cleaned)
	}
	return cleaned
}

func (a *App) replaceDraft(originalPath, savedPath string) (string, error) {
	originalPath = filepath.Clean(originalPath)
	savedPath = filepath.Clean(savedPath)
	samePath := originalPath == savedPath
	if goruntime.GOOS == "windows" {
		samePath = strings.EqualFold(originalPath, savedPath)
	}
	if originalPath == "." || savedPath == "." || samePath {
		return "", nil
	}

	a.draftsMu.Lock()
	key := draftPathKey(originalPath)
	isDraft := a.draftFiles[key]
	a.draftsMu.Unlock()
	if !isDraft {
		return "", nil
	}
	if err := os.Remove(originalPath); err != nil && !errors.Is(err, os.ErrNotExist) {
		return "", err
	}
	_, preferencesErr := a.updatePreferences(func(prefs *Preferences) {
		recent := make([]string, 0, len(prefs.RecentFiles))
		for _, item := range prefs.RecentFiles {
			if draftPathKey(item) != key {
				recent = append(recent, item)
			}
		}
		prefs.RecentFiles = recent
		drafts := make([]string, 0, len(prefs.DraftFiles))
		for _, item := range prefs.DraftFiles {
			if draftPathKey(item) != key {
				drafts = append(drafts, item)
			}
		}
		prefs.DraftFiles = drafts
		if draftPathKey(prefs.LastFile) == key {
			prefs.LastFile = ""
			if len(recent) > 0 {
				prefs.LastFile = recent[0]
			}
		}
	})
	a.draftsMu.Lock()
	delete(a.draftFiles, key)
	a.draftsMu.Unlock()
	return originalPath, preferencesErr
}

func createNewMarkdownFile(directories []string, baseName string, now time.Time) (string, error) {
	baseName = strings.TrimSpace(baseName)
	if baseName == "" {
		baseName = "New document"
	}
	stamp := now.Format("20060102-150405")
	var lastErr error
	seen := make(map[string]bool)
	for _, directory := range directories {
		directory = filepath.Clean(strings.TrimSpace(directory))
		key := strings.ToLower(directory)
		if directory == "." || seen[key] {
			continue
		}
		seen[key] = true
		if err := os.MkdirAll(directory, 0o755); err != nil {
			lastErr = err
			continue
		}
		for suffix := 0; suffix < 100; suffix++ {
			name := fmt.Sprintf("%s-%s.md", baseName, stamp)
			if suffix > 0 {
				name = fmt.Sprintf("%s-%s-%d.md", baseName, stamp, suffix+1)
			}
			filePath := filepath.Join(directory, name)
			file, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
			if errors.Is(err, os.ErrExist) {
				continue
			}
			if err != nil {
				lastErr = err
				break
			}
			if err := file.Close(); err != nil {
				_ = os.Remove(filePath)
				lastErr = err
				break
			}
			return filePath, nil
		}
	}
	if lastErr == nil {
		lastErr = errors.New("no writable document directory")
	}
	return "", fmt.Errorf("create Markdown document: %w", lastErr)
}

// SelectImage returns a Markdown-friendly path. When possible it is relative
// to the document, keeping the Markdown file portable.
func (a *App) SelectImage(currentFile string) (string, error) {
	imagePath, err := wailsruntime.OpenFileDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: a.text("selectImage"),
		Filters: []wailsruntime.FileFilter{
			{DisplayName: a.text("imageFile"), Pattern: "*.png;*.jpg;*.jpeg;*.gif;*.webp;*.svg;*.bmp"},
			{DisplayName: a.text("allFiles"), Pattern: "*.*"},
		},
	})
	if err != nil || imagePath == "" {
		return "", err
	}
	result := filepath.Clean(imagePath)
	if strings.TrimSpace(currentFile) != "" {
		if relative, relativeErr := filepath.Rel(filepath.Dir(filepath.Clean(currentFile)), result); relativeErr == nil {
			result = relative
		}
	}
	return filepath.ToSlash(result), nil
}

// ReadImageData reads local images for the WebView. Direct file:// access is
// blocked by WebView security rules, so previews use a data URL instead.
func (a *App) ReadImageData(imagePath, documentDirectory string) (string, error) {
	resolved, err := resolveLocalImagePath(imagePath, documentDirectory)
	if err != nil {
		return "", err
	}
	info, err := os.Stat(resolved)
	if err != nil {
		return "", err
	}
	if info.IsDir() {
		return "", errors.New("image path is a directory")
	}
	const maxImageSize = int64(25 * 1024 * 1024)
	if info.Size() > maxImageSize {
		return "", errors.New("image exceeds the 25 MB preview limit")
	}
	data, err := os.ReadFile(resolved)
	if err != nil {
		return "", err
	}
	contentType := mime.TypeByExtension(strings.ToLower(filepath.Ext(resolved)))
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	contentType = strings.Split(contentType, ";")[0]
	if !strings.HasPrefix(contentType, "image/") {
		return "", errors.New("selected file is not a supported image")
	}
	return "data:" + contentType + ";base64," + base64.StdEncoding.EncodeToString(data), nil
}

func resolveLocalImagePath(imagePath, documentDirectory string) (string, error) {
	imagePath = strings.TrimSpace(imagePath)
	if imagePath == "" {
		return "", errors.New("image path is empty")
	}
	if parsed, err := url.Parse(imagePath); err == nil && strings.EqualFold(parsed.Scheme, "file") {
		imagePath, err = url.PathUnescape(parsed.Path)
		if err != nil {
			return "", err
		}
		if goruntime.GOOS == "windows" && len(imagePath) >= 3 && imagePath[0] == '/' && imagePath[2] == ':' {
			imagePath = imagePath[1:]
		}
	} else if strings.Contains(imagePath, "://") {
		return "", errors.New("only local images can be read")
	} else if unescaped, err := url.PathUnescape(imagePath); err == nil {
		imagePath = unescaped
	}
	imagePath = filepath.FromSlash(imagePath)
	if !filepath.IsAbs(imagePath) {
		if strings.TrimSpace(documentDirectory) == "" {
			return "", errors.New("document directory is empty")
		}
		imagePath = filepath.Join(documentDirectory, imagePath)
	}
	return filepath.Abs(filepath.Clean(imagePath))
}

func (a *App) OpenFolder() (*FolderResult, error) {
	root, err := wailsruntime.OpenDirectoryDialog(a.ctx, wailsruntime.OpenDialogOptions{Title: a.text("openFolder")})
	if err != nil || root == "" {
		return nil, err
	}
	return a.ListFolder(root)
}

func (a *App) ReadFile(filePath string) (*Document, error) {
	return a.readDocument(filePath, true)
}

func (a *App) SaveFile(filePath, content string) (*Document, error) {
	if strings.TrimSpace(filePath) == "" {
		return a.SaveAs("", content)
	}
	if err := os.WriteFile(filepath.Clean(filePath), []byte(content), 0o644); err != nil {
		return nil, err
	}
	a.SetDirty(false)
	return a.readDocument(filePath, true)
}

func (a *App) SaveAs(currentPath, content string) (*Document, error) {
	defaultName := filepath.Base(currentPath)
	if defaultName == "." || defaultName == "" {
		defaultName = a.text("newDocument")
	}
	filePath, err := wailsruntime.SaveFileDialog(a.ctx, wailsruntime.SaveDialogOptions{
		Title: a.text("saveAsMarkdown"), DefaultFilename: defaultName,
		Filters: []wailsruntime.FileFilter{
			{DisplayName: a.text("markdownDocument"), Pattern: "*.md"},
			{DisplayName: a.text("textFile"), Pattern: "*.txt"},
		},
	})
	if err != nil || filePath == "" {
		return nil, err
	}
	saved, err := a.SaveFile(filePath, content)
	if err != nil {
		return nil, err
	}
	if replacedPath, _ := a.replaceDraft(currentPath, saved.Path); replacedPath != "" {
		saved.ReplacedPath = replacedPath
	}
	return saved, nil
}

func (a *App) SetDirty(dirty bool) {
	a.mu.Lock()
	a.dirty = dirty
	a.mu.Unlock()
}

func (a *App) ListFolder(root string) (*FolderResult, error) {
	absRoot, err := filepath.Abs(filepath.Clean(root))
	if err != nil {
		return nil, err
	}
	files := make([]FolderFile, 0)
	a.collectMarkdownFiles(absRoot, absRoot, 0, &files)
	return &FolderResult{Root: absRoot, Name: filepath.Base(absRoot), Files: files}, nil
}

func (a *App) collectMarkdownFiles(root, current string, depth int, result *[]FolderFile) {
	if depth > 5 || len(*result) >= 800 {
		return
	}
	entries, err := os.ReadDir(current)
	if err != nil {
		return
	}
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].IsDir() != entries[j].IsDir() {
			return entries[i].IsDir()
		}
		return strings.ToLower(entries[i].Name()) < strings.ToLower(entries[j].Name())
	})
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), ".") || entry.Name() == "node_modules" {
			continue
		}
		fullPath := filepath.Join(current, entry.Name())
		if entry.IsDir() {
			a.collectMarkdownFiles(root, fullPath, depth+1, result)
		} else if markdownExtensions[strings.ToLower(filepath.Ext(entry.Name()))] {
			relative, _ := filepath.Rel(root, fullPath)
			directory, _ := filepath.Rel(root, filepath.Dir(fullPath))
			if directory == "" {
				directory = "."
			}
			*result = append(*result, FolderFile{Path: fullPath, Name: entry.Name(), RelativePath: relative, Directory: directory})
		}
		if len(*result) >= 800 {
			break
		}
	}
}

func (a *App) GetPreferences() (Preferences, error) {
	return a.readPreferences()
}

// NeedsLanguageSelection is true only when an installer has explicitly marked
// this as a new installation. Older versions never created the marker, so an
// upgrade does not interrupt existing users with a first-run dialog.
func (a *App) NeedsLanguageSelection() bool {
	return needsLanguageSelection(goruntime.GOOS, a.preferencePath(), a.languageSelectionMarkerPath())
}

func needsLanguageSelection(platform, preferencePath, markerPath string) bool {
	if _, err := os.Stat(markerPath); err == nil {
		return true
	}
	// Windows installers create the marker only for a genuinely new install.
	// On macOS and Linux there is no equivalent install wizard, so the absence
	// of preferences is the first-launch signal. Existing users already have a
	// preference file and are therefore never interrupted after an upgrade.
	if platform == "windows" {
		return false
	}
	_, err := os.Stat(preferencePath)
	return errors.Is(err, os.ErrNotExist)
}

func (a *App) RemoveRecent(filePath string) (Preferences, error) {
	cleaned := filepath.Clean(filePath)
	return a.updatePreferences(func(prefs *Preferences) {
		filtered := make([]string, 0, len(prefs.RecentFiles))
		for _, item := range prefs.RecentFiles {
			if !strings.EqualFold(filepath.Clean(item), cleaned) {
				filtered = append(filtered, item)
			}
		}
		prefs.RecentFiles = filtered
		if strings.EqualFold(filepath.Clean(prefs.LastFile), cleaned) {
			prefs.LastFile = ""
			if len(filtered) > 0 {
				prefs.LastFile = filtered[0]
			}
		}
	})
}

func (a *App) GetInitialFile() (*Document, error) {
	if a.initialFile == "" {
		return nil, nil
	}
	return a.ReadFile(a.initialFile)
}

func (a *App) GetStartupMode() string {
	for _, arg := range os.Args {
		if arg == "--edit" {
			return "edit"
		}
	}
	return "preview"
}

func (a *App) Dirname(filePath string) string {
	return filepath.Dir(filePath)
}

func (a *App) ShowInFolder(filePath string) error {
	switch goruntime.GOOS {
	case "windows":
		return exec.Command("explorer.exe", "/select,"+filepath.Clean(filePath)).Start()
	case "darwin":
		return exec.Command("open", "-R", filePath).Start()
	default:
		return exec.Command("xdg-open", filepath.Dir(filePath)).Start()
	}
}

func (a *App) OpenExternal(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https" && parsed.Scheme != "mailto") {
		return fmt.Errorf("unsupported URL")
	}
	wailsruntime.BrowserOpenURL(a.ctx, rawURL)
	return nil
}

func (a *App) OpenDefaultApps() error {
	if goruntime.GOOS == "windows" {
		return exec.Command("explorer.exe", "ms-settings:defaultapps").Start()
	}
	return nil
}

func (a *App) Print() {
	wailsruntime.WindowPrint(a.ctx)
}

func (a *App) SetTheme(dark bool) {
	if dark {
		wailsruntime.WindowSetDarkTheme(a.ctx)
	} else {
		wailsruntime.WindowSetLightTheme(a.ctx)
	}
}

func (a *App) SetLanguage(language string) (string, error) {
	a.language = normaliseLanguage(language)
	_, err := a.updatePreferences(func(prefs *Preferences) {
		prefs.Language = a.language
	})
	if err == nil {
		if removeErr := os.Remove(a.languageSelectionMarkerPath()); removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
			err = removeErr
		}
	}
	return a.language, err
}

func (a *App) RequestQuit() bool {
	a.mu.RLock()
	dirty := a.dirty
	a.mu.RUnlock()
	if dirty && !a.confirmDiscard(a.ctx, true) {
		return false
	}
	a.SetDirty(false)
	wailsruntime.Quit(a.ctx)
	return true
}

func (a *App) confirmDiscard(ctx context.Context, exiting bool) bool {
	continueLabel := a.text("continueEditing")
	discardLabel := a.text("discardAndOpen")
	message := a.text("openUnsavedMessage")
	if exiting {
		discardLabel = a.text("discardAndExit")
		message = a.text("exitUnsavedMessage")
	}
	response, err := wailsruntime.MessageDialog(ctx, wailsruntime.MessageDialogOptions{
		Type: wailsruntime.WarningDialog, Title: a.text("unsavedTitle"), Message: message,
		Buttons: []string{continueLabel, discardLabel}, DefaultButton: continueLabel, CancelButton: continueLabel,
	})
	return err == nil && response == discardLabel
}

func findMarkdownArgument(args []string) string {
	for _, arg := range args {
		if markdownExtensions[strings.ToLower(filepath.Ext(strings.Trim(arg, "\"")))] {
			return strings.Trim(arg, "\"")
		}
	}
	return ""
}

func (a *App) text(key string) string {
	translations := map[string]map[string]string{
		"zh-CN": {
			"unsavedTitle": "尚未保存", "openUnsavedMessage": "当前文档有尚未保存的更改。打开其他文档将放弃这些更改。",
			"exitUnsavedMessage": "文档中的更改尚未保存。确定要退出并放弃这些更改吗？", "continueEditing": "继续编辑",
			"discardAndOpen": "不保存并打开", "discardAndExit": "不保存并退出", "openMarkdown": "打开 Markdown 文档",
			"markdownDocument": "Markdown 文档", "textFile": "文本文件", "allFiles": "所有文件", "openFolder": "打开文档文件夹",
			"saveAsMarkdown": "另存为 Markdown 文档", "newDocument": "新建文档.md", "newMarkdown": "新建 Markdown 文档",
			"selectImage": "选择要插入的图片", "imageFile": "图片文件",
		},
		"en": {
			"unsavedTitle": "Unsaved Changes", "openUnsavedMessage": "The current document has unsaved changes. Opening another document will discard them.",
			"exitUnsavedMessage": "The document has unsaved changes. Exit and discard them?", "continueEditing": "Continue Editing",
			"discardAndOpen": "Discard and Open", "discardAndExit": "Discard and Exit", "openMarkdown": "Open Markdown Document",
			"markdownDocument": "Markdown Document", "textFile": "Text File", "allFiles": "All Files", "openFolder": "Open Document Folder",
			"saveAsMarkdown": "Save Markdown Document As", "newDocument": "New document.md", "newMarkdown": "New Markdown Document",
			"selectImage": "Choose an image to insert", "imageFile": "Image files",
		},
	}
	if value := translations[a.language][key]; value != "" {
		return value
	}
	return key
}
