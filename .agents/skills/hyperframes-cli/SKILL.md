---
name: hyperframes-cli
description: HyperFrames CLI 开发循环——`npx hyperframes` 用于脚手架（init）、验证（lint、inspect）、预览、渲染和环境排查（doctor、browser、info、upgrade）。适用于运行这些命令或排查 HyperFrames 构建/渲染环境时使用。对于资源预处理命令（`tts`、`transcribe`、`remove-background`），请改用 `hyperframes-media` 技能。
---

# HyperFrames CLI

所有操作通过 `npx hyperframes` 运行。需要 Node.js >= 22 和 FFmpeg。

## 工作流程

1. **脚手架**——`npx hyperframes init my-video`
2. **编写**——编写 HTML 合成（参见 `hyperframes` 技能）
3. **Lint**——`npx hyperframes lint`
4. **可视化检查**——`npx hyperframes inspect`
5. **预览**——`npx hyperframes preview`
6. **渲染**——`npx hyperframes render`

在预览之前先 lint 和 inspect。`lint` 捕获缺失的 `data-composition-id`、轨道重叠和未注册的时间线。`inspect` 在无头 Chrome 中打开渲染后的合成，在时间线上 seek，并报告文本溢出气泡/容器或超出画布的情况。

## 脚手架

```bash
npx hyperframes init my-video                        # 交互式向导
npx hyperframes init my-video --example warm-grain   # 选择一个示例
npx hyperframes init my-video --video clip.mp4        # 带视频文件
npx hyperframes init my-video --audio track.mp3       # 带音频文件
npx hyperframes init my-video --example blank --tailwind # 带 Tailwind v4 浏览器运行时
npx hyperframes init my-video --non-interactive       # 跳过提示（CI/Agent）
```

模板：`blank`、`warm-grain`、`play-mode`、`swiss-grid`、`vignelli`、`decision-tree`、`kinetic-type`、`product-promo`、`nyt-graph`。

`init` 创建正确的文件结构，复制媒体文件，用 Whisper 转录音频，并安装 AI 编码技能。应使用它而不是手动创建文件。

当使用 `--tailwind` 时，在编辑类或主题 Token 之前先调用 `tailwind` 技能。脚手架使用 Tailwind v4.2 通过浏览器运行时，而非 Studio 的 Tailwind v3 设置。

## Lint

```bash
npx hyperframes lint                  # 当前目录
npx hyperframes lint ./my-project     # 指定项目
npx hyperframes lint --verbose        # info 级别发现
npx hyperframes lint --json           # 机器可读格式
```

对 `index.html` 和 `compositions/` 中的所有文件进行 lint。报告错误（必须修复）、警告（应修复）和信息（使用 `--verbose` 时）。

## 可视化检查

```bash
npx hyperframes inspect                 # 在时间线上检查渲染后的布局
npx hyperframes inspect ./my-project    # 指定项目
npx hyperframes inspect --json          # Agent 可读的发现
npx hyperframes inspect --samples 15    # 更密集的时间线扫描
npx hyperframes inspect --at 1.5,4,7.25 # 明确的代表性帧时间戳
```

在 `lint` 和 `validate` 之后使用，尤其适用于包含对话气泡、卡片、字幕或紧凑排版的合成。它会报告：

- 文本超出最近的视觉容器或气泡
- 文本被自身固定宽/高盒子裁剪
- 文本超出合成画布
- 子元素逃逸裁剪容器

错误应在渲染前修复。警告会呈现给 Agent 审阅；添加 `--strict` 也会在警告上失败。重复的静态问题默认折叠，使 JSON 输出在 LLM 上下文窗口中保持紧凑。如果溢出是入场/出场动画的有意效果，请将元素或祖先标记为 `data-layout-allow-overflow`。如果装饰性元素永远不应被审计，请将其标记为 `data-layout-ignore`。

`npx hyperframes layout` 作为相同可视化检查传递的兼容性别名仍可用。

## 预览

```bash
npx hyperframes preview                   # 启动当前目录
npx hyperframes preview --port 4567       # 自定义端口（默认 3002）
```

文件更改时热重载。自动在浏览器中打开工作室。

