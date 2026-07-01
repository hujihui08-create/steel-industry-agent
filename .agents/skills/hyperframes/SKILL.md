---
name: hyperframes
description: 在 HyperFrames HTML 中创建视频合成、动画、标题卡片、叠加层、字幕、旁白、音频响应式视觉效果和场景转场。当需要构建任何基于 HTML 的视频内容、添加与音频同步的字幕或副标题、生成文字转语音旁白、创建音频响应式动画（节拍同步、发光、脉冲跟随音乐）、添加动态文字高亮（标记扫描、手绘圆圈、爆发线、涂鸦、勾勒），或添加场景间转场（交叉淡入淡出、擦除、揭示、着色器转场）时使用。涵盖合成创作、时序、媒体和完整视频制作工作流。CLI 开发循环命令（init、lint、inspect、preview、render）请参阅 hyperframes-cli 技能；资源预处理命令（tts、transcribe、remove-background）请参阅 hyperframes-media 技能。
---

# HyperFrames

HTML 是视频的单一事实来源。合成是一个带有 `data-*` 属性进行时序控制的 HTML 文件，使用 GSAP 时间线进行动画，CSS 负责外观。框架处理剪辑可见性、媒体播放和时间线同步。

## 方法

### 发现阶段（仅探索性请求）

对于开放式请求（"帮我做一个产品发布视频"、"为我们的品牌创作一些内容"），在用户尚未确定方向时，在选择颜色之前先理解意图：

- **受众** — 谁看这个视频？开发者？高管？普通消费者？
- **平台** — 在哪里播放？社交媒体（15秒）、网站首页、产品演示、内部使用？
- **优先级** — 什么最重要？动效质量？内容准确性？品牌一致性？速度？
- **变体** — 用户需要多个选项，还是单个最佳方案？

对于明确的请求（"添加一个标题卡片"、"修复场景3的时序"），跳过发现阶段。

对于探索性请求，考虑提供 2-3 个有实质差异的变体 — 不仅仅是颜色替换，而是不同的节奏、能量级别或结构方法。一个稳妥/预期方向，一个大胆方向。这不是强制的 — 只是在合适时可用的工具。

### 步骤 1：设计系统

如果项目中存在 `design.md` 或 `DESIGN.md`，先读取它（检查两种大小写 — 它们在 Linux 上是不同的文件）。它是品牌颜色、字体和约束条件的事实来源。使用其精确值 — 不要自创颜色或替换字体。任意格式均支持（YAML frontmatter、散文、表格 — 只需提取数值）。

如果它指定了本地找不到的字体（没有 `fonts/` 目录包含 `.woff2` 文件，也不是内置字体），在编写 HTML 之前警告用户："design.md 指定了 [字体名称] 但未找到字体文件。请将 .woff2 文件添加到 `fonts/`，否则我将回退到 [最接近的内置替代字体]。"

如果没有 `design.md`，让用户选择以下方式之一：

1. **用户指定了风格或氛围？** → 阅读 [visual-styles.md](./visual-styles.md) 了解 8 个命名预设。选择最匹配的。
2. **想浏览可视化选项？** → 运行设计选择器：阅读 [references/design-picker.md](references/design-picker.md) 了解完整工作流。这会启动一个可视化选择器页面。用户在浏览器中配置氛围、调色板、字体和动效，然后复制生成的 design.md 并粘贴回对话中。
3. **想跳过快速开始？** → 询问：氛围、浅色还是深色、是否有品牌颜色/字体？然后从 [house-style.md](./house-style.md) 中选择调色板。

**design.md 定义品牌，不定义视频合成规则。** 视频合成规则来自 [references/video-composition.md](references/video-composition.md) 和 [house-style.md](./house-style.md)。以适合视频的比例使用品牌颜色 — 而不是 Web UI 的不透明度。

### 步骤 2：提示词扩展

始终在每个合成上运行（单场景片段和简单编辑除外）。此步骤将用户意图与 `design.md` 和 `house-style.md` 对齐，并生成一致的中间产物，使每个下游代理以相同方式读取。

阅读 [references/prompt-expansion.md](references/prompt-expansion.md) 了解完整流程和输出格式。

### 步骤 3：规划

在编写 HTML 之前，从高层思考：

