package main

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"encoding/xml"
	"io"
	"strings"
	"testing"
)

func TestBuildDOCXCreatesValidOfficePackage(t *testing.T) {
	pixelPNG := "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
	html := `<h1>导出测试</h1><p>普通 <strong>加粗</strong>、<em>斜体</em>和<a href="https://example.com/?a=1&amp;b=2">链接</a>。</p>` +
		`<blockquote><p>引用内容</p></blockquote><ul><li>列表一</li><li>列表二</li></ul>` +
		`<table><thead><tr><th>项目</th><th>值</th></tr></thead><tbody><tr><td>版本</td><td>2.4.4</td></tr></tbody></table>` +
		`<div class="code-block"><div class="code-header"><span>go</span><button>复制</button></div><pre><code>fmt.Println(&quot;ok&quot;)</code></pre></div>` +
		`<p><img src="data:image/png;base64,` + pixelPNG + `" alt="示例图片"></p>`

	data, err := buildDOCX(html, "示例文档", t.TempDir())
	if err != nil {
		t.Fatalf("build DOCX: %v", err)
	}
	files := readDOCXFiles(t, data)
	for _, required := range []string{"[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/styles.xml", "word/numbering.xml", "word/settings.xml", "word/_rels/document.xml.rels", "docProps/core.xml", "word/media/image1.png"} {
		if _, ok := files[required]; !ok {
			t.Fatalf("DOCX missing %s", required)
		}
	}

	document := string(files["word/document.xml"])
	for _, expected := range []string{"导出测试", "加粗", "引用内容", "列表一", "<w:tbl>", "fmt.Println", "<w:drawing>"} {
		if !strings.Contains(document, expected) {
			t.Fatalf("document.xml missing %q", expected)
		}
	}
	if strings.Contains(document, "复制") {
		t.Fatal("preview-only code copy control leaked into DOCX")
	}
	if !strings.Contains(document, `<w:numId w:val="1"/>`) {
		t.Fatal("unordered list is not backed by Word numbering")
	}
	if !strings.Contains(document, `<w:tblLayout w:type="fixed"/>`) || !strings.Contains(document, `<w:tblGrid>`) {
		t.Fatal("table does not carry fixed Word geometry")
	}
	if strings.Contains(document, `<w:pStyle w:val="Heading1"/><w:spacing`) {
		t.Fatal("heading spacing is unexpectedly overridden by direct formatting")
	}
	assertWellFormedXML(t, files["word/document.xml"])
	assertWellFormedXML(t, files["word/styles.xml"])
	assertWellFormedXML(t, files["word/numbering.xml"])
	assertWellFormedXML(t, files["word/settings.xml"])
	assertWellFormedXML(t, files["word/_rels/document.xml.rels"])
	assertWellFormedXML(t, files["[Content_Types].xml"])
	if !strings.Contains(string(files["word/_rels/document.xml.rels"]), `TargetMode="External"`) {
		t.Fatal("hyperlink relationship was not exported")
	}
	if !strings.Contains(string(files["docProps/core.xml"]), "示例文档") {
		t.Fatal("document title was not written to core properties")
	}

	decoded, _ := base64.StdEncoding.DecodeString(pixelPNG)
	if !bytes.Equal(files["word/media/image1.png"], decoded) {
		t.Fatal("embedded image differs from source")
	}
}

func TestBuildDOCXEscapesTextAndPreservesLineBreaks(t *testing.T) {
	data, err := buildDOCX(`<p>A &amp; B &lt; C<br>下一行</p><div class="plain-text">line 1
line 2</div>`, "Escape", t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	files := readDOCXFiles(t, data)
	document := string(files["word/document.xml"])
	if !strings.Contains(document, `A &amp; B &lt; C`) {
		t.Fatalf("escaped text missing from document: %s", document)
	}
	if strings.Count(document, `<w:br/>`) < 2 {
		t.Fatal("HTML and plain-text line breaks were not preserved")
	}
	assertWellFormedXML(t, files["word/document.xml"])
}

func TestBuildDOCXPreservesMathSourceOnce(t *testing.T) {
	html := `<p>Inline <span class="math-inline"><span class="katex-mathml"><math><semantics><annotation encoding="application/x-tex">E = mc^2</annotation></semantics></math></span><span class="katex-html">visual duplicate</span></span></p>` +
		`<div class="math-block"><span class="katex-mathml"><math><semantics><annotation encoding="application/x-tex">\\ce{2H2 + O2 -&gt; 2H2O} \\tag{1}</annotation></semantics></math></span><span class="katex-html">visual duplicate</span></div>`
	data, err := buildDOCX(html, "Math", t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	document := string(readDOCXFiles(t, data)["word/document.xml"])
	if strings.Count(document, "E = mc^2") != 1 || strings.Count(document, `\\ce{2H2 + O2`) != 1 {
		t.Fatalf("math source should be exported once: %s", document)
	}
	if strings.Contains(document, "visual duplicate") {
		t.Fatal("KaTeX accessibility and visual layers were both exported")
	}
}

func TestBuildDOCXRestartsSeparateOrderedLists(t *testing.T) {
	data, err := buildDOCX(`<ol><li>第一组</li><li>第二项</li></ol><p>分隔内容</p><ol><li>重新从一开始</li></ol>`, "Lists", t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	files := readDOCXFiles(t, data)
	document := string(files["word/document.xml"])
	numbering := string(files["word/numbering.xml"])
	if !strings.Contains(document, `<w:numId w:val="2"/>`) || !strings.Contains(document, `<w:numId w:val="3"/>`) {
		t.Fatal("separate ordered lists do not use independent numbering instances")
	}
	if !strings.Contains(numbering, `<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>`) || !strings.Contains(numbering, `<w:num w:numId="3"><w:abstractNumId w:val="1"/></w:num>`) {
		t.Fatal("ordered list numbering instances are missing")
	}
}

func readDOCXFiles(t *testing.T, data []byte) map[string][]byte {
	t.Helper()
	reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		t.Fatalf("open DOCX zip: %v", err)
	}
	files := map[string][]byte{}
	for _, entry := range reader.File {
		file, err := entry.Open()
		if err != nil {
			t.Fatalf("open %s: %v", entry.Name, err)
		}
		content, err := io.ReadAll(file)
		file.Close()
		if err != nil {
			t.Fatalf("read %s: %v", entry.Name, err)
		}
		files[entry.Name] = content
	}
	return files
}

func assertWellFormedXML(t *testing.T, data []byte) {
	t.Helper()
	decoder := xml.NewDecoder(bytes.NewReader(data))
	for {
		_, err := decoder.Token()
		if err == io.EOF {
			return
		}
		if err != nil {
			t.Fatalf("invalid XML: %v\n%s", err, data)
		}
	}
}
