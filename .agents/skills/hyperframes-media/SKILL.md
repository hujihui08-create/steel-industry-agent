---
name: hyperframes-media
description: HyperFrames 合成的资源预处理——文字转语音旁白（Kokoro）、音频/视频转录（Whisper）以及透明叠加层的背景移除（u2net）。适用于从文本生成语音旁白、转录语音生成字幕、移除视频或图像背景以用作透明叠加层、选择 TTS 语音或 whisper 模型，或将上述步骤串联（TTS → 转录 → 字幕）。每个命令在首次运行时下载自己的模型。
---

# HyperFrames 媒体预处理

三个生成合成所需资源的 CLI 命令：`tts`（语音）、`transcribe`（时间戳）和 `remove-background`（透明视频）。每个命令在首次运行时下载模型，并缓存到 `~/.cache/hyperframes/`。将输出放入项目中，然后从合成 HTML 中引用——关于 audio/video 元素的约定请参见 `hyperframes` 技能。

## 文字转语音（`tts`）

使用 Kokoro-82M 在本地生成语音音频。无需 API 密钥。

```bash
npx hyperframes tts "Text here" --voice af_nova --output narration.wav
npx hyperframes tts script.txt --voice bf_emma --output narration.wav
npx hyperframes tts --list                       # 全部 54 种语音
```

### 语音选择

根据内容匹配语音。默认为 `af_heart`。

| 内容类型           | 语音                    | 原因                            |
| ----------------- | ----------------------- | ------------------------------- |
| 产品演示           | `af_heart`/`af_nova`    | 温暖、专业                       |
| 教程/操作指南      | `am_adam`/`bf_emma`     | 中性、易于跟随                   |
| 营销/推广          | `af_sky`/`am_michael`   | 充满活力或权威感                 |
| 文档               | `bf_emma`/`bm_george`   | 清晰英音，正式                   |
| 休闲/社交          | `af_heart`/`af_sky`     | 亲和、自然                       |

### 多语言

语音 ID 的第一个字母编码语言：`a`=美式英语、`b`=英式英语、`e`=西班牙语、`f`=法语、`h`=印地语、`i`=意大利语、`j`=日语、`p`=巴西葡萄牙语、`z`=普通话。CLI 从前缀自动检测音素化器语言环境——当语音与文本语言匹配时无需 `--lang`。

```bash
npx hyperframes tts "La reunión empieza a las nueve" --voice ef_dora --output es.wav
npx hyperframes tts "今日はいい天気ですね" --voice jf_alpha --output ja.wav
```

仅在需要覆盖自动检测时使用 `--lang`（风格化口音）。有效代码：`en-us`、`en-gb`、`es`、`fr-fr`、`hi`、`it`、`pt-br`、`ja`、`zh`。非英语音素化需要系统级 `espeak-ng`（`brew install espeak-ng` / `apt-get install espeak-ng`）。

### 语速

- `0.7-0.8`——教程、复杂内容、无障碍场景
- `1.0`——自然语速（默认）
- `1.1-1.2`——开场、转场、节奏明快的内容
- `1.5+`——很少适用；谨慎测试

### 长脚本

超过几个段落时，写入 `.txt` 文件并传入路径。输入超过约 5 分钟语音的内容可能受益于分段处理。

### 要求

Python 3.8+，需要 `kokoro-onnx` 和 `soundfile`（`pip install kokoro-onnx soundfile`）。首次使用时下载模型（约 311 MB + 约 27 MB 语音文件，缓存于 `~/.cache/hyperframes/tts/`）。

## 转录（`transcribe`）

生成带有词级时间戳的标准化 `transcript.json`。

```bash
npx hyperframes transcribe audio.mp3
npx hyperframes transcribe video.mp4 --model small --language es
npx hyperframes transcribe subtitles.srt          # 导入已有的
npx hyperframes transcribe subtitles.vtt
npx hyperframes transcribe openai-response.json
```

### 语言规则（不可协商）

**除非用户明确声明音频是英语，否则永远不要使用 `.en` 模型。** `.en` 模型（`small.en`、`medium.en`）会将非英语音频**翻译**成英语，而非转录。这会无声地破坏原始语言。

1. 已知语言且非英语 → `--model small --language <code>`（无 `.en` 后缀）
2. 已知语言且为英语 → `--model small.en`
3. 语言未知 → `--model small`（无 `.en`，无 `--language`）——Whisper 自动检测

**默认模型是 `small`，而非 `small.en`。**

### 模型大小