1. **什么** — 观众应该体验什么？识别叙事弧、关键时刻和情感节拍。
2. **结构** — 几个合成，哪些是子合成哪些是内联的，哪些轨道承载什么（视频、音频、叠加层、字幕）。
3. **节奏** — 在实现之前声明场景节奏。哪些场景是快速切换，哪些是停顿，着色器落在哪里，能量峰值在哪里。命名模式：fast-fast-SLOW-fast-SHADER-hold。阅读 [references/beat-direction.md](references/beat-direction.md) 了解节奏模板。
4. **时序** — 哪些剪辑决定时长，转场落在哪里，节奏是什么。
5. **布局** — 先构建结束状态。详见下方"先布局后动画"。
6. **动画** — 然后使用下方规则添加动效。

**构建所请求的内容。** "一个标题卡片"的请求不是"一个标题卡片 + 3个辅助场景 + 环境音乐 + 字幕"的请求。每个场景、每个元素、每个缓动动画都应有存在的理由。如果额外的场景或元素确实能改善作品，提出建议 — 不要直接添加。

对于小修改（修复颜色、调整时序、添加一个元素），直接跳到规则部分。

<HARD-GATE>
在编写任何合成 HTML 之前 — 确认你已从步骤 1 获得了视觉标识。如果你正在使用 `#333`、`#3b82f6` 或 `Roboto`，说明你跳过了步骤 1。
</HARD-GATE>

## 先布局后动画

将每个元素定位在其**最可见时刻**应处的位置 — 即它完全进入、正确放置且尚未开始退出的那一帧。先以静态 HTML+CSS 编写。暂不使用 GSAP。

**为什么这很重要：** 如果你在动画起始状态（屏幕外、缩放到 0、不透明度 0）定位元素，然后缓动到你认为它们应该到达的位置，你就是在猜测最终布局。重叠问题在视频渲染之前是不可见的。通过先构建结束状态，你可以在添加任何动效之前看到并修复布局问题。

### 流程

1. **识别每个场景的英雄帧** — 最多元素同时可见的时刻。这是你要构建的布局。
2. **为该帧编写静态 CSS**。`.scene-content` 容器必须使用 `width: 100%; height: 100%; padding: Npx;` 填满整个场景，配合 `display: flex; flex-direction: column; gap: Npx; box-sizing: border-box`。使用 padding 将内容向内推 — 永远不要在内容容器上使用 `position: absolute; top: Npx`。绝对定位的内容容器在内容超出剩余空间时会溢出。仅为装饰元素保留 `position: absolute`。
3. **使用 `gsap.from()` 添加入场动画** — 从屏幕外/不可见动画过渡到 CSS 位置。CSS 位置是基准事实；缓动描述到达该位置的旅程。（在通过 `data-composition-src` 加载的子合成中，优先使用 `gsap.fromTo()` — 参见 [references/motion-principles.md](references/motion-principles.md) 中的关键 GSAP 规则。）
4. **使用 `gsap.to()` 添加退场动画** — 从 CSS 位置动画过渡到屏幕外/不可见。

### 示例

```css
/* scene-content 填满场景，padding 定位内容 */
.scene-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 120px 160px;
  gap: 24px;
  box-sizing: border-box;
}
.title {
  font-size: 120px;
}
.subtitle {
  font-size: 42px;
}
/* 容器适配任何场景尺寸（1920x1080、1080x1920 等）。
   Padding 定位内容。Flex + gap 处理间距。 */
```

**错误 — 硬编码尺寸和绝对定位：**

```css
.scene-content {
  position: absolute;
  top: 200px;
  left: 160px;
  width: 1920px;
  height: 1080px;
  display: flex; /* ... */
}
```

```js
// 步骤 3：动画过渡到这些位置
tl.from(".title", { y: 60, opacity: 0, duration: 0.6, ease: "power3.out" }, 0);
tl.from(".subtitle", { y: 40, opacity: 0, duration: 0.5, ease: "power3.out" }, 0.2);
tl.from(".logo", { scale: 0.8, opacity: 0, duration: 0.4, ease: "power2.out" }, 0.3);

// 步骤 4：从这些位置动画离开
tl.to(".title", { y: -40, opacity: 0, duration: 0.4, ease: "power2.in" }, 3);
tl.to(".subtitle", { y: -30, opacity: 0, duration: 0.3, ease: "power2.in" }, 3.1);
tl.to(".logo", { scale: 0.9, opacity: 0, duration: 0.3, ease: "power2.in" }, 3.2);
```

