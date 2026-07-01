---
name: animejs
description: HyperFrames 的 Anime.js 适配器模式。适用于在 HyperFrames 合成中编写 Anime.js 动画或时间线、将动画注册到 window.__hfAnime、使 Anime.js 变为可 seek 驱动的确定性动画，或将 Anime.js 示例转换为渲染安全的 HyperFrames HTML。
---

# 在 HyperFrames 中使用 Anime.js

HyperFrames 可以通过其 `animejs` 运行时适配器来 seek Anime.js 实例。合成拥有动画对象；HyperFrames 控制时钟。

## 约定

- 在合成初始化期间同步创建动画或时间线。
- 设置 `autoplay: false`，使 Anime.js 不会按照自己的时钟推进。
- 将每个返回的动画或时间线注册到 `window.__hfAnime`。
- 使用有限的持续时间和循环次数。
- 避免使用依赖挂钟时间、网络状态或非种子随机数的回调来修改 DOM。

适配器使用 `instance.seek(timeMs)` 来 seek 每个注册的实例，其中 `timeMs` 是 HyperFrames 时间（以毫秒为单位）。

## 基本模式

```html
<script src="https://cdn.jsdelivr.net/npm/animejs@4.0.2/lib/anime.iife.min.js"></script>
<script>
  const anim = anime({
    targets: ".mark",
    translateX: 280,
    rotate: "1turn",
    opacity: [0, 1],
    duration: 1200,
    easing: "easeOutExpo",
    autoplay: false,
  });

  window.__hfAnime = window.__hfAnime || [];
  window.__hfAnime.push(anim);
</script>
```

## 时间线模式

```html
<script>
  const tl = anime.timeline({
    autoplay: false,
    easing: "easeOutCubic",
  });

  tl.add({
    targets: ".title",
    translateY: [40, 0],
    opacity: [0, 1],
    duration: 650,
  }).add(
    {
      targets: ".accent",
      scaleX: [0, 1],
      duration: 450,
    },
    250,
  );

  window.__hfAnime = window.__hfAnime || [];
  window.__hfAnime.push(tl);
</script>
```

## 模块构建

如果您使用 ES module 构建，适配器不关心实例是如何创建的。它只需要返回的对象暴露 `seek()`、`pause()`，以及最好是 `play()`：

```html
<script type="module">
  import { animate } from "https://cdn.jsdelivr.net/npm/animejs/+esm";

  const anim = animate(".chip", {
    x: "18rem",
    duration: 900,
    autoplay: false,
  });

  window.__hfAnime = window.__hfAnime || [];
  window.__hfAnime.push(anim);
</script>
```

## 适用场景

- 小型 SVG 和 DOM 装饰效果，Anime.js 语法更简洁。
- 可以改造为 seek 驱动的导入 Anime.js 示例。
- 推入同一注册表的多个独立微动画。

对于复杂的场景编排，使用 GSAP，除非用户明确要求使用 Anime.js。GSAP 仍是 HyperFrames 的主要创作路径。

## 避免事项

- 保留 Anime.js 默认的 `autoplay`。
- 依赖 `anime.running` 的自动发现，而不是显式的 `window.__hfAnime.push(...)`。
- 无限循环。根据合成持续时间计算有限的循环次数。
- 在定时器、promise、事件处理器或异步资源加载之后构建动画。

## 验证

编辑使用 Anime.js 的合成之后：

```bash
npx hyperframes lint
npx hyperframes validate
```

## 参考与致谢

- HyperFrames 适配器源码：`packages/core/src/runtime/adapters/animejs.ts`。
- Anime.js 关于 `autoplay`、`pause()` 和 `seek()` 的文档：https://animejs.com/documentation/
