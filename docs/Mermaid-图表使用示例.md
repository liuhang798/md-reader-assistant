# Mermaid 图表使用示例

> 更完整的分类、功能说明与 22 类可复制案例，请查看 [Mermaid 图表完整案例](Mermaid-图表完整案例.md)。

轻阅 Markdown 支持 Typora 风格的 Mermaid 围栏代码块。把语言写成 `mermaid`，源码会在阅读页和编辑实时预览中自动转换成图表。

也可以在编辑器的“更多格式”中直接选择“Mermaid 流程图”“Mermaid 时序图”或“Mermaid 甘特图”，再修改生成的模板。

## 一、流程图

```mermaid
flowchart TD
    A[开始] --> B{是否通过校验}
    B -- 是 --> C[保存数据]
    B -- 否 --> D[显示错误]
    C --> E[结束]
    D --> E
```

方向可以使用 `TD`（从上到下）或 `LR`（从左到右）。

## 二、时序图

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant A as 轻阅 Markdown
    participant F as 本地文件
    U->>A: 打开文档
    A->>F: 读取 Markdown
    F-->>A: 返回内容
    A-->>U: 显示预览
```

## 三、甘特图

```mermaid
gantt
    title 发布计划
    dateFormat YYYY-MM-DD
    excludes weekends
    section 规划
    需求分析 :done, plan, 2026-08-20, 2d
    section 实施
    开发实现 :active, dev, after plan, 4d
    测试验收 :test, after dev, 2d
    正式发布 :milestone, release, after test, 0d
```

## 四、注意事项

- Mermaid 源码仍保存在 Markdown 文件中，软件不会把图表替换成图片。
- 图表语法错误时，只会在对应位置显示错误说明，不影响文档其他内容。
- Word 与独立 HTML 导出会把图表转换成清晰的内嵌图片；PDF 使用系统打印引擎，效果与预览一致。
- 为了安全，图表使用 Mermaid 严格模式，不执行节点中的脚本或点击事件。