### 当元素在时间上共享空间

如果元素 A 在元素 B 进入之前退出了同一区域，两者应在其各自的英雄帧中具有正确的 CSS 位置。时间线顺序保证它们永远不会在视觉上共存 — 但如果你跳过布局步骤，你将无法发现它们因时序错误而意外重叠的情况。

### 什么算有意的重叠

分层效果（文字后的发光、阴影元素、背景图案）和 z 轴堆叠设计（卡片堆叠、深度层）是有意的。布局步骤是为了捕获**无意的**重叠 — 两个标题叠在一起、统计数字覆盖标签、内容溢出画面边界。

## Data 属性

### 所有剪辑

| 属性 | 必需 | 值 |
| ------------------ | ------------------------------- | ------------------------------------------------------ |
| `id` | 是 | 唯一标识符 |
| `data-start` | 是 | 秒数或剪辑 ID 引用（`"el-1"`、`"intro + 2"`） |
| `data-duration` | img/div/compositions 必需 | 秒数。视频/音频默认为媒体时长。 |
| `data-track-index` | 是 | 整数。同一轨道的剪辑不能重叠。 |
| `data-media-start` | 否 | 源文件裁剪偏移量（秒） |
| `data-volume` | 否 | 0-1（默认 1） |

`data-track-index` **不影响**视觉分层 — 使用 CSS `z-index`。

### 合成剪辑

| 属性 | 必需 | 值 |
| ---------------------------- | -------- | ----------------------------------------------------------------- |
| `data-composition-id` | 是 | 唯一合成 ID |
| `data-start` | 是 | 开始时间（根合成：使用 `"0"`） |
| `data-duration` | 是 | 优先于 GSAP 时间线时长 |
| `data-width` / `data-height` | 是 | 像素尺寸（1920x1080 或 1080x1920） |
| `data-composition-src` | 否 | 外部 HTML 文件路径 |
| `data-variable-values` | 否 | 子合成宿主上每个实例的变量覆盖值 JSON 对象 |

在根 `<html>` 元素上：

| 属性 | 必需 | 值 |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `data-composition-variables` | 否 | 已声明变量的 JSON 数组（id/type/label/default） — 驱动 Studio 编辑 UI 并为 `getVariables()` 提供默认值 |

## 合成结构

通过 `data-composition-src` 加载的子合成使用 `<template>` 包装。**独立合成（主 index.html）不要使用 `<template>`** — 它们将 `data-composition-id` div 直接放在 `<body>` 中。在独立文件上使用 `<template>` 会从浏览器隐藏所有内容并破坏渲染。

子合成结构：

```html
<template id="my-comp-template">
  <div data-composition-id="my-comp" data-width="1920" data-height="1080">
    <!-- 内容 -->
    <style>
      [data-composition-id="my-comp"] {
        /* 作用域样式 */
      }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      // 缓动动画...
      window.__timelines["my-comp"] = tl;
    </script>
  </div>
</template>
```

在根中加载：`<div id="el-1" data-composition-id="my-comp" data-composition-src="compositions/my-comp.html" data-start="0" data-duration="10" data-track-index="1"></div>`

## 变量（参数化合片）

使用不同内容渲染同一个合片 — 标题、主题颜色、价格、字幕 — 无需编辑源 HTML。

**三步模式：**

1. **声明**变量在合片的 `<html>` 根元素上使用 `data-composition-variables`。每个条目需要 `id`、`type`（`string`、`number`、`color`、`boolean`、`enum` 之一）、`label` 和 `default`。枚举条目还需要 `options: [{value, label}, ...]`。
2. **读取**合片脚本内已解析的值使用 `window.__hyperframes.getVariables()`。返回声明默认值 + 每个实例覆盖值 + CLI 覆盖值的合并结果。
3. **覆盖**在渲染时使用 `npx hyperframes render --variables '{...}'`（顶层）或在宿主元素上使用 `data-variable-values='{...}'`（子合片的每个实例）。

