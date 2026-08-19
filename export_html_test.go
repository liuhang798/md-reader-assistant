package main

import (
	"strings"
	"testing"
)

func TestBuildStandaloneHTMLPreservesDocumentAndAppearance(t *testing.T) {
	data, err := buildStandaloneHTML(`<h1>公式与代码</h1><p><span class="math-inline"><math><mi>x</mi><mo>=</mo><mn>1</mn></math></span></p><pre><code class="language-go">fmt.Println(&quot;ok&quot;)</code></pre>`, `示例 & 文档`, "zh-CN", "dark", "#075DF3")
	if err != nil {
		t.Fatal(err)
	}
	document := string(data)
	for _, expected := range []string{`<!doctype html>`, `lang="zh-CN"`, `data-color-mode="dark"`, `--accent:#075DF3`, `<title>示例 &amp; 文档</title>`, `<math>`, `fmt.Println`} {
		if !strings.Contains(document, expected) {
			t.Fatalf("standalone HTML missing %q: %s", expected, document)
		}
	}
}

func TestBuildStandaloneHTMLRemovesExecutableContent(t *testing.T) {
	data, err := buildStandaloneHTML(`<p onclick="alert(1)" style="background:url(https://example.com/track)">安全正文</p><script>alert(1)</script><style>body{display:none}</style><iframe src="https://example.com"></iframe><a href="javascript:alert(1)">危险链接</a><img src="data:image/png;base64,AA==" srcset="https://example.com/track 2x" onerror="alert(1)">`, "Safe", "en", "light", "not-a-color")
	if err != nil {
		t.Fatal(err)
	}
	document := string(data)
	for _, unsafe := range []string{`onclick=`, `<script`, `<iframe`, `javascript:`, `onerror=`, `background:url`, `srcset=`, `body{display:none}`} {
		if strings.Contains(strings.ToLower(document), unsafe) {
			t.Fatalf("unsafe HTML survived export: %q in %s", unsafe, document)
		}
	}
	if !strings.Contains(document, `安全正文`) || !strings.Contains(document, `data:image/png;base64,AA==`) {
		t.Fatalf("safe exported content was removed: %s", document)
	}
	if !strings.Contains(document, `--accent:#159A63`) {
		t.Fatalf("invalid accent did not fall back safely: %s", document)
	}
}

func TestSafeStandaloneURLAllowsOnlyExportableSchemes(t *testing.T) {
	for _, value := range []string{"https://example.com", "http://example.com", "mailto:hello@example.com", "#section"} {
		if !safeStandaloneURL(value, false) {
			t.Fatalf("safe link rejected: %s", value)
		}
	}
	for _, value := range []string{"javascript:alert(1)", "file:///tmp/private.txt", "data:text/html,test"} {
		if safeStandaloneURL(value, false) {
			t.Fatalf("unsafe link accepted: %s", value)
		}
	}
	if !safeStandaloneURL("data:image/png;base64,AA==", true) || safeStandaloneURL("data:text/html,test", true) {
		t.Fatal("image data URL policy is incorrect")
	}
}
