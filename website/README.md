# MD阅读助手官网

这是 [MD阅读助手](https://github.com/liuhang798/md-reader-assistant) 的产品官网源代码，正式地址为：

**https://liuhang798.github.io/**

官网采用独立仓库维护，与桌面客户端项目分开提交、构建和发布。

网站使用 React、Vite 和原生 CSS 构建，通过 GitHub Actions 自动发布到 GitHub Pages。

## 搜索引擎优化

- 首页 HTML 内置可直接抓取的中文产品介绍，React 加载后替换为完整交互页面。
- `/en/` 提供独立英文静态介绍页，并与中文页互相声明 `hreflang`。
- `robots.txt` 允许抓取并声明 `sitemap.xml`。
- `sitemap.xml` 收录中文首页和英文介绍页。
- 首页包含 Open Graph、Twitter Card 与 Schema.org `SoftwareApplication` 结构化数据。
- GitHub Pages 部署完成后自动调用 IndexNow，通知 Bing 及其他参与该协议的搜索引擎。

## 本地开发

```bash
npm install
npm run dev
```

## 生产构建

```bash
npm run build
npm run test:sites
npm run test:seo
```

推送到 `main` 分支后，`.github/workflows/pages.yml` 会自动构建并发布官网。
