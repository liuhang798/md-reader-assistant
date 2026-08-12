package main

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPickUpdateAsset(t *testing.T) {
	assets := []githubReleaseAsset{
		{Name: "md-reader-assistant-2.3.5-linux-amd64.deb"},
		{Name: "md-reader-assistant-2.3.5-macos-universal.dmg"},
		{Name: "md-reader-assistant-2.3.5-macos-universal.bin"},
		{Name: "md-reader-assistant-2.3.5-windows-amd64.exe"},
	}

	darwin, err := pickUpdateAsset(assets, "darwin")
	if err != nil {
		t.Fatalf("darwin: %v", err)
	}
	if darwin.Name != "md-reader-assistant-2.3.5-macos-universal.bin" {
		t.Fatalf("darwin picked %q, want the .bin executable", darwin.Name)
	}

	windows, err := pickUpdateAsset(assets, "windows")
	if err != nil {
		t.Fatalf("windows: %v", err)
	}
	if windows.Name != "md-reader-assistant-2.3.5-windows-amd64.exe" {
		t.Fatalf("windows picked %q, want the NSIS installer", windows.Name)
	}

	if _, err := pickUpdateAsset(assets, "linux"); err == nil {
		t.Fatal("linux must not support in-app updates")
	}
	if _, err := pickUpdateAsset(nil, "darwin"); err == nil {
		t.Fatal("a release without the expected asset must fail")
	}
}

func TestVerifyDigest(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "update.bin")
	content := []byte("hello update")
	if err := os.WriteFile(path, content, 0o644); err != nil {
		t.Fatal(err)
	}
	sum := sha256.Sum256(content)
	good := "sha256:" + hex.EncodeToString(sum[:])
	if err := verifyDigest(path, good); err != nil {
		t.Fatalf("valid digest must pass: %v", err)
	}
	if err := verifyDigest(path, "sha256:"+strings.Repeat("0", 64)); err == nil {
		t.Fatal("mismatched digest must fail")
	}
	if err := verifyDigest(path, ""); err == nil {
		t.Fatal("missing digest must fail")
	}
}

func TestDownloadFileAndProgress(t *testing.T) {
	content := []byte(strings.Repeat("x", 256*1024))
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write(content)
	}))
	defer server.Close()

	app := &App{} // nil ctx: progress events are skipped safely
	dir := t.TempDir()
	path := filepath.Join(dir, "downloaded.bin")
	if err := app.downloadFile(server.URL, path); err != nil {
		t.Fatalf("download failed: %v", err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != string(content) {
		t.Fatal("downloaded content does not match the source")
	}
}

func TestDownloadFileRejectsBadStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "boom", http.StatusNotFound)
	}))
	defer server.Close()

	app := &App{}
	if err := app.downloadFile(server.URL, filepath.Join(t.TempDir(), "nope.bin")); err == nil {
		t.Fatal("non-200 response must fail the download")
	}
}
