import {
  AppleLogo,
  ArrowRight,
  Clock,
  Code,
  DownloadSimple,
  FileText,
  GithubLogo,
  LinuxLogo,
  MagnifyingGlass,
  PencilSimple,
  Printer,
  WindowsLogo,
} from "@phosphor-icons/react";

const RELEASE_URL = "https://github.com/liuhang798/md-reader-assistant/releases/latest";
const REPO_URL = "https://github.com/liuhang798/md-reader-assistant";
const asset = (name) => `${import.meta.env.BASE_URL}${name}`;

function DownloadButton({ compact = false, footer = false }) {
  return (
    <a
      className={`button button-primary${compact ? " button-compact" : ""}${footer ? " button-footer" : ""}`}
      href={RELEASE_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="前往 GitHub Releases 免费下载 MD阅读助手"
    >
      <DownloadSimple weight="bold" aria-hidden="true" />
      {footer ? "免费下载 MD阅读助手" : compact ? "下载客户端" : "免费下载"}
    </a>
  );
}

const readFeatures = [
  { icon: MagnifyingGlass, title: "目录导航与搜索", body: "快速定位章节，搜索内容关键词" },
  { icon: FileText, title: "本地资源浏览", body: "浏览最近文件，管理本地资源" },
  { icon: Printer, title: "打印与分享", body: "一键打印，导出为 PDF" },
];

const editFeatures = [
  { icon: PencilSimple, title: "Markdown 格式工具", body: "标题、列表、引用、表格、链接等" },
  { icon: Code, title: "语法高亮与代码块", body: "清晰的代码高亮，支持多种语言" },
  { icon: Clock, title: "10 秒自动保存", body: "每 10 秒自动保存，安心写作" },
];

const platforms = [
  { icon: WindowsLogo, name: "Windows", note: "Windows 10 或更高版本" },
  { icon: AppleLogo, name: "macOS", note: "macOS 10.15 或更高版本" },
  { icon: LinuxLogo, name: "Linux", note: "DEB 与 AppImage" },
];

function FeatureList({ items }) {
  return (
    <ul className="feature-list">
      {items.map(({ icon: Icon, title, body }) => (
        <li key={title}>
          <span className="feature-icon"><Icon weight="light" aria-hidden="true" /></span>
          <span><strong>{title}</strong><small>{body}</small></span>
        </li>
      ))}
    </ul>
  );
}

export function App() {
  return (
    <div className="site-shell">
      <header className="site-header" aria-label="网站页眉">
        <a className="brand" href="#top" aria-label="MD阅读助手首页">
          <img src={asset("appicon.png")} alt="" />
          <span>MD阅读助手</span>
        </a>
        <nav className="nav-links" aria-label="主导航">
          <a href="#features">功能</a>
          <a href="#interface">界面</a>
          <a href={REPO_URL} target="_blank" rel="noreferrer">开源</a>
          <a className="language-link" href="/en/" lang="en" aria-label="Open the English website">
            <span className="language-desktop">English</span>
            <span className="language-mobile">EN</span>
          </a>
          <DownloadButton compact />
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <img className="botanical botanical-hero" src={asset("botanical.png")} alt="" aria-hidden="true" />
          <p className="eyebrow">LOCAL-FIRST MARKDOWN READER &amp; EDITOR</p>
          <h1 id="hero-title">一款真正轻量免费的 Markdown 阅读器</h1>
          <p className="hero-lead">极简本地 Markdown 阅读与编辑器，轻量、安静，始终专注于你的文字。</p>
          <p className="hero-meta">约 7 MB · 本地文件 · Windows / macOS / Linux</p>
          <DownloadButton />
          <a className="github-link" href={REPO_URL} target="_blank" rel="noreferrer">
            <GithubLogo weight="fill" aria-hidden="true" />
            在 GitHub 查看开源项目 <ArrowRight aria-hidden="true" />
          </a>
          <figure className="app-shot app-shot-hero">
            <img src={asset("split-editor.png")} alt="MD阅读助手实时预览与 Markdown 编辑界面" />
          </figure>
        </section>

        <section className="showcase" id="features">
          <div className="showcase-copy">
            <p className="section-kicker">阅读体验</p>
            <h2>打开即读，<br />安静而清晰</h2>
            <p>沉浸式阅读体验，目录导航与搜索触手可及，只为内容本身。</p>
            <FeatureList items={readFeatures} />
          </div>
          <figure className="app-shot app-shot-reader" id="interface">
            <img src={asset("reader.png")} alt="MD阅读助手沉浸式阅读界面" />
          </figure>
        </section>

        <section className="showcase showcase-edit">
          <figure className="app-shot app-shot-editor">
            <img src={asset("split-editor.png")} alt="MD阅读助手分栏编辑界面" />
          </figure>
          <div className="showcase-copy">
            <p className="section-kicker">编辑体验</p>
            <h2>一边写，<br />一边看见结果</h2>
            <p>实时分栏预览、CodeMirror 编辑器，让写作与排版同步进行。</p>
            <FeatureList items={editFeatures} />
          </div>
        </section>

        <section className="platforms" aria-labelledby="platform-title">
          <h2 id="platform-title">跨平台支持</h2>
          <div className="platform-grid">
            {platforms.map(({ icon: Icon, name, note }) => (
              <div className="platform" key={name}>
                <Icon weight="fill" aria-hidden="true" />
                <span><strong>{name}</strong><small>{note}</small></span>
              </div>
            ))}
          </div>
        </section>

        <section className="final-cta" id="download">
          <img className="botanical botanical-left" src={asset("botanical.png")} alt="" aria-hidden="true" />
          <img className="botanical botanical-right" src={asset("botanical.png")} alt="" aria-hidden="true" />
          <h2>现在，就开始写作</h2>
          <p>轻量、专注、本地优先。让 Markdown 回到内容本身。</p>
          <DownloadButton footer />
          <a className="github-link" href={REPO_URL} target="_blank" rel="noreferrer">
            <GithubLogo weight="fill" aria-hidden="true" />
            在 GitHub 查看开源项目 <ArrowRight aria-hidden="true" />
          </a>
          <p className="legal">MIT 开源许可证　·　中文 / English　·　约 7 MB</p>
        </section>
      </main>

    </div>
  );
}
