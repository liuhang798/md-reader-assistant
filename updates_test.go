package main

import "testing"

func TestMapOfficialReleaseUsesLanguageAndAbsoluteAssetURL(t *testing.T) {
	app := &App{language: "zh-CN"}
	release, err := app.mapOfficialRelease(officialRelease{
		Version:     "2.5.0",
		TitleZH:     "轻阅 Markdown 2.5.0",
		TitleEN:     "Quillite Markdown 2.5.0",
		NotesZH:     "中文更新日志",
		NotesEN:     "English release notes",
		GitHubURL:   "https://github.com/liuhang798/quillite-markdown/releases/tag/v2.5.0",
		PublishedAt: "2026-08-18T08:00:00Z",
		Assets: []officialReleaseAsset{{
			FileName: "quillite-markdown-2.5.0-windows-amd64.bin",
			SHA256:   "abc123",
			URL:      "/api/v1/releases/2.5.0/assets/windows/update",
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if release.TagName != "v2.5.0" || release.Name != "轻阅 Markdown 2.5.0" || release.Body != "中文更新日志" {
		t.Fatalf("官网版本映射不正确：%+v", release)
	}
	if len(release.Assets) != 1 || release.Assets[0].BrowserDownloadURL != officialWebsiteBase+"/api/v1/releases/2.5.0/assets/windows/update" {
		t.Fatalf("官网安装包地址映射不正确：%+v", release.Assets)
	}
	if release.Assets[0].Digest != "sha256:abc123" {
		t.Fatalf("官网安装包摘要映射不正确：%q", release.Assets[0].Digest)
	}
}

func TestMapOfficialReleaseUsesEnglishCopy(t *testing.T) {
	app := &App{language: "en"}
	release, err := app.mapOfficialRelease(officialRelease{Version: "2.5.0", TitleEN: "English title", NotesEN: "English notes"})
	if err != nil {
		t.Fatal(err)
	}
	if release.Name != "English title" || release.Body != "English notes" {
		t.Fatalf("英文版本说明未生效：%+v", release)
	}
}
