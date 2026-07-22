import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Chinese landing page exposes static crawlable product content", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("src/App.jsx")]);
  assert.match(html, /<h1>约 7 MB 的轻量 Markdown 阅读器与编辑器<\/h1>/);
  assert.match(html, /<meta name="robots" content="index, follow/);
  assert.match(html, /<script type="application\/ld\+json">/);
  assert.match(html, /"@type": "SoftwareApplication"/);
  assert.match(html, /rel="canonical" href="https:\/\/liuhang798\.github\.io\/"/);
  assert.match(html, /property="og:image" content="https:\/\/liuhang798\.github\.io\/split-editor\.png"/);
  assert.match(app, /className="language-link" href="\/en\/"/);
  assert.match(app, />English<\/span>/);
});

test("robots and sitemap expose both language routes", async () => {
  const [robots, sitemap, english, indexNowKey] = await Promise.all([
    read("public/robots.txt"),
    read("public/sitemap.xml"),
    read("public/en/index.html"),
    read("public/9a7d3f5c8b2146e0a4f9c2d8716b3e45.txt"),
  ]);
  assert.match(robots, /Sitemap: https:\/\/liuhang798\.github\.io\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/liuhang798\.github\.io\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/liuhang798\.github\.io\/en\/<\/loc>/);
  assert.match(english, /<html lang="en">/);
  assert.match(english, /<h1>A lightweight Markdown reader and editor of about 7 MB<\/h1>/);
  assert.match(english, /src="\/split-editor-en\.png"/);
  assert.match(english, /property="og:image" content="https:\/\/liuhang798\.github\.io\/split-editor-en\.png"/);
  assert.equal(indexNowKey.trim(), "9a7d3f5c8b2146e0a4f9c2d8716b3e45");
});