```html
<!doctype html>
<html
  data-composition-variables='[
  {"id":"title","type":"string","label":"Title","default":"Hello"},
  {"id":"theme","type":"enum","label":"Theme","default":"light","options":[
    {"value":"light","label":"Light"},
    {"value":"dark","label":"Dark"}
  ]}
]'
>
  <body>
    <div data-composition-id="root" data-width="1920" data-height="1080">
      <h1 id="hero" class="clip" data-start="0" data-duration="3"></h1>
      <script>
        const { title, theme } = window.__hyperframes.getVariables();
        document.getElementById("hero").textContent = title;
        document.body.dataset.theme = theme;
      </script>
    </div>
  </body>
</html>
```

```bash
# 开发预览使用声明的默认值
npx hyperframes preview

# 渲染时覆盖
npx hyperframes render --variables '{"title":"Q4 Report","theme":"dark"}' --output q4.mp4

# 或从 JSON 文件
npx hyperframes render --variables-file ./vars.json
```

**子合片每个实例的值：** 相同的 `getVariables()` 在通过 `data-composition-src` 加载的子合片内部有效。每个宿主元素传递自己的值：

```html
<div
  data-composition-id="card-pro"
  data-composition-src="compositions/card.html"
  data-variable-values='{"title":"Pro","price":"$29"}'
></div>
<div
  data-composition-id="card-enterprise"
  data-composition-src="compositions/card.html"
  data-variable-values='{"title":"Enterprise","price":"Custom"}'
></div>
```

运行时在每个实例基础上将每个宿主的 `data-variable-values` 叠加到子合片的声明默认值上，因此同一源可以被多次嵌入并具有不同内容。

**经验法则：**

- 始终为每个声明的变量提供合理的 `default`。开发预览使用默认值 — 没有默认值，合片在提供 `--variables` 之前无法正确渲染。
- 在脚本顶部一次性读取变量（`const { title } = ...`），不要在帧循环或事件处理器中读取 — `getVariables()` 每次调用都会分配新对象。
- 在 CI 中使用 `--strict-variables` 来快速失败，检查未声明的键或类型不匹配。
- 变量类型在渲染时验证。`string`、`number`、`boolean` 和 `color`（十六进制字符串）检查 `typeof`；`enum` 检查值是否在声明的 `options` 中。

## 视频和音频

视频必须 `muted playsinline`。音频始终是单独的 `<audio>` 元素：

```html
<video
  id="el-v"
  data-start="0"
  data-duration="30"
  data-track-index="0"
  src="video.mp4"
  muted
  playsinline
></video>
<audio
  id="el-a"
  data-start="0"
  data-duration="30"
  data-track-index="2"
  src="video.mp4"
  data-volume="1"
></audio>
```

## 时间线契约

- 所有时间线以 `{ paused: true }` 开始 — 播放器控制播放
- 注册每个时间线：`window.__timelines["<composition-id>"] = tl`
- 框架自动嵌套子时间线 — 不要手动添加它们
- 时长来自 `data-duration`，而非 GSAP 时间线长度
- 永远不要创建空缓动来设置时长

## 规则（不可协商）

**确定性：** 禁止 `Math.random()`、`Date.now()` 或基于时间的逻辑。如需伪随机值，使用种子 PRNG（如 mulberry32）。

**GSAP：** 仅动画视觉属性（`opacity`、`x`、`y`、`scale`、`rotation`、`color`、`backgroundColor`、`borderRadius`、transforms）。禁止动画化 `visibility`、`display`，或调用 `video.play()`/`audio.play()`。

**动画冲突：** 永远不要同时从多个时间线动画化同一元素的同一属性。

**禁止 `repeat: -1`：** 无限重复时间线会破坏捕获引擎。根据合片时长计算精确重复次数：`repeat: Math.ceil(duration / cycleDuration) - 1`。

**同步时间线构建：** 永远不要在 `async`/`await`、`setTimeout` 或 Promises 中构建时间线。捕获引擎在页面加载后同步读取 `window.__timelines`。字体由编译器嵌入，因此立即可用 — 无需等待字体加载。

**永远不要做：**

