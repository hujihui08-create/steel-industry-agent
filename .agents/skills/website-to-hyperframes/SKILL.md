---
name: website-to-hyperframes
description: |
  捕获网站并从中创建 HyperFrames 视频。当以下情况时使用：(1) 用户提供 URL 并想要一个视频；(2) 有人说"捕获这个网站"、"把它变成视频"、"用我的网站做一个宣传片"；(3) 用户想要社交媒体广告、产品导览或任何基于现有网站的视频；(4) 用户分享链接并要求任何类型的视频内容。即使用户只是粘贴了一个 URL 也应使用本技能。
---

# Website to HyperFrames

捕获网站，然后从中制作专业视频。

用户通常会这样说：

- "捕获 https://... 并帮我做一个 25 秒的产品发布视频"
- "把这个网站变成一个 15 秒的 Instagram 社交媒体广告"
- "从 https://... 创建一个 30 秒的产品导览"

工作流程共 7 个步骤。每个步骤产出一个工件，作为下一个步骤的门禁。默认是协作模式 — 标有 💬 的门禁会停下来询问用户。如果用户表明自主模式（"帮我决定"、"给我惊喜"），💬 用户偏好门禁将被跳过；关于如何传播这些决策，请参阅 step-2-brief.md。

**自主模式不是"跳过所有门禁"。** 自动模式涵盖用户偏好问题（TTS 提供商、语音、颜色强调、节拍数量、是否需要音乐、是否需要字幕 — 这些由代理代表用户决定）。它不包括质量验证门禁。以下内容在自动模式下仍然不可跳过：

- 资源审计（步骤 3）— 查看联系表并为每个资源说明 USE/SKIP 的理由
- 每个节拍的 HTML 读取（步骤 5）— 每个节拍的结构化证据块
- DoD 检查清单（步骤 6）— 包括动画地图、每项警告的 WCAG 验证、音频/动效回放
- 诚实披露部分（步骤 6）— 你的最终摘要中必须出现"我未验证的内容"

如果你发现自己推理"自动模式说偏向行动，所以我要跳过 X" — 而 X 是一个验证门禁而非偏好问题 — 这个推理是错误的。偏向行动适用于决定构建什么，而非决定是否验证。

---

## 步骤 0：捕获并理解品牌

**阅读：** [references/step-0-capture.md](references/step-0-capture.md)

捕获网站，然后阅读提取的数据以理解品牌和产品 — 它做什么、面向谁、用什么语气、处于什么氛围。捕获的资源是后续的品牌工具箱，而不是视频的构建基础。

**门禁：** 网站摘要已打印 — 策略优先（产品做什么、面向谁、品牌语气），在资源/颜色/字体清单之前。

---

## 步骤 1：品牌标识

**阅读：** [references/step-1-design.md](references/step-1-design.md)

编写 DESIGN.md — 一份品牌速查表，涵盖视觉标识：颜色、字体、组件样式、布局原则。使用 `design-styles.json` 获取精确的计算值。

**速度选项：** 对于快节奏视频（每个节拍一个看板），DESIGN.md 可以是 50 行的颜色 + 字体 + 该做/不该做的摘要 — 而不是 300 行的文档。步骤 5 中的子代理提示词会直接粘贴品牌值，因此 DESIGN.md 的深度仅对复杂合成有关。

**门禁：** `DESIGN.md` 存在（任意长度），至少包含：调色板、字体选择和该做/不该做的规范。

---

## 步骤 2：策略与信息传达

**阅读：** [references/step-2-brief.md](references/step-2-brief.md)，[references/capabilities.md](references/capabilities.md)（浏览目录 — 仅在需要时深入了解各节）

在讨论视觉效果或资源之前，先与用户对齐视频必须传达什么。解析用户的提示词 — 他们可能已经给出了视频类型和风格。仅询问缺失的信息：这个视频必须传达的那一件事、叙事弧和受众。

**门禁：** 视频类型、时长、格式，以及 — 至关重要的是 — 信息和叙事弧已锁定。没有这些，步骤 3 无法编写概念优先的分镜。

---

## 步骤 3：分镜 + 脚本 💬

**阅读：** [references/step-3-storyboard.md](references/step-3-storyboard.md)

概念优先地编写分镜：信息 → 叙事弧 → 服务于弧线的节拍 → 每个节拍的技术 → 最后进行品牌点缀。然后编写匹配的旁白脚本。将两者呈现给用户，附上逐节拍摘要。反复迭代直到他们批准。

**门禁：** `STORYBOARD.md` + `SCRIPT.md` 存在且用户已批准计划。

---

## 步骤 4：旁白、时序 + 字幕 💬

