---
name: hyperframes-registry
description: 将注册表区块和组件安装并接入 HyperFrames 合成。适用于运行 hyperframes add、安装区块或组件、将已安装项接入 index.html，或处理 hyperframes.json。涵盖 add 命令、安装位置、区块子合成接入、组件片段合并和注册表发现。
---

# HyperFrames 注册表

注册表提供可通过 `hyperframes add <name>` 安装的可复用区块和组件。

- **区块**——独立的子合成（自有尺寸、持续时间、时间线）。在宿主合成中通过 `data-composition-src` 引入。
- **组件**——效果片段（无自有尺寸）。直接粘贴到宿主合成的 HTML 中。

## 何时使用此技能

- 用户提到 `hyperframes add`、"区块"、"组件"或 `hyperframes.json`
- 会话中出现 `hyperframes add` 的输出（文件路径、剪贴板片段）
- 您需要将已安装项接入现有合成
- 您想发现注册表中有什么可用项

## 快速参考

```bash
hyperframes add data-chart              # 安装一个区块
hyperframes add grain-overlay           # 安装一个组件
hyperframes add shimmer-sweep --dir .   # 指定目标项目
hyperframes add data-chart --json       # 机器可读输出
hyperframes add data-chart --no-clipboard  # 跳过剪贴板（CI/无头环境）
```

安装后，CLI 会打印已写入的文件以及要粘贴到宿主合成中的代码片段。该片段是一个起点——接入区块时，您需要添加 `data-composition-id`（必须匹配区块的内部合成 ID）、`data-start` 和 `data-track-index` 属性。

注意：`hyperframes add` 仅适用于区块和组件。对于示例，请改用 `hyperframes init <dir> --example <name>`。

## 安装位置

区块默认安装到 `compositions/<name>.html`。
组件默认安装到 `compositions/components/<name>.html`。

这些路径可在 `hyperframes.json` 中配置：

```json
{
  "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
  "paths": {
    "blocks": "compositions",
    "components": "compositions/components",
    "assets": "assets"
  }
}
```

完整细节请参见 [install-locations.md](./references/install-locations.md)。

## 接入区块

区块是独立的合成——通过宿主 `index.html` 中的 `data-composition-src` 引入：

```html
<div
  data-composition-id="data-chart"
  data-composition-src="compositions/data-chart.html"
  data-start="2"
  data-duration="15"
  data-track-index="1"
  data-width="1920"
  data-height="1080"
></div>
```

关键属性：

- `data-composition-src`——区块 HTML 文件的路径
- `data-composition-id`——必须匹配区块的内部 ID
- `data-start`——区块在宿主时间线上出现的时间（秒）
- `data-duration`——区块播放的持续时间
- `data-width` / `data-height`——区块画布尺寸
- `data-track-index`——图层排序（数值越高越靠前）

完整细节请参见 [wiring-blocks.md](./references/wiring-blocks.md)。

## 接入组件

组件是代码片段——将它们粘贴到合成中：HTML 粘贴到标记中，CSS 粘贴到样式块中，JS 粘贴到脚本中（如果有）：

1. 读取已安装的文件（例如 `compositions/components/grain-overlay.html`）
2. 将 HTML 元素复制到合成中的 `<div data-composition-id="...">`
3. 将 `<style>` 块复制到合成的样式中
4. 将任何 `<script>` 内容复制到合成的脚本中（在时间线代码之前）
5. 如果组件暴露了 GSAP 时间线集成（参见片段中的注释块），将这些调用添加到您的时间线中

完整细节请参见 [wiring-components.md](./references/wiring-components.md)。

## 发现

浏览可用项：

```bash
# 读取注册表清单
curl -s https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry/registry.json
```

每个项目的 `registry-item.json` 包含：名称、类型、标题、描述、标签、尺寸（仅区块）、持续时间（仅区块）和文件列表。

关于按类型和标签过滤的细节，请参见 [discovery.md](./references/discovery.md)。
