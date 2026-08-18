package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestSubmitFeedbackIncludesVersionSystemAndImage(t *testing.T) {
	imagePath := filepath.Join(t.TempDir(), "screen.png")
	imageBytes := append([]byte("\x89PNG\r\n\x1a\n"), make([]byte, 64)...)
	if err := os.WriteFile(imagePath, imageBytes, 0o600); err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("method=%s", r.Method)
		}
		if err := r.ParseMultipartForm(16 << 20); err != nil {
			t.Fatal(err)
		}
		if r.FormValue("category") != "feature" || r.FormValue("message") != "希望支持更多导出格式" {
			t.Fatalf("反馈字段不正确：%v", r.MultipartForm.Value)
		}
		if r.FormValue("appVersion") != appVersion || r.FormValue("systemVersion") != "Windows 11 · amd64" || r.FormValue("os") != "windows" {
			t.Fatalf("版本字段不正确：%v", r.MultipartForm.Value)
		}
		files := r.MultipartForm.File["images"]
		if len(files) != 1 {
			t.Fatalf("图片数量=%d", len(files))
		}
		file, err := files[0].Open()
		if err != nil {
			t.Fatal(err)
		}
		content, err := io.ReadAll(file)
		file.Close()
		if err != nil || string(content) != string(imageBytes) {
			t.Fatal("上传图片内容不正确")
		}
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	err := submitFeedback(server.URL, FeedbackSubmission{
		Category: "feature", Message: "希望支持更多导出格式", Email: "test@example.com", ImagePaths: []string{imagePath},
	}, FeedbackSystemInfo{AppVersion: appVersion, OS: "windows", SystemVersion: "Windows 11 · amd64"}, server.Client())
	if err != nil {
		t.Fatal(err)
	}
}

func TestSubmitFeedbackReportsServerValidation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"反馈说明不完整"}`))
	}))
	defer server.Close()
	err := submitFeedback(server.URL, FeedbackSubmission{Category: "bug", Message: "功能出现异常"}, FeedbackSystemInfo{AppVersion: appVersion, OS: "windows", SystemVersion: "Windows"}, server.Client())
	if err == nil || err.Error() != "反馈说明不完整" {
		t.Fatalf("错误信息=%v", err)
	}
}
