# MD阅读助手官网

这是 [MD阅读助手](https://github.com/liuhang798/md-reader-assistant) 的产品官网源代码，正式地址为：

**https://liuhang798.github.io/**

网站使用 React、Vite 和原生 CSS 构建，通过 GitHub Actions 自动发布到 GitHub Pages。

## 本地开发

```bash
npm install
npm run dev
```

## 生产构建

```bash
npm run build
```

推送到 `main` 分支后，`.github/workflows/pages.yml` 会自动构建并发布官网。
