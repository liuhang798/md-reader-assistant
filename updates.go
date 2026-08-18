package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const (
	officialWebsiteBase      = "https://8.133.191.203"
	officialLatestReleaseAPI = officialWebsiteBase + "/api/v1/releases/latest"
	githubLatestReleaseAPI   = "https://api.github.com/repos/liuhang798/quillite-markdown/releases/latest"
)

type UpdateInfo struct {
	Checked        bool   `json:"checked"`
	Suppressed     bool   `json:"suppressed"`
	Available      bool   `json:"available"`
	CurrentVersion string `json:"currentVersion"`
	LatestVersion  string `json:"latestVersion"`
	ReleaseName    string `json:"releaseName"`
	ReleaseNotes   string `json:"releaseNotes"`
	ReleaseURL     string `json:"releaseUrl"`
	PublishedAt    string `json:"publishedAt"`
}

type githubRelease struct {
	TagName     string               `json:"tag_name"`
	Name        string               `json:"name"`
	Body        string               `json:"body"`
	HTMLURL     string               `json:"html_url"`
	PublishedAt string               `json:"published_at"`
	Draft       bool                 `json:"draft"`
	Prerelease  bool                 `json:"prerelease"`
	Assets      []githubReleaseAsset `json:"assets"`
}

type githubReleaseAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Digest             string `json:"digest"`
}

type officialRelease struct {
	Version     string                 `json:"version"`
	TitleZH     string                 `json:"titleZh"`
	TitleEN     string                 `json:"titleEn"`
	NotesZH     string                 `json:"notesZh"`
	NotesEN     string                 `json:"notesEn"`
	GitHubURL   string                 `json:"githubUrl"`
	PublishedAt string                 `json:"publishedAt"`
	Assets      []officialReleaseAsset `json:"assets"`
}

type officialReleaseAsset struct {
	FileName string `json:"fileName"`
	SHA256   string `json:"sha256"`
	URL      string `json:"url"`
}

// fetchLatestRelease uses the official release catalog first, then falls back
// to GitHub so update checks continue to work during website maintenance.
func (a *App) fetchLatestRelease() (*githubRelease, error) {
	release, officialErr := a.fetchOfficialLatestRelease()
	if officialErr == nil {
		return release, nil
	}
	release, githubErr := fetchGitHubLatestRelease()
	if githubErr == nil {
		return release, nil
	}
	return nil, fmt.Errorf("official release catalog: %v; GitHub fallback: %w", officialErr, githubErr)
}

