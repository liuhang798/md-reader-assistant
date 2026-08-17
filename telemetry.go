package main

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"os"
	"regexp"
	goruntime "runtime"
	"strings"
	"time"
)

const appErrorEndpoint = "https://8.133.191.203/api/v1/telemetry/app/error"

type appErrorEvent struct {
	EventID    string `json:"eventId"`
	SentAt     string `json:"sentAt"`
	ErrorLog   string `json:"errorLog"`
	OS         string `json:"os"`
	AppVersion string `json:"appVersion"`
}

var windowsPathPattern = regexp.MustCompile(`(?i)\b[A-Z]:[\\/][^\s\r\n"']+`)
var unixPathPattern = regexp.MustCompile(`(^|[\s"'(])/(?:[^\s\r\n"'()]+)`)
var userFileNamePattern = regexp.MustCompile(`(?i)(^|[\s"'(])[^\\/\s"'():]+\.(?:md|markdown|txt|png|jpe?g|gif|webp|svg|pdf|docx?)([\s"'():,;]|$)`)

func newTelemetryEventID() (string, error) {
	random := make([]byte, 16)
	if _, err := rand.Read(random); err != nil {
		return "", err
	}
	return hex.EncodeToString(random), nil
}

// ReportErrorLog 只安排一个可选的后台任务并立即返回。偏好读取、文本清理和
// 网络请求全部在后台完成，任何异常、断网或内网环境都会被静默忽略。
func (a *App) ReportErrorLog(source, message, stack string) {
	a.reportErrorLogInBackground(source, message, stack, func(errorLog string) {
		sendAppErrorLog(appErrorEndpoint, errorLog, &http.Client{Timeout: 4 * time.Second})
	})
}

func (a *App) reportErrorLogInBackground(source, message, stack string, sender func(string)) {
	go func() {
		defer func() { _ = recover() }()
		if sender == nil {
			return
		}
		prefs, err := a.readPreferences()
		if err != nil || !prefs.UsageAnalytics {
			return
		}
		errorLog := buildSanitizedErrorLog(source, message, stack)
		if errorLog == "" {
			return
		}
		sender(errorLog)
	}()
}

func (a *App) SetUsageAnalytics(enabled bool) (Preferences, error) {
	return a.updatePreferences(func(prefs *Preferences) {
		prefs.UsageAnalytics = enabled
	})
}

func sendAppErrorLog(endpoint, errorLog string, client *http.Client) bool {
	if strings.TrimSpace(endpoint) == "" || strings.TrimSpace(errorLog) == "" || client == nil {
		return false
	}
	eventID, err := newTelemetryEventID()
	if err != nil {
		return false
	}
	operatingSystem := goruntime.GOOS
	if operatingSystem == "darwin" {
		operatingSystem = "macos"
	}
	if operatingSystem != "windows" && operatingSystem != "macos" && operatingSystem != "linux" {
		return false
	}
	payload, err := json.Marshal(appErrorEvent{
		EventID:    eventID,
		SentAt:     time.Now().UTC().Format(time.RFC3339),
		ErrorLog:   errorLog,
		OS:         operatingSystem,
		AppVersion: appVersion,
	})
	if err != nil {
		return false
	}
	request, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return false
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := client.Do(request)
	if err != nil {
		return false
	}
	response.Body.Close()
	return response.StatusCode >= 200 && response.StatusCode < 300
}

func buildSanitizedErrorLog(source, message, stack string) string {
	source = sanitizeErrorText(source, 80)
	message = sanitizeErrorText(message, 1000)
	stack = sanitizeErrorText(stack, 2800)
	parts := make([]string, 0, 2)
	if message != "" {
		if source != "" {
			message = source + ": " + message
		}
		parts = append(parts, message)
	}
	if stack != "" {
		parts = append(parts, stack)
	}
	result := strings.TrimSpace(strings.Join(parts, "\n"))
	if len(result) > 4096 {
		result = result[:4096]
	}
	return result
}

func sanitizeErrorText(value string, limit int) string {
	value = strings.Map(func(r rune) rune {
		if r == '\n' || r == '\t' {
			return r
		}
		if r < 0x20 || r == 0x7f {
			return -1
		}
		return r
	}, value)
	if home, err := os.UserHomeDir(); err == nil && strings.TrimSpace(home) != "" {
		for _, candidate := range []string{home, filepathSlash(home)} {
			value = strings.ReplaceAll(value, candidate, "[用户目录]")
		}
	}
	value = windowsPathPattern.ReplaceAllString(value, "[路径]")
	value = unixPathPattern.ReplaceAllString(value, "$1[路径]")
	value = userFileNamePattern.ReplaceAllString(value, "$1[文件名]$2")
	value = strings.TrimSpace(value)
	if len(value) > limit {
		value = value[:limit]
	}
	return value
}

func filepathSlash(value string) string {
	return strings.ReplaceAll(value, `\`, "/")
}
