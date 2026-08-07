# MD 阅读助手强调色与明暗模式拆分设计规格

日期：2026-08-07  
状态：方案 A 已确认，待实施

## 1. 目标

将当前“8 套完整主题”重构为两个互相独立的外观功能：

1. **主题颜色**：提供用户截图中的 8 种强调色，只改变品牌色、主要按钮、链接、选中态、焦点态、代码强调色及应用内 Logo。
2. **明暗模式**：提供白天与黑夜两种中性色基底，只改变背景、纸张、正文、次要文字、边框、阴影及代码块底色。

用户可以自由组合任意强调色与白天/黑夜模式。首次启动默认使用图 1 的绿色与白天模式。

## 2. 采用的交互方案

采用用户确认的方案 A：工具栏显示两个独立控件。

- **调色盘按钮**：打开 8 色选择面板。点击色块后立即应用、保存并关闭面板。
- **太阳/月亮按钮**：单击直接切换白天和黑夜模式，不打开颜色面板。
- 两个按钮相邻放置，位于搜索按钮与“更多”按钮之间。
- 颜色面板保留键盘焦点、`aria-checked`、选中勾号、`Escape` 和点击外部关闭行为。
- 颜色面板采用 2 列 × 4 行；每项同时显示色块、双语名称和选中标记，不能只依靠颜色表达状态。

不新增设置页面，不把颜色选择藏入“更多”菜单。

## 3. 八种强调色

颜色根据用户提供的 8 张参考图取样并归一化为稳定的主题基色：

| 顺序 | 主题 ID | 中文名称 | English | 基色 |
|---|---|---|---|---|
| 1 | `green` | 清新绿 | Fresh Green | `#07A936` |
| 2 | `blue` | 晴空蓝 | Clear Blue | `#075DF3` |
| 3 | `orange` | 活力橙 | Vivid Orange | `#F57C04` |
| 4 | `violet` | 灵动紫 | Vivid Violet | `#7940E0` |
| 5 | `coral` | 珊瑚红 | Coral Red | `#FC5540` |
| 6 | `cyan` | 湖水蓝 | Lake Cyan | `#0789B6` |
| 7 | `slate` | 雾蓝灰 | Mist Slate | `#556477` |
| 8 | `clay` | 陶土棕 | Clay Brown | `#A56254` |

每种颜色定义语义变量，例如 `--accent`、`--accent-strong`、`--accent-soft`、`--accent-border` 和 `--accent-contrast`。组件不直接引用具体色值，也不继续使用仅适用于绿色的变量命名。

## 4. 明暗模式

根节点使用两个正交属性：

```html
<html data-accent="green" data-color-mode="light">
```

- `data-color-mode="light"` 定义统一的浅色背景、正文、边框、代码块和阴影。
- `data-color-mode="dark"` 定义统一的深色背景、正文、边框、代码块和阴影。
- `data-accent` 只定义强调色变量，不覆盖页面背景和正文颜色。
- 打印样式始终使用适合纸张的浅色输出，不受当前模式或强调色影响。
- 原生窗口主题仍通过 `window.leafMD.setTheme(dark)` 同步，但只由 `colorMode` 决定。

参考图只定义了白天模式。黑夜模式沿用项目现有的低眩光中性深色基底，并为每种强调色计算或配置可读的深色模式前景色，保证正文和控件对比度。

## 5. Logo 行为

- 顶部左上角 Logo 跟随 `data-accent` 切换对应颜色。
- 应用内首次语言选择、关于窗口等复用品牌 Logo 的位置也保持同一主题色，避免同一界面出现两种品牌色。
- Logo 白色书本图形、透明圆角边缘和阴影保持不变，只替换绿色背景区域。
- Windows/macOS/Linux 的可执行文件、任务栏、Dock、安装器和桌面快捷方式图标保持默认绿色，因为这些系统图标不能随运行时主题可靠动态切换。
- 8 个运行时 Logo 作为真实 PNG 资源生成并纳入校验，不使用会连带改变白色图形的近似 CSS 滤镜。

## 6. 状态与持久化

前端状态拆分为：

```js
state.accentTheme // green | blue | orange | violet | coral | cyan | slate | clay
state.colorMode   // light | dark
```

本地保存使用：

- `localStorage.accentTheme`
- `localStorage.colorMode`

默认值为 `green` 与 `light`。未知或损坏值分别回退到这两个默认值。

### 旧版本迁移

仅在新键缺失时读取旧的 `localStorage.theme`，映射如下：

| 旧值 | 新强调色 | 新模式 |
|---|---|---|
| `light`、`classic-light`、`wechat-green` | `green` | `light` |
| `dark`、`classic-dark` | `green` | `dark` |
| `alipay-blue` | `blue` | `light` |
| `wisteria` | `violet` | `light` |
| `amber-paper` | `orange` | `light` |
| `deep-ocean` | `cyan` | `dark` |
| `amethyst-night` | `violet` | `dark` |

迁移后写入新键。若用户已经拥有任一新键，则只补齐缺失键，不用旧值覆盖已有选择。

## 7. 实现范围

预计修改：

- `frontend/index.html`：拆分调色盘与明暗按钮，替换 8 色菜单结构，为应用内 Logo 增加主题映射钩子。
- `frontend/src/renderer.js`：颜色注册表、模式状态、旧值迁移、持久化、Logo 更新、双语文案和独立事件处理。
- `frontend/src/styles.css`：中性明暗基底、8 套强调色变量、菜单和按钮状态、CodeMirror 及 Markdown 强调色。
- `frontend/src/assets/images/`：8 个运行时主题 Logo。
- `scripts/`：可复现的 Logo 调色脚本及其测试。
- `frontend/tests/`、`app_test.go`：状态、迁移、可访问性、资源映射和回归测试。
- `README.md`、`README.en.md`、`CHANGELOG.md`：更新用户可见说明。

不改变 Go 文档 API、文件读写、最近阅读、自动保存、快捷键、面板尺寸或系统图标配置。

## 8. 验收标准

1. 调色盘和明暗模式是两个独立按钮、两个独立状态。
2. 8 种强调色都能在白天和黑夜模式下使用，共 16 种有效组合。
3. 图 1 绿色是首次启动和异常值回退的默认强调色。
4. 切换强调色时背景、正文和边框不改变；切换明暗模式时强调色不改变。
5. 顶部及应用内品牌 Logo 与当前强调色一致，系统图标保持默认绿色。
6. 旧版 8 主题与 `light`/`dark` 值按迁移表恢复为最接近的组合。
7. 选中色块同时具有勾号、边框和 `aria-checked="true"`，键盘操作和关闭行为正常。
8. 阅读页、实时预览、CodeMirror、目录、侧栏、弹窗、菜单和搜索界面一致响应。
9. 正文和主要控件达到 WCAG AA 常规文字对比度目标。
10. 前端测试与生产构建通过；在本机工具可用时，Go 测试、`go vet` 和 `git diff --check` 通过。

