---
name: contribute-catalog
description: 创建新的 HyperFrames 注册表区块（字幕样式、VFX 区块、转场、底部信息条）或组件（文字特效、叠加层、代码片段），并以上游 PR 的形式提交到 hyperframes 仓库。仅当用户想要向公共目录贡献内容时使用——对于项目内字幕/转场的创作，请使用 `hyperframes` 技能；安装现有注册表项请使用 `hyperframes-registry` 技能。
---

# 向 HyperFrames 注册表贡献

引导用户从想法到合并 PR，完成新的注册表区块或组件的提交。

## 工作流程

```
1. 明确需求 → 2. 脚手架 → 3. 构建 → 4. 验证 → 5. 预览 → 6. 提交
```

### 第 1 步：明确需求

询问他们正在构建什么。注册表有两种项目类型：

- **区块**（`registry/blocks/`，类型 `hyperframes:block`）——具有固定尺寸和持续时间的完整独立合成。字幕样式、VFX 特效、标题卡片、底部信息条。
- **组件**（`registry/components/`，类型 `hyperframes:component`）——没有固定尺寸或持续时间的可复用片段。CSS 特效、文字处理、可适配任何合成尺寸的叠加层。

然后询问：

- 用一句话描述效果
- 视觉参考（URL、截图或描述）
- 谁会使用这个，何时使用？

### 第 2 步：脚手架

创建注册表结构：

**对于区块：**

```
registry/blocks/{block-name}/
  {block-name}.html
  registry-item.json
```

**对于组件：**

```
registry/components/{component-name}/
  {component-name}.html
  registry-item.json
```

**命名规范：**

| 项目名称           | ID 前缀 | 示例 ID                |
| ----------------- | ------- | ---------------------- |
| `cap-hormozi`    | `hz`    | `hz-cg-0`, `hz-cw-3`   |
| `cap-typewriter` | `tw`    | `tw-cg-0`, `tw-ch-0-5` |
| `vfx-chrome`     | `vc`    | `vc-canvas`            |

使用 2-3 字母前缀。所有元素 ID 必须使用此前缀，以避免子合成中的冲突。

**区块的 registry-item.json：**

```json
{
  "$schema": "https://hyperframes.heygen.com/schema/registry-item.json",
  "name": "{block-name}",
  "type": "hyperframes:block",
  "title": "{人类可读标题}",
  "description": "{一句话描述}",
  "dimensions": { "width": 1920, "height": 1080 }, // 调整：竖屏/社交内容使用 1080x1920
  "duration": 10, // 根据您的合成调整
  "tags": ["{类别}", "{子类别}"],
  "files": [
    {
      "path": "{block-name}.html",
      "target": "compositions/{block-name}.html",
      "type": "hyperframes:composition"
    }
  ]
}
```

**组件的 registry-item.json**（无 `dimensions` 和 `duration`）：

```json
{
  "$schema": "https://hyperframes.heygen.com/schema/registry-item.json",
  "name": "{component-name}",
  "type": "hyperframes:component",
  "title": "{人类可读标题}",
  "description": "{一句话描述}",
  "tags": ["{类别}"],
  "files": [
    {
      "path": "{component-name}.html",
      "target": "compositions/components/{component-name}.html",
      "type": "hyperframes:snippet"
    }
  ]
}
```

### 第 3 步：构建

根据类型应用正确的模板。请参见 [templates.md](templates.md) 获取可复制粘贴的起始模板。

#### 字幕区块

**不可协商的字幕规则：**

- 字体大小：比例字体**最低 96px**。**等宽字体可接受 64-72px**（较宽的字符需要较小的字号）。
- 可读性：`-webkit-text-stroke: 2-3px` 或使用多层 `text-shadow`
- 溢出：对每个分组调用 `window.__hyperframes.fitTextFontSize()`
- 卡拉 OK：通过 `tl.to(wordEl, { color/scale }, WORDS[wi].start)` 高亮活动单词
- 硬关闭：对**每个**分组执行 `tl.set(groupEl, { opacity: 0, visibility: "hidden" }, g.end)`
- **不要在与 `tl.set(el, { opacity: 1 })` 相同的位置使用 `tl.from(el, { opacity: 0 })`**——from 会覆盖 set。改用 `tl.to`。