| 模型        | 大小    | 速度     | 适用场景                                |
| ---------- | ------- | -------- | --------------------------------------- |
| `tiny`     | 75 MB   | 最快     | 快速预览、测试流程                      |
| `base`     | 142 MB  | 快       | 短片段、清晰音频                        |
| `small`    | 466 MB  | 中等     | **默认**——大多数内容                    |
| `medium`   | 1.5 GB  | 慢       | 重要内容、嘈杂音频、音乐                |
| `large-v3` | 3.1 GB  | 最慢     | 制作级别质量                            |

含人声的音乐：至少从 `medium` 开始；制作级别曲目通常需要手动导入 SRT/VTT。关于字幕质量检查（每次转录后强制进行）、清理 JS、重试规则和 OpenAI/Groq API 导入路径，请参见 [hyperframes/references/transcript-guide.md](../hyperframes/references/transcript-guide.md)。

### 输出格式

合成消费一个扁平的单词对象数组。`id` 字段（`w0`、`w1`……）在标准化过程中添加，用于字幕覆盖中的稳定引用；它是向后兼容的可选字段。

```json
[
  { "id": "w0", "text": "Hello", "start": 0.0, "end": 0.5 },
  { "id": "w1", "text": "world.", "start": 0.6, "end": 1.2 }
]
```

## 背景移除（`remove-background`）

移除视频或图像的背景，使主体（通常是人——头像、演讲者、谈话头像）在合成中作为透明叠加层出现。

```bash
npx hyperframes remove-background subject.mp4 -o transparent.webm  # 默认：VP9 alpha WebM
npx hyperframes remove-background subject.mp4 -o transparent.mov   # ProRes 4444（编辑用）
npx hyperframes remove-background portrait.jpg -o cutout.png       # 单张图像抠图
npx hyperframes remove-background subject.mp4 -o subject.webm \
  --background-output plate.webm                                   # 一次生成两个图层
npx hyperframes remove-background subject.mp4 -o transparent.webm --device cpu
npx hyperframes remove-background --info                           # 检测到的提供者
```

使用 `u2net_human_seg`（MIT）。首次运行下载约 168 MB 权重到 `~/.cache/hyperframes/background-removal/models/`。

### 图层分离（`--background-output`）

传入 `--background-output`（或 `-b`）以在抠图视频旁边生成**第二个**透明视频：使用相同的源 RGB，alpha 为 `255 − mask` 而非 `mask`。抠图是背景透明的主体；底板是主体所在位置为透明洞的原始周围环境。

| 文件                               | Alpha 为……                                                  | 用途                                                              |
| --------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `-o subject.webm`                 | 遮罩——主体不透明，背景透明                                    | 前景图层，放在上面                                                |
| `--background-output plate.webm`  | 反转——周围环境不透明，主体区域透明                            | 底层；在主体和此层之间放置文字或图形                              |

两个输出共享相同的 `--quality` 预设，并通过单次推理生成——编码成本大约翻倍，分割成本不变。仅适用于视频输入和 `.webm`/`.mov` 输出。

**带洞的底板，而非修复后的干净底板。** `plate.webm` 中的主体区域是完全透明的——在它下面合成不透明内容来填补洞口。判断 `--background-output` 是否是正确的工具，唯一的标准是：_主体轮廓内曾经是主体的位置，会有任何东西可见吗？_

| 使用场景                                                                              | 正确工具                                                                             |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 在抠图和底板之间放置文字/图形（此命令存在的理由）                                      | **带洞底板**（`--background-output`）                                                |
| 将主体放到不相关的场景上                                                              | 仅 `subject.webm`；忽略底板                                                          |
| 单独展示_没有_人的房间，不叠加任何其他内容                                            | **干净底板**——需要修复器（LaMa、ProPainter、E2FGVI）。不是此命令。                    |
| 用另一个主体替换当前主体                                                              | **干净底板**——同上                                                                   |

如果用户要求"移除人后的房间"并打算独立展示，**不要**使用 `--background-output`。告知他们需要修复器。

典型的图层合成（规范的带洞底板用例）：

```html
<!-- z=1 反转 alpha 底板填充除主体区域外的所有内容 -->
<video
  src="plate.webm"
  data-start="0"
  data-duration="6"
  data-track-index="0"
  muted
  playsinline
></video>

<!-- z=2 图形/文字位于两个图层之间 -->
<h1 id="headline" style="z-index:2; ...">MAKE IT IN HYPERFRAMES</h1>

<!-- z=3 抠图将主体浮回标题上方 -->
<div class="cutout-wrap" style="position:absolute;inset:0;z-index:3">
  <video
    src="subject.webm"
    data-start="0"
    data-duration="6"
    data-track-index="1"
    muted
    playsinline
  ></video>
</div>
```