1. 忘记 `window.__timelines` 注册
2. 用 video 处理音频 — 始终静音 video + 单独的 `<audio>`
3. 将 video 嵌套在定时的 div 内 — 使用非定时的包装器
4. 使用 `data-layer`（用 `data-track-index`）或 `data-end`（用 `data-duration`）
5. 动画化 video 元素尺寸 — 动画化包装 div
6. 在媒体上调用 play/pause/seek — 框架掌控播放
7. 创建没有 `data-composition-id` 的顶层容器
8. 在任何时间线或缓动上使用 `repeat: -1` — 始终有限重复
9. 异步构建时间线（在 `async`、`setTimeout`、`Promise` 中）
10. 对后续场景的剪辑元素使用 `gsap.set()` — 它们在页面加载时不存在于 DOM 中。改为在时间线内、在剪辑的 `data-start` 时间位置或之后使用 `tl.set(selector, vars, timePosition)`。
11. 在内容文本中使用 `<br>` — 强制换行不考虑实际渲染的字体宽度。自然换行的文本 + `<br>` 会产生额外的意外换行，导致重叠。改为通过 `max-width` 让文本换行。例外：短标题文字中每个词故意独占一行（例如 130px 的 "THE\nIMMORTAL\nGAME"）。

## 场景转场（不可协商）

每个多场景合成必须遵循以下所有规则。违反其中任何一条都是损坏的合成。

1. **始终在场景之间使用转场。** 禁止跳切。无例外。
2. **始终在每个场景上使用入场动画。** 每个元素通过 `gsap.from()` 动画入场。任何元素都不能以完全形态出现。如果一个场景有 5 个元素，就需要 5 个入场缓动。
3. **除最终场景外，永远不要使用退场动画。** 这意味着：在转场触发之前，不能有 `gsap.to()` 将不透明度动画到 0、y 轴离开屏幕、缩放到 0，或任何其他"出场"动画。转场本身就是退场。离开场景的内容在转场开始时必须完全可见。
4. **仅最终场景：** 最后一个场景可以将元素淡出（例如，淡入黑色）。这是唯一允许 `gsap.to(..., { opacity: 0 })` 的场景。

**错误 — 转场前的退场动画：**

```js
// 禁止 — 这在转场可以利用场景之前就清空了它
tl.to("#s1-title", { opacity: 0, y: -40, duration: 0.4 }, 6.5);
tl.to("#s1-subtitle", { opacity: 0, duration: 0.3 }, 6.7);
// 转场在空帧上触发
```

**正确 — 仅入场，转场处理退场：**

```js
// 场景 1 入场动画
tl.from("#s1-title", { y: 50, opacity: 0, duration: 0.7, ease: "power3.out" }, 0.3);
tl.from("#s1-subtitle", { y: 30, opacity: 0, duration: 0.5, ease: "power2.out" }, 0.6);
// 没有退场缓动 — 7.2 秒处的转场处理场景切换
// 场景 2 入场动画
tl.from("#s2-heading", { x: -40, opacity: 0, duration: 0.6, ease: "expo.out" }, 8.0);
```

## 动画护栏

- 第一个动画偏移 0.1-0.3 秒（不是 t=0）
- 在入场缓动中变化缓动曲线 — 每个场景至少使用 3 种不同的缓动
- 不要在场景内重复入场模式
- 避免在深色背景上使用全屏线性渐变（H.264 条带效应 — 使用径向或纯色 + 局部发光）
- 渲染视频中标题 60px+，正文 20px+，数据标签 16px+
- 数字列使用 `font-variant-numeric: tabular-nums`

如果没有 `design.md`，遵循 [house-style.md](./house-style.md) 的审美默认值。

## 字体和资源

- **内置字体：** 在 CSS 中编写你想要的 `font-family` — 编译器会自动嵌入支持的字体。
- **自定义字体：** 如果 design.md 指定了非内置字体，用户必须在 `fonts/` 目录中提供 `.woff2` 文件。如果缺失，在编写 HTML 之前警告。当文件存在时，添加指向本地文件的 `@font-face` 声明。
- 为外部媒体添加 `crossorigin="anonymous"`
- 对于动态文本溢出，使用 `window.__hyperframes.fitTextFontSize(text, { maxWidth, fontFamily, fontWeight })`
- 所有文件位于项目根目录，与 `index.html` 同级；子合成使用 `../`

## 编辑现有合成

- **读取实际文件，不要猜测。** 在编辑、扩展或创建配套合成时，读取现有源文件。不要从记忆中重构十六进制颜色代码。不要猜测 GSAP 缓动模式。合成本身就是规范 — 从中提取精确值。
- 匹配所读取的现有字体、颜色、动画模式
- 仅更改所请求的内容
- 保持无关剪辑的时序