func (a *App) fetchOfficialLatestRelease() (*githubRelease, error) {
	request, err := http.NewRequestWithContext(context.Background(), http.MethodGet, officialLatestReleaseAPI, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("User-Agent", "QuilliteMarkdown/"+appVersion)
	response, err := (&http.Client{Timeout: 8 * time.Second}).Do(request)
	if err != nil {
		return nil, fmt.Errorf("check official release catalog: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("official release catalog returned %s", response.Status)
	}
	var item officialRelease
	if err := json.NewDecoder(response.Body).Decode(&item); err != nil {
		return nil, fmt.Errorf("decode official release catalog: %w", err)
	}
	return a.mapOfficialRelease(item)
}

func (a *App) mapOfficialRelease(item officialRelease) (*githubRelease, error) {
	if strings.TrimSpace(item.Version) == "" {
		return nil, errors.New("official release catalog returned an empty version")
	}
	name, notes := item.TitleZH, item.NotesZH
	if a.language == "en" {
		name, notes = item.TitleEN, item.NotesEN
	}
	if strings.TrimSpace(name) == "" {
		name = item.TitleEN
	}
	if strings.TrimSpace(notes) == "" {
		notes = item.NotesEN
	}
	releaseURL := strings.TrimSpace(item.GitHubURL)
	if releaseURL == "" {
		releaseURL = officialWebsiteBase + "/#download"
	}
	mapped := &githubRelease{
		TagName:     "v" + normaliseVersion(item.Version),
		Name:        strings.TrimSpace(name),
		Body:        strings.TrimSpace(notes),
		HTMLURL:     releaseURL,
		PublishedAt: item.PublishedAt,
		Assets:      make([]githubReleaseAsset, 0, len(item.Assets)),
	}
	base, _ := url.Parse(officialWebsiteBase)
	for _, asset := range item.Assets {
		assetURL, err := url.Parse(strings.TrimSpace(asset.URL))
		if err != nil || assetURL.String() == "" {
			continue
		}
		mapped.Assets = append(mapped.Assets, githubReleaseAsset{
			Name:               filepath.Base(asset.FileName),
			BrowserDownloadURL: base.ResolveReference(assetURL).String(),
			Digest:             "sha256:" + strings.TrimPrefix(asset.SHA256, "sha256:"),
		})
	}
	return mapped, nil
}

func fetchGitHubLatestRelease() (*githubRelease, error) {
	request, err := http.NewRequestWithContext(context.Background(), http.MethodGet, githubLatestReleaseAPI, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Accept", "application/vnd.github+json")
	request.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	request.Header.Set("User-Agent", "QuilliteMarkdown/"+appVersion)

	response, err := (&http.Client{Timeout: 8 * time.Second}).Do(request)
	if err != nil {
		return nil, fmt.Errorf("check GitHub release: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub release check returned %s", response.Status)
	}

	var release githubRelease
	if err := json.NewDecoder(response.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("decode GitHub release: %w", err)
	}
	if release.Draft || release.Prerelease || strings.TrimSpace(release.TagName) == "" {
		return nil, errors.New("GitHub did not return a stable release")
	}
	return &release, nil
}

// CheckForUpdates checks the latest stable official release. The frontend calls
// this once at startup and may call it again when the user requests a check.
func (a *App) CheckForUpdates(force bool) (UpdateInfo, error) {
	result := UpdateInfo{CurrentVersion: appVersion}
	if !force {
		prefs, err := a.readPreferences()
		if err == nil && prefs.SuppressUpdateUntil != "" {
			if until, parseErr := time.Parse(time.RFC3339, prefs.SuppressUpdateUntil); parseErr == nil && time.Now().Before(until) {
				result.Suppressed = true
				return result, nil
			}
		}
	}
	release, err := a.fetchLatestRelease()
	if err != nil {
		return result, err
	}

	latest := normaliseVersion(release.TagName)
	result = UpdateInfo{
		Checked:        true,
		Available:      compareVersions(latest, appVersion) > 0,
		CurrentVersion: appVersion,
		LatestVersion:  latest,
		ReleaseName:    strings.TrimSpace(release.Name),
		ReleaseNotes:   strings.TrimSpace(release.Body),
		ReleaseURL:     release.HTMLURL,
		PublishedAt:    release.PublishedAt,
	}
	if result.ReleaseName == "" {
		result.ReleaseName = "v" + latest
	}
	if parsed, parseErr := url.Parse(result.ReleaseURL); parseErr != nil || parsed.Scheme != "https" || !strings.EqualFold(parsed.Host, "github.com") {
		result.ReleaseURL = "https://github.com/liuhang798/quillite-markdown/releases/latest"
	}

	if _, err := a.updatePreferences(func(latestPrefs *Preferences) {
		latestPrefs.LastUpdateCheck = time.Now().UTC().Format(time.RFC3339)
	}); err != nil {
		return result, err
	}
	return result, nil
}

// SnoozeUpdates suppresses automatic prompts. Manual update checks always
// bypass this preference.
func (a *App) SnoozeUpdates(days int) error {
	if days < 1 {
		days = 1
	}
	if days > 365 {
		days = 365
	}
	_, err := a.updatePreferences(func(prefs *Preferences) {
		prefs.SuppressUpdateUntil = time.Now().Add(time.Duration(days) * 24 * time.Hour).UTC().Format(time.RFC3339)
	})
	return err
}

func normaliseVersion(version string) string {
	return strings.TrimPrefix(strings.TrimPrefix(strings.TrimSpace(version), "v"), "V")
}

func compareVersions(left, right string) int {
	parse := func(version string) []int {
		version = normaliseVersion(version)
		if index := strings.IndexAny(version, "-+"); index >= 0 {
			version = version[:index]
		}
		parts := strings.Split(version, ".")
		values := make([]int, len(parts))
		for index, part := range parts {
			value, _ := strconv.Atoi(part)
			values[index] = value
		}
		return values
	}
	leftParts, rightParts := parse(left), parse(right)
	length := len(leftParts)
	if len(rightParts) > length {
		length = len(rightParts)
	}
	for index := 0; index < length; index++ {
		leftValue, rightValue := 0, 0
		if index < len(leftParts) {
			leftValue = leftParts[index]
		}
		if index < len(rightParts) {
			rightValue = rightParts[index]
		}
		if leftValue > rightValue {
			return 1
		}
		if leftValue < rightValue {
			return -1
		}
	}
	return 0
}
