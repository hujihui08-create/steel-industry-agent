---
name: remotion-to-hyperframes
description: 将现有的 Remotion（基于 React）视频合成翻译为 HyperFrames HTML 合成。仅在用户明确要求将 Remotion 合成移植、转换、迁移、翻译或重写为 HyperFrames 时使用（例如"把我的 Remotion 项目移植到 HyperFrames"）。以下情况请不要使用：(a) 创作新的 HyperFrames 合成（即使是在 A/B 测试 Remotion 视频）；(b) Remotion 只是顺带提及；(c) Remotion 代码作为参考共享，而非要求翻译；(d) 用户想要"和我的 Remotion 一样的视频"但未明确要求迁移源代码 — 将其视为全新的 HyperFrames 构建。如有疑问，默认使用 `hyperframes` 技能。检测不支持的模式（useState、useEffect 副作用、async calculateMetadata、第三方 React 组件库、`@remotion/lambda`），并推荐运行时互操作逃生通道，而非进行有损翻译。
---

# Remotion 到 HyperFrames

## 概述

将 Remotion（基于 React）视频合成翻译为 HyperFrames（HTML + GSAP）合成。大多数 Remotion 惯用法有直接的 HyperFrames 等价物 — 对约 80% 的典型合成来说，翻译是机械式的。本技能编码了映射关系，并通过拒绝翻译不适合 HF seek 驱动模型的模式并推荐 [PR #214](https://github.com/heygen-com/hyperframes/pull/214) 的运行时互操作模式来防范有损的 20%。

本技能附带一个**分级测试语料库**（T1–T4，共 4 个 fixtures），根据测量的 SSIM 阈值对翻译进行评分。不要在没有运行评估的情况下翻译 — 一个"看起来正确"但比验证基线低 0.05 SSIM 的翻译是悄然错误的。

## 何时使用

**仅在用户明确要求从 Remotion 迁移时使用本技能。** 触发短语示例：

- "把我的 Remotion 项目移植到 HyperFrames"
- "将这个 Remotion 代码转换为 HyperFrames"
- "从 Remotion 迁移"
- "翻译这个 Remotion 合成"
- "将其重写为 HyperFrames HTML"

**以下情况请不要使用本技能：**

- (a) 用户正在创作一个**新的** HyperFrames 合成，即使他们有或在 A/B 测试类似的 Remotion 视频。
- (b) 用户顺带提及 Remotion 但未要求迁移。
- (c) 用户分享 Remotion 代码作为参考材料而非要求翻译。
- (d) 用户要求"和我的 Remotion 一样的视频"但未明确要求迁移源代码 — 将其视为全新的 HyperFrames 构建。

如有疑问，默认使用 `hyperframes` 技能创作原生 HyperFrames 合成。

## 工作流程

### 步骤 1：Lint 源代码

在 Remotion 源代码目录上运行 [`scripts/lint_source.py`](scripts/lint_source.py)。Lint 检测无法干净翻译的模式：

- **阻断项**（拒绝并推荐互操作）：`useState`、`useReducer`、带非空依赖的 `useEffect`/`useLayoutEffect`、async `calculateMetadata`、第三方 React UI 库（MUI、Chakra、Mantine、antd、shadcn、Radix、NextUI）。
- **警告**（丢弃该结构后翻译）：`@remotion/lambda` 配置、`delayRender`、`useCallback`、`useMemo`、自定义 hooks。
- **信息**（翻译并注明）：`staticFile`、`interpolateColors`。

如果任何阻断项触发，**停止**。阅读 [`references/escape-hatch.md`](references/escape-hatch.md) 并呈现推荐消息。警告不会阻止翻译 — 在步骤 3 中丢弃违规结构并在 `TRANSLATION_NOTES.md` 中注明差距。`@remotion/lambda` 配置是典型的警告情况：本技能丢弃 import 和 `renderMediaOnLambda(...)` 调用，但翻译合成的其余部分。

### 步骤 2：规划翻译

阅读 [`references/api-map.md`](references/api-map.md) — 每个 Remotion API 及其 HF 等价物或按主题参考的索引。根据源代码使用的内容确定需要哪些主题参考：

| 源代码包含 | 加载的参考 |
| ------------------------------------------------------------------------- | --------------------------------------------- |
| `Composition`、`defaultProps`、`schema`、`calculateMetadata` | [`parameters.md`](references/parameters.md) |
| `Sequence`、`Series`、`Loop`、`AbsoluteFill`、`Freeze` | [`sequencing.md`](references/sequencing.md) |
| `useCurrentFrame`、`interpolate`、`spring`、`Easing`、`interpolateColors` | [`timing.md`](references/timing.md) |
| `Audio`、`Video`、`Img`、`IFrame`、`staticFile`、`delayRender` | [`media.md`](references/media.md) |
| `TransitionSeries`、`@remotion/transitions` | [`transitions.md`](references/transitions.md) |
| `@remotion/lottie` | [`lottie.md`](references/lottie.md) |
| `@remotion/google-fonts/<Family>`、`Font.loadFont`、`@font-face` | [`fonts.md`](references/fonts.md) |

不要全部加载 — 仅加载特定源代码需要的。

### 步骤 3：生成 HF 合成

生成带有以下内容的 `index.html`：

- 根 `<div id="stage">` 携带合成的 `data-composition-id`、`data-start="0"`、`data-duration`（秒）、`data-fps`、`data-width`、`data-height`，以及每个标量 prop 的 `data-*`。
- 带 `data-start` / `data-duration` / `data-track-index` 的扁平场景 div 列表。
- 内联 `<style>` 用于布局；CSS 设置每个动画属性的 `from` 状态。
- 底部单个 `<script>` 标签，包含一个暂停的 `gsap.timeline({paused: true})`。每个 Remotion `useCurrentFrame()` 派生变为此时间线上正确偏移处的缓动。
- `window.__timelines["<composition-id>"] = tl;` 将时间线注册到 HF 运行时。

自定义 React 子组件内联为重复的 HTML，使用 prop 接口作为模板（参见 [`parameters.md`](references/parameters.md) 了解每个实例的 `data-*` 模式）。

### 步骤 4：验证

运行评估工具 — [`references/eval.md`](references/eval.md) 获取完整指南。快速路径：

```bash
# 渲染 Remotion 基线（在 fixture 中 npm install 之后）
cd remotion-src && npx remotion render <CompositionId> out/baseline.mp4

# 渲染 HF 翻译
cd ../hf-src && npx hyperframes render --output ../hf.mp4

# SSIM 差异比较
../../scripts/render_diff.sh ./remotion-src/out/baseline.mp4 ./hf.mp4 ./diff
```

阈值：低于源文件复杂度等级 `p05` 约 0.02（参见 `eval.md` 的已验证阈值表）。如果差异未通过，运行 [`scripts/frame_strip.sh`](scripts/frame_strip.sh) 查看哪些帧出现了差异，然后重新阅读相关的时序/排序/媒体参考。

**关键**：两个渲染必须使用匹配的像素格式。在 Remotion 源文件的 `remotion.config.ts` 中设置 `Config.setVideoImageFormat("png")` + `Config.setColorSpace("bt709")` — 否则差异测量的是编码器差异（约 0.05 SSIM 损失），而非翻译保真度。

### 步骤 5：记录差距

任何未干净翻译的内容（音量渐变被丢弃、自定义呈现被近似处理、字体被替换）都应编写 `TRANSLATION_NOTES.md` 放在 HF 输出旁边。格式参见 [`references/limitations.md`](references/limitations.md)。

## 本技能明确不做的事情

- **翻译 React 状态机。** 通过 `useState` + `useEffect` 驱动动画的合成在 HyperFrames 的 seek 驱动模型中不是确定性帧捕获目标。推荐运行时互操作模式。
- **与 HyperFrames 并行运行 Remotion 的渲染管线。** 这是 [PR #214](https://github.com/heygen-com/hyperframes/pull/214) 中的运行时互操作模式 — 针对本技能 lint 失败的合成的独立解决方案。

（`@remotion/lambda` 不是阻断项 — Lambda 配置属于部署，不属于动画。本技能将其作为警告丢弃并翻译其余部分。参见 [`references/escape-hatch.md`](references/escape-hatch.md)。）

## 如何评分你自己的翻译

运行测试语料库编排器：

```bash
./assets/test-corpus/run.sh
```

它运行 T1、T2、T3（渲染 + 差异）和 T4（lint 验证），打印每个等级的通过/失败表，并输出一个聚合 JSON 报告。使用它来验证技能在干净的检出上端到端工作 — 并在编辑任何参考文档后作为回归检查。

已验证基线（截至 2026-04-27）：

| 等级 | 合成形态 | 平均 SSIM | 阈值 |
| ---- | ------------------------------------------- | --------- | --------- |
| T1   | 单元素淡入 | 0.974     | 0.95      |
| T2   | 多场景 + spring + 音频 + 图片 | 0.985     | 0.95      |
| T3   | 数据驱动、自定义子组件、计数动画 | 0.953     | 0.90      |
| T4   | escape-hatch（8 个 lint 用例） | 8/8 通过  | 不适用    |