**阅读：** [references/step-4-vo.md](references/step-4-vo.md)

如果步骤 2 说了没有旁白 — 询问背景音乐，然后跳到步骤 5。否则：询问用户使用哪个 TTS 提供商（HeyGen TTS、ElevenLabs 或 Kokoro），生成音频，转录，将时间戳映射到节拍。然后询问字幕。

**门禁：** 要么 (a) 未请求旁白且分镜有手动节拍时序，要么 (b) `narration.wav` + `transcript.json` 存在且节拍时序已更新为实际时长。

---

## 步骤 5：构建合成

**阅读：** `hyperframes` 技能（加载它 — 每条规则都很重要）
**阅读：** [references/step-5-build.md](references/step-5-build.md)

按照分镜（步骤 3）中选择的架构和节奏，构建 index.html 和合成。子代理在每个节拍上运行 `hyperframes lint` 和 `hyperframes snapshot` 后再报告。

**门禁：** 每个 `compositions/beat-N.html` 已被主代理从头到尾对照 DESIGN.md 和 STORYBOARD.md 读取。每个节拍的检查清单位于 [step-5-build.md](references/step-5-build.md)。

---

## 步骤 6：验证与交付

**阅读：** [references/step-6-validate.md](references/step-6-validate.md)

Lint、验证，按视频时长缩放拍摄快照（公式：`max(beats × 3, ceil(duration_seconds / 2))`），并逐一审查。在交付前修复问题。交付 localhost Studio 项目 URL — 仅在用户明确请求时才渲染为 MP4。

**交付你引以为豪的作品。** 在交付之前，问问自己：我会把这个发布在社交媒体上并署名吗？如果不会，修复问题。

**门禁：** `npx hyperframes lint` 和 `npx hyperframes validate` 零错误通过，最终回复包含活跃的 Studio 项目 URL。

---

## 快速参考

### 视频类型

按视频类型的典型约束 — 用作起点，而非公式。节拍数量应来自内容和旁白，而非目标范围。

| 类型 | 典型时长 | 时长驱动因素 | 旁白 |
| --------------------- | ---------------- | ------------------ | --------------------- |
| 社交媒体广告（IG/TikTok） | 10–15 秒 | 平台限制 | 可选 |
| 产品演示 | 30–60 秒 | 脚本长度 | 完整旁白 |
| 功能公告 | 15–30 秒 | 功能复杂度 | 完整旁白 |
| 品牌宣传片 | 20–45 秒 | 音乐轨道 | 可选，音乐为主 |
| 发布预告 | 10–20 秒 | 钩子能量 | 最简 |

节拍数量故意不在此表中 — 它应来自分镜，而非"社交媒体广告 = 3-4 个节拍"。复杂产品的社交媒体广告可能需要 5 个恰当时机的节拍。具有一个强视觉论点的品牌宣传片可能只需要 3 个。

### 格式

- **横屏**：1920x1080（默认）
- **竖屏**：1080x1920（Instagram Stories、TikTok）
- **方形**：1080x1080（Instagram feed）

### 参考文件

| 文件 | 何时阅读 |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [step-0-capture.md](references/step-0-capture.md) | 步骤 0 — 捕获，理解品牌和产品，编写策略优先的网站摘要 |
| [step-1-design.md](references/step-1-design.md) | 步骤 1 — 编写 DESIGN.md 品牌速查表（5 个部分，250-350 行；看板式社交媒体广告用 50 行快速路径） |
| [step-2-brief.md](references/step-2-brief.md) | 步骤 2 — 与用户对齐信息、叙事弧、受众 |
| [capabilities.md](references/capabilities.md) | 步骤 2 和 5 — HyperFrames 完整能力清单（24 个部分）。在简报阶段浏览目录，构建阶段深入特定部分 |
| [step-3-storyboard.md](references/step-3-storyboard.md) | 步骤 3 — 分镜 + 脚本（合并），含用户审核门禁 |
| [step-4-vo.md](references/step-4-vo.md) | 步骤 4 — TTS 提供商选择、生成、时序 |
| [step-5-build.md](references/step-5-build.md) | 步骤 5 — 构建 index.html + 合成 |
| [step-6-validate.md](references/step-6-validate.md) | 步骤 6 — lint、验证、快照（按视频时长缩放）、预览 |
| [techniques.md](../hyperframes/references/techniques.md) | 步骤 3 和 5 — 13 种原始动画技术及代码模式（适配使用，不要复制粘贴） |
| [html-in-canvas-patterns.md](../hyperframes/references/html-in-canvas-patterns.md) | 步骤 5 — HTML-in-Canvas 效果的完整代码模式（位于 hyperframes 技能中） |