## 输出检查清单

**快速（立即运行，阻塞等待结果）：**

- [ ] `npx hyperframes lint` 和 `npx hyperframes validate` 均通过
- [ ] 如果 design.md 存在，验证设计一致性

**慢速（在向用户展示预览时并行运行）：**

- [ ] `npx hyperframes inspect` 通过，或每个报告的溢出都是有意的并已标记
- [ ] 对比度警告已处理（见下方质量检查）
- [ ] 动画编排已验证（见下方质量检查）

## 质量检查

### 可视化检查

`hyperframes inspect` 在无头 Chrome 中运行合成，遍历时间线，并映射带有时间戳、选择器、边界框和修复提示的视觉布局问题。在 `lint` 和 `validate` 之后运行：

```bash
npx hyperframes inspect
npx hyperframes inspect --json
```

失败通常意味着文本溢出了气泡/卡片、固定尺寸的标签裁切了动态文案，或文本移出了画布。通过增大容器尺寸或 padding、减小字体大小或字距、添加实际的 `max-width` 使文本在容器内换行，或对动态文案使用 `window.__hyperframes.fitTextFontSize(...)` 来修复。

对于密集视频使用 `--samples 15`，对于特定英雄帧使用 `--at 1.5,4,7.25`。重复的静态问题默认折叠以避免淹没代理上下文。如果溢出是入场/退场动画的有意行为，用 `data-layout-allow-overflow` 标记元素或祖先元素。如果装饰元素永远不应被审计，用 `data-layout-ignore` 标记它。

`hyperframes layout` 是相同检查的兼容别名。

### 对比度

`hyperframes validate` 默认运行 WCAG 对比度审计。它在 5 个时间戳处定位，截图页面，采样每个文本元素背后的背景像素，并计算对比度比率。失败以警告形式出现：

```
⚠ WCAG AA contrast warnings (3):
  · .subtitle "secondary text" — 2.67:1 (need 4.5:1, t=5.3s)
```

如果出现警告：

- 深色背景：调亮失败的颜色直到达到 4.5:1（普通文本）或 3:1（大文本，24px+ 或 19px+ 加粗）
- 浅色背景：调暗它
- 保持在调色板色系内 — 不要发明新颜色，调整现有颜色
- 重新运行 `hyperframes validate` 直到干净

如果快速迭代，稍后再检查，使用 `--no-contrast` 跳过。

### 设计一致性

如果存在 `design.md`，在创作后验证合成是否遵循它。读取 HTML 并检查：

1. **颜色** — 合成中的每个十六进制值都出现在 design.md 的调色板部分（无论用户如何标记：Colors、Palette、Theme 等）。标记任何自创的颜色。
2. **字体** — 字体族和字重匹配 design.md 的字体规范。无替换。
3. **圆角** — border-radius 值匹配声明的圆角风格（如果指定）。
4. **间距** — padding 和 gap 值在声明的密度范围内（如果指定）。
5. **深度** — 阴影使用匹配声明的深度级别（如果指定：flat = 无，subtle = 轻，layered = 发光）。
6. **避免规则** — 如果 design.md 有列出应避免事项的部分（通常是 "What NOT to Do"、"Don'ts"、"Anti-patterns" 或 "Do's and Don'ts"），验证没有出现这些情况。

将违规情况报告为检查清单。在交付之前逐一修复。

如果没有 `design.md`（仅 house-style 路径），验证：

1. **调色板一致性** — 所有场景使用相同的 bg、fg 和强调色。无每场景的颜色发明。
2. **无懒惰默认值** — 对照 house-style.md 的"需要质疑的懒惰默认值"列表检查合成。如果出现任何项，它们必须是对内容的刻意选择，而非默认值。

### 动画地图

在创作动画后，运行动画地图验证编排：

```bash
node skills/hyperframes/scripts/animation-map.mjs <composition-dir> \
  --out <composition-dir>/.hyperframes/anim-map
```

输出单个 `animation-map.json`，包含：