当将项目交还给用户时，使用 Studio 项目 URL，而非源 `index.html` 路径：

```text
http://localhost:<port>/#project/<project-name>
```

使用预览输出中的实际端口和项目目录名称。例如，在 `codex-openai-video` 中执行 `npx hyperframes preview --port 3017` 后，报告 `http://localhost:3017/#project/codex-openai-video`。

仅将 `index.html` 视为源代码上下文。可以将其作为实现文件链接，但不要将其标记为项目或预览界面。

## 渲染

```bash
npx hyperframes render                                # 标准 MP4
npx hyperframes render --output final.mp4             # 指定输出
npx hyperframes render --quality draft                # 快速迭代
npx hyperframes render --fps 60 --quality high        # 最终交付
npx hyperframes render --format webm                  # 透明 WebM
npx hyperframes render --docker                       # 字节级一致
```

| 标志                  | 选项                  | 默认值                     | 说明                                                                 |
| -------------------- | --------------------- | -------------------------- | -------------------------------------------------------------------- |
| `--output`           | 路径                  | renders/名称_时间戳.mp4    | 输出路径                                                              |
| `--fps`              | 24、30、60            | 30                         | 60fps 会使渲染时间翻倍                                                |
| `--quality`          | draft、standard、high | standard                   | draft 用于迭代                                                        |
| `--format`           | mp4、webm             | mp4                        | WebM 支持透明度                                                       |
| `--workers`          | 1-8 或 auto           | auto                       | 每个 worker 启动一个 Chrome                                          |
| `--docker`           | 标志                  | 关闭                       | 可复现输出                                                            |
| `--gpu`              | 标志                  | 关闭                       | GPU 加速编码                                                          |
| `--strict`           | 标志                  | 关闭                       | lint 错误时失败                                                       |
| `--strict-all`       | 标志                  | 关闭                       | 错误和警告时均失败                                                    |
| `--variables`        | JSON 对象             | —                          | 覆盖在 `data-composition-variables` 中声明的变量值                    |
| `--variables-file`   | 路径                  | —                          | 包含变量值的 JSON 文件（`--variables` 的替代方案）                    |
| `--strict-variables` | 标志                  | 关闭                       | 在 `--variables` 中出现未声明键或类型不匹配时渲染失败                 |

**画质指导：** 迭代时用 `draft`，审阅时用 `standard`，最终交付时用 `high`。

**参数化渲染：** 合成在 `<html>` 根元素上通过 **`data-composition-variables`** 声明其变量——一个 JSON **声明数组**（每个条目 `{id, type, label, default}`）定义 schema。内部脚本通过 `window.__hyperframes.getVariables()` 读取解析后的值。CLI 的 **`--variables '{"title":"Q4 Report"}'`** 是一个 **以 id 为键的 JSON 对象**，用于覆盖单次渲染中声明的默认值；缺失的键会回退到默认值，因此同一合成在开发预览和生产环境中运行时行为不变。（子合成宿主也可以通过 **`data-variable-values`** 按实例覆盖——相同的对象形状，作用域限于子合成的一次挂载。完整模式请参见 `hyperframes` 技能。）

## 资源预处理

`npx hyperframes tts`、`transcribe` 和 `remove-background` 生成资源（旁白音频、词级转录、透明视频），将其放入合成中。每个命令在首次运行时下载自己的模型。关于语音选择、whisper 模型规则（`.en` 会将非英语翻译为英语的陷阱）、输出格式选择（VP9 alpha WebM vs ProRes）以及 TTS → 转录 → 字幕链，请调用 `hyperframes-media` 技能。

## 故障排查

```bash
npx hyperframes doctor       # 检查环境（Chrome、FFmpeg、Node、内存）
npx hyperframes browser      # 管理内置 Chrome
npx hyperframes info         # 版本和环境详情
npx hyperframes upgrade      # 检查更新
```

如果渲染失败，首先运行 `doctor`。常见问题：缺少 FFmpeg、缺少 Chrome、内存不足。

## 其他

```bash
npx hyperframes compositions   # 列出项目中的合成
npx hyperframes docs           # 打开文档
npx hyperframes benchmark .    # 基准测试渲染性能
```
