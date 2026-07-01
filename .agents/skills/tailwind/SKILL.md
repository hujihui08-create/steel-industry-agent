---
name: tailwind
description: HyperFrames 合成的 Tailwind CSS v4.2 浏览器运行时模式。当搭建或编辑使用 `hyperframes init --tailwind` 创建的项目、在合成 HTML 中编写 Tailwind 工具类、添加 CSS 优先的 Tailwind v4 主题 Token、调试 v3 与 v4 语法差异，或决定何时将 Tailwind 编译为 CSS 而非使用浏览器运行时的时候使用。
---

# HyperFrames 的 Tailwind CSS

HyperFrames `init --tailwind` 使用固定在 `@tailwindcss/browser@4.2.4` 的 Tailwind 浏览器运行时。将其视为 Tailwind v4，而非 v3。

本技能用于 CLI 生成的合成 HTML。不适用于 `packages/studio`，Studio 内部仍使用 Tailwind v3 配合 `tailwind.config.js`、PostCSS 和 `@tailwind` 指令。

## 何时使用

- 用户在 HyperFrames 合成中要求使用 Tailwind。
- 项目是通过 `hyperframes init --tailwind` 创建的。
- 你在 `index.html` 中看到 `window.__tailwindReady`。
- 你需要工具类、CSS 优先的主题 Token、自定义工具类或 v3 到 v4 的迁移指导。
- 渲染缺少样式且项目依赖浏览器运行时。

## 版本契约

- 固定运行时：`@tailwindcss/browser@4.2.4`。
- 浏览器运行时脚本由 CLI 注入。不要将其替换为 `cdn.tailwindcss.com`。
- HyperFrames 在帧捕获开始前等待 `window.__tailwindReady`。
- 就绪 shim 必须保持确定性：禁止依赖渲染循环轮询 API、禁止基于时钟的重试、禁止除固定的 Tailwind 运行时脚本之外的运行时网络获取。
- 对于离线、锁定或生产稳定渲染，将 Tailwind 编译为 CSS 并直接包含样式表，而不是依赖浏览器运行时。

## v4 规则

Tailwind v4 是 CSS 优先的：

```html
<style type="text/tailwindcss">
  @theme {
    --color-brand: oklch(0.68 0.2 252);
    --font-display: "Inter", sans-serif;
  }

  @utility headline-balance {
    text-wrap: balance;
    letter-spacing: 0;
  }
</style>
```

在浏览器运行时合成中避免 v3 设置模式：

```css
/* 不要在 Tailwind v4 浏览器运行时合成中使用这些。 */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

不要仅仅为了在 v4 浏览器运行时合成中定义颜色、字体、间距或工具类而添加 `tailwind.config.js`。在 `text/tailwindcss` 样式块中使用 `@theme` 和 `@utility`。

如果你确实需要为编译的 v4 构建加载现有 JavaScript 配置，通过 CSS 的 `@config` 显式加载，然后在浏览器中验证。不要假设 v4 会自动检测 v3 配置文件。

## HyperFrames 合成模式

让 Tailwind 负责静态布局和视觉样式。让动效时序保持在 GSAP 或其他可定位的适配器中。

```html
<section
  class="clip absolute inset-0 grid place-items-center bg-zinc-950 text-white"
  data-start="0"
  data-duration="5"
  data-track-index="1"
>
  <div class="w-[1280px] max-w-[82vw] text-center">
    <p class="mb-6 text-xl font-medium uppercase tracking-[0.18em] text-cyan-300">
      Render-ready Tailwind
    </p>
    <h1 class="text-7xl font-black leading-none text-balance">
      Utility classes, deterministic frames.
    </h1>
  </div>
</section>
```

对于重复项，优先使用类列表加 CSS 自定义属性，而非动态生成类名：

```html
<span class="inline-block translate-y-[calc(var(--i)*6px)] opacity-80" style="--i: 0"></span>
<span class="inline-block translate-y-[calc(var(--i)*6px)] opacity-80" style="--i: 1"></span>
<span class="inline-block translate-y-[calc(var(--i)*6px)] opacity-80" style="--i: 2"></span>
```

## 动态类安全性

Tailwind 的浏览器运行时扫描当前文档并为能看到的所有类名生成 CSS。不要在定位时才构建渲染关键的类名：

```js
// 有风险：Tailwind 可能在捕获前看不到所有生成的类。
element.className = `bg-${color}-500`;
```

改为在 HTML、data 属性或显式 CSS 中使用完整的类名：

```html
<div data-tone="blue" class="bg-blue-500 data-[tone=rose]:bg-rose-500"></div>
```

如果生成的类不可避免，确保完整的类 Token 在验证前出现在 `text/tailwindcss` 块中。

## 视频专用护栏

- 使用稳定尺寸：`w-[...]`、`h-[...]`、`aspect-video`、`grid`、`flex` 以及视频布局的固定 padding。
- 动画属性优先使用 transforms 和 opacity。
- 将 Tailwind transitions 排除在渲染关键时序之外，除非有可定位的运行时控制状态。
- 避免对必须确定性渲染的内容使用 hover、focus、scroll、viewport 或 pointer 变体。
- 使用显式的边框颜色。Tailwind v4 更改了默认边框行为（从 v3 改变），因此 `border border-white/20` 比裸 `border` 更安全。
- 使用 v4 工具类名称：`shadow-xs`、`rounded-xs`、`outline-hidden`、`shrink-*` 和 `grow-*`（在这些替换适用时）。
- 如果输出需要兼容旧版浏览器，注意现代 CSS 工具类。Tailwind v4 以现代浏览器为目标。

## 验证

编辑启用 Tailwind 的合成后：

```bash
npx hyperframes lint
npx hyperframes validate
npx hyperframes inspect
```

获取渲染证明：

```bash
npx hyperframes render . --workers 1 --quality draft --output tailwind-proof.mp4
```

验证路径应在第 0 帧显示无样式缺失闪烁。如果样式在预览中出现但在渲染中不出现，检查 `window.__tailwindReady` 是否存在并在捕获前解析。

## 快速调试检查清单

1. 确认项目是通过 `hyperframes init --tailwind` 搭建的。
2. 确认脚本指向 `@tailwindcss/browser@4.2.4`。
3. 确认 `window.__tailwindReady` 存在。
4. 将 v3 `@tailwind` 指令替换为 v4 浏览器运行时 CSS。
5. 将自定义 Token 从 `tailwind.config.js` 移到 `@theme`。
6. 将动态拼接的类替换为完整的静态 Token。
7. 运行 `npx hyperframes validate` 并渲染一个简短的证明。

## 致谢与参考

- Tailwind CSS 官方 v4 安装、升级和兼容性文档：https://tailwindcss.com/docs
- Tailwind CSS v4 发布说明：https://tailwindcss.com/blog/tailwindcss-v4
- 社区 Tailwind 技能已审查 v4 陷阱和技能形态，但本技能将持久契约保留在仓库内并专用于 HyperFrames。
