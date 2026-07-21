package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const latestReleaseAPI = "https://api.github.com/repos/liuhang798/md-reader-assistant/releases/latest"

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
	TagName     string `json:"tag_name"`
	Name        string `json:"name"`
	Body        string `json:"body"`
	HTMLURL     string `json:"html_url"`
	PublishedAt string `json:"published_at"`
	Draft       bool   `json:"draft"`
	Prerelease  bool   `json:"prerelease"`
}

// CheckForUpdates checks the latest stable GitHub Release. The frontend calls
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
	request, err := http.NewRequestWithContext(context.Background(), http.MethodGet, latestReleaseAPI, nil)
	if err != nil {
		return result, err
	}
	request.Header.Set("Accept", "application/vnd.github+json")
	request.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	request.Header.Set("User-Agent", "MDReaderAssistant/"+appVersion)

	response, err := (&http.Client{Timeout: 8 * time.Second}).Do(request)
	if err != nil {
		return result, fmt.Errorf("check GitHub release: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return result, fmt.Errorf("GitHub release check returned %s", response.Status)
	}

	var release githubRelease
	if err := json.NewDecoder(response.Body).Decode(&release); err != nil {
		return result, fmt.Errorf("decode GitHub release: %w", err)
	}
	if release.Draft || release.Prerelease || strings.TrimSpace(release.TagName) == "" {
		return result, errors.New("GitHub did not return a stable release")
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
		result.ReleaseURL = "https://github.com/liuhang798/md-reader-assistant/releases/latest"
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