这在功能上等同于下面的文字在主体后方的模式，但您不需要在项目中保留原始的 `presenter.mp4`——底板替代了它。适用于您只想交付两个透明图层，让用户在其间放入任意内容的情况。

### 输出格式

| 格式                    | 适用场景                                                        |
| ----------------------- | --------------------------------------------------------------- |
| `.webm`（VP9 + alpha）  | 默认。合成通过 `<video>` 直接播放。                             |
| `.mov`（ProRes 4444）   | 在 DaVinci/Premiere/FCP 中编辑。文件较大。                      |
| `.png`                  | 单张图像抠图（静态主体，叠加在背景上）。                        |

Chrome 原生解码 VP9 alpha，因此 `.webm` 可以像任何其他静音自动播放视频一样插入合成——关于 `<video>` 轨道约定请参见 `hyperframes` 技能。

### 画质预设

`--quality fast|balanced|best` 仅控制 VP9 编码器的 CRF——分割质量是固定的。

| 预设        | CRF | 适用场景                                                  |
| ---------- | --- | --------------------------------------------------------- |
| `fast`     | 30  | 迭代中，文件更小，颜色匹配较宽松                           |
| `balanced` | 18  | 默认。大多数用途在视觉上一致                               |
| `best`     | 12  | 母版/最终交付。文件最大，颜色匹配最紧密                    |

### 合成模式——选择合适的模式

抠图 webm 是源 mp4 RGB 的**重新编码副本**。这一选择根据其后方放置的内容会产生不同的后果：

| 模式                                                        | 抠图后方的内容                              | 结果                                                                                                                                                                                                                                |
| ---------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **抠图放在不同场景上**（最常见）                              | 静态图像、渐变或不相关的视频                | 效果很好。抠图的 RGB 是主体的唯一来源——无重影、无边缘光晕。这就是 `remove-background` 的设计用途。                                                                                                                                    |
| **抠图放在其自身的源 mp4 上**（文字在主体后方）               | 生成抠图的同一 mp4                          | 同一人物有两个 RGB 来源。在默认 `--quality balanced`（crf 18）下，重影几乎不可见；在 `--quality fast`（crf 30）下，您会看到轻微的颜色偏移/边缘光晕。母版使用 `--quality best`（crf 12）。                                                |
| **抠图放在同一人物的_不同_镜头上**                            | 同一主体的不同画面                          | 看起来会像两个不同的人重叠。不要这样做。                                                                                                                                                                                            |

**文字在主体后方**（标题在演讲者后方）：

```html
<video
  src="presenter.mp4"
  id="bg"
  data-start="0"
  data-duration="6"
  data-track-index="0"
  muted
  playsinline
></video>
<h1 id="headline" style="z-index:2; ...">MAKE IT IN HYPERFRAMES</h1>
<div class="cutout-wrap" style="position:absolute;inset:0;z-index:3;opacity:0">
  <video
    src="presenter.webm"
    data-start="0"
    data-duration="6"
    data-track-index="1"
    muted
    playsinline
  ></video>
</div>
```

两条关键规则：

1. **将抠图视频包裹在非时序 `<div>` 中**，并动画化包装器的 opacity，而非视频元素的 opacity。框架会强制活动剪辑（任何具有 `data-start`/`data-duration` 的元素）的 opacity 为 1，因此直接动画化视频的 opacity 会被静默覆盖。该包装器没有 `data-*` 属性，因此它归您的 CSS/GSAP 控制。
2. **两个视频都使用 `data-start="0"` 和 `data-media-start="0"`**，使框架从 t=0 同步解码它们。延迟挂载抠图（`data-start=3.3`）会引入 seek + 预热，导致帧与基准 mp4 差一帧——在切点处可见一帧的错位。

然后在切点处用 GSAP flip 包装器的 opacity：`tl.set(cutoutWrap, { opacity: 1 }, 3.3)`。

## TTS → 转录 → 字幕

当没有预录音旁白时，生成旁白并将其转录回来以获得字幕的词级时间戳：

```bash
npx hyperframes tts script.txt --voice af_heart --output narration.wav
npx hyperframes transcribe narration.wav   # → transcript.json
```

Whisper 从生成的音频中提取精确的词边界，因此字幕时序与朗读节奏匹配，无需手动调校。