- **每个缓动的摘要**：`"#card1 animates opacity+y over 0.50s. moves 23px up. fades in. ends at (120, 200)"`
- **ASCII 时间线**：合成时长内所有缓动的甘特图
- **交错检测**：报告实际间隔（`"3 elements stagger at 120ms"`）
- **死区**：超过 1 秒无动画的时段 — 有意的停顿还是缺失的入场？
- **元素生命周期**：首次/最后动画时间，最终可见性
- **场景快照**：5 个关键时间戳的可见元素状态
- **标志**：`offscreen`、`collision`、`invisible`、`paced-fast`（低于 0.2 秒）、`paced-slow`（超过 2 秒）

读取 JSON。扫描摘要中的意外情况。检查每个标志 — 修复或说明理由。验证时间线显示预期的编排节奏。修复后重新运行。

小修改（修复颜色、调整一个时长）跳过。新合成和重大动画更改时运行。

---

## 参考资料（按需加载）

- **[references/captions.md](references/captions.md)** — 字幕、副标题、歌词、与音频同步的卡拉 OK。音调自适应风格检测、每词样式、文本溢出预防、字幕退出保证、词分组。当添加与音频时序同步的任何文本时阅读。
- **[references/audio-reactive.md](references/audio-reactive.md)** — 音频响应式动画：将频带和振幅映射到 GSAP 属性。当视觉效果应响应音乐、人声或声音时阅读。
- **[references/css-patterns.md](references/css-patterns.md)** — CSS+GSAP 标记高亮：高亮、圆圈、爆发、涂鸦、勾勒。确定性，完全可定位。当添加文本视觉强调时阅读。
- **[references/video-composition.md](references/video-composition.md)** — 视频媒介规则：密度、颜色存在感、缩放、帧构图，design.md 作为品牌而非布局。**始终阅读** — 这些覆盖 Web 思维惯性。
- **[references/beat-direction.md](references/beat-direction.md)** — 节拍规划：概念、氛围、编排动词、节奏模板、转场决策、深度层。**多场景合成始终阅读。**
- **[references/typography.md](references/typography.md)** — 字体排印：字体配对、OpenType 特性、深色背景调整、字体发现脚本。**始终阅读** — 每个合成都包含文本。
- **[references/motion-principles.md](references/motion-principles.md)** — 动效设计原则、图像动效处理、关键 GSAP 规则。**始终阅读** — 每个合成都包含动效。
- **[references/techniques.md](references/techniques.md)** — 11 种视觉技术及代码模式：SVG 绘制、Canvas 2D、CSS 3D、动态字体、Lottie、视频合成、打字效果、可变字体、MotionPath、速度转场、音频响应式。当按节拍规划技术时阅读。
- **[references/narration.md](references/narration.md)** — 节奏、语气、脚本结构、数字发音、开场句模式。当合成包含旁白或 TTS 时阅读。
- **[references/design-picker.md](references/design-picker.md)** — 通过可视化选择器创建 design.md。当没有 design.md 且用户想创建一个时阅读。
- **[visual-styles.md](visual-styles.md)** — 8 种命名视觉风格，包含十六进制调色板、GSAP 缓动签名和着色器配对。当用户指定风格或生成 design.md 时阅读。
- **[house-style.md](house-style.md)** — 当未指定 design.md 时的默认动效、尺寸和颜色调色板。
- **[patterns.md](patterns.md)** — 画中画、标题卡片、幻灯片模式。
- **[data-in-motion.md](data-in-motion.md)** — 数据、统计和信息图模式。
- **[references/transcript-guide.md](references/transcript-guide.md)** — 字幕侧转录处理：输入格式、强制质量检查、清洗 JS、OpenAI/Groq API 回退、"如果不存在转录"流程。（关于 `transcribe` CLI 调用、模型选择规则和 `.en` 陷阱，请参阅 `hyperframes-media` 技能。）
- **[references/dynamic-techniques.md](references/dynamic-techniques.md)** — 动态字幕动画技术（卡拉 OK、clip-path、slam、scatter、elastic、3D）。

- **[references/transitions.md](references/transitions.md)** — 场景转场：交叉淡入淡出、擦除、揭示、着色器转场。能量/氛围选择，CSS vs WebGL 指导。**多场景合成始终阅读** — 没有转场的场景感觉像跳切。
  - [transitions/catalog.md](references/transitions/catalog.md) — 硬性规则、场景模板和按类型实现的代码路由。
  - 着色器转场位于 `@hyperframes/shader-transitions`（`packages/shader-transitions/`）— 阅读包源代码，而非技能文件。

GSAP 模式和效果在 `/gsap` 技能中。