**逐字符动画**（打字机、乱码）：

- 将每个字符包裹在 `<span>` 中，ID 为 `{prefix}-ch-{group}-{char}`
- 通过按单词时间戳计算间隔的 `tl.set` 进行 stagger
- 光标/装饰元素：使用 `tl.set` 在间隔处——不用 CSS 动画（不可 seek）

**定位变体：**

- 居中：`display: flex; align-items: center; justify-content: center;`
- 底部信息条：`position: absolute; bottom: 100px; left: 0; width: 100%; text-align: center;`
- 左对齐：`position: absolute; bottom: 100px; left: 120px; text-align: left;`

#### VFX 区块（Three.js）

- 使用 CDN 中的 `three@0.147.0`（全局 script）
- `tl.eventCallback("onUpdate", renderScene); renderScene();`——不要使用 requestAnimationFrame
- 状态代理模式：GSAP 动画操作普通 JS 对象，渲染函数读取它
- 使用带种子的 PRNG（`mulberry32`）生成随机性

#### 所有类型

- `data-composition-id` 必须匹配 `window.__timelines["id"]`
- 所有元素 ID 以区块缩写为前缀
- `gsap.timeline({ paused: true })`——始终保持暂停
- 不要使用 `Math.random()`，不要使用 `Date.now()`

### 第 4 步：验证

```bash
hyperframes lint                    # 要求 0 错误
hyperframes validate --no-contrast  # 要求 0 控制台错误
```

### 第 5 步：预览

```bash
# 渲染预览视频
hyperframes render -o preview.mp4

# 快照用于视觉 QA
hyperframes snapshot --at "1.0,3.0,5.0,7.0"

# 发布到 hyperframes.dev 供审阅
npx hyperframes publish
```

**目录预览图**——目录卡片使用 `docs/images/catalog/{kind}/{name}.png` 路径下的 PNG 图片（其中 `{kind}` 为 `blocks` 或 `components`）。从快照生成后：

- **HeyGen 内部贡献者：** 运行 `scripts/upload-docs-images.sh`（需要 AWS 配置文件 `engineering-767398024897`）
- **外部贡献者：** 将预览 MP4 附加到您的 PR 描述中。维护者将在合并前生成并上传目录图片。

### 第 6 步：提交

**所有步骤都是必需的。缺少任何一步都会产生损坏的目录条目。**

`{kind}` 是 `blocks` 或 `components`，取决于第 1 步中构建的内容。

```bash
# 1. 创建分支
git checkout -b feat/registry-{name}

# 2. 格式化 HTML
npx oxfmt registry/{kind}/{name}/*.html

# 3. 更新 registry/registry.json — 将条目添加到 "items" 数组：
#    { "name": "{name}", "type": "hyperframes:block" }  （或 "hyperframes:component"）

# 4. 生成目录文档页面
npx tsx scripts/generate-catalog-pages.ts

# 5. 发布到 hyperframes.dev，以便审阅者可以预览
npx hyperframes publish

# 6. 暂存所有内容
git add registry/{kind}/{name}/ registry/registry.json docs/catalog/

# 7. 提交
git commit -m "feat(registry): add {name} — {一句话描述}"

# 8. 推送并创建 PR，附上 hyperframes.dev 链接
git push origin feat/registry-{name}
gh pr create --title "feat(registry): {name}" --body "preview: {hyperframes.dev-url}"
```

**如果您没有 GitHub 账号：** 您需要一个账号来创建 PR。在 https://github.com/signup 注册，然后运行 `gh auth login`。

## 质量检查

- [ ] `hyperframes lint` → 0 错误
- [ ] `hyperframes validate` → 0 控制台错误
- [ ] `npx oxfmt --check` 通过
- [ ] `registry/registry.json` 已更新新条目
- [ ] `scripts/generate-catalog-pages.ts` 已运行（文档页面已生成）
- [ ] `npx hyperframes publish` 已运行（认领您的项目 URL）
- [ ] 预览 MP4 已附加到 PR（外部）或目录 PNG 已上传（内部）
- [ ] 所有 ID 唯一且带有前缀
