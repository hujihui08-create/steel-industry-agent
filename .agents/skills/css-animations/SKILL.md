---
name: css-animations
description: HyperFrames 的 CSS 动画适配器模式。适用于编写 CSS keyframes、基于 animation-delay 的时序控制、animation-fill-mode、animation-play-state，或在预览和渲染期间需要 HyperFrames 确定性 seek 的纯 CSS 动画。
---

# HyperFrames 的 CSS 动画

HyperFrames 可以通过其 `css` 运行时适配器来 seek CSS keyframe 动画。适用于简单的重复图案、背景动画、微光、发光、遮罩和非有序装饰。

对于场景编排，GSAP 通常更清晰。CSS 动画在动画属于单个元素且具有固定持续时间时效果最好。

## 约定

- 在运行时初始化完成之前将动画元素放入 DOM。
- 为时序元素设置 `data-start` 值，使局部动画时间与剪辑匹配。
- 使用有限的 `animation-duration` 和 `animation-iteration-count`，因为基于负延迟的降级方案无法在没有 WAAPI 支持的 CSS 动画环境中表示无限持续时间。
- 优先使用 `animation-fill-mode: both`，使 seek 状态在动画前后都保持。
- 避免依赖挂钟 JavaScript、hover 触发的状态以及依赖用户事件的类切换。

适配器发现具有计算 `animation-name` 的元素，在可用时 seek 其浏览器 `Animation` 句柄，并在不可用时通过负 `animation-delay` 降级暂停。

## 基本模式

```html
<div
  id="pulse-ring"
  class="clip pulse-ring"
  data-start="0"
  data-duration="4"
  data-track-index="2"
></div>

<style>
  .pulse-ring {
    width: 280px;
    height: 280px;
    border: 4px solid rgba(255, 255, 255, 0.7);
    border-radius: 50%;
    animation-name: pulse-ring;
    animation-duration: 1200ms;
    animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
    animation-iteration-count: 3;
    animation-fill-mode: both;
  }

  @keyframes pulse-ring {
    from {
      opacity: 0;
      transform: scale(0.82);
    }
    35% {
      opacity: 1;
    }
    to {
      opacity: 0;
      transform: scale(1.18);
    }
  }
</style>
```

## 交错模式

使用 CSS 自定义属性避免重复 keyframes：

```html
<div class="clip dots" data-start="1" data-duration="3" data-track-index="3">
  <span style="--i: 0"></span>
  <span style="--i: 1"></span>
  <span style="--i: 2"></span>
</div>

<style>
  .dots span {
    display: inline-block;
    width: 18px;
    height: 18px;
    margin-right: 10px;
    border-radius: 50%;
    background: currentColor;
    animation: dot-pop 900ms ease-out both;
    animation-delay: calc(var(--i) * 120ms);
  }

  @keyframes dot-pop {
    from {
      opacity: 0;
      transform: translateY(18px) scale(0.75);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
```

## 适用场景

- 已知重复次数的装饰性循环。
- 遮罩、发光、微光、噪点和微妙的视差图层。
- 简单的单元素入场动画，使用完整的 JS 时间线过于大材小用。

## 避免事项

- 无限 CSS 动画，除非您已验证浏览器暴露了可 seek 的 WAAPI 支持的 CSS 动画句柄。优先使用覆盖可见持续时间的有限迭代次数。
- 在 transform 可以实现相同效果时，动画化布局属性如 `top`、`left`、`width` 或 `height`。
- 依赖 hover、focus、scroll 或媒体查询来触发渲染关键动画。
- 在启动后更改动画类，除非另一个确定性时间线控制该更改。

## 验证

编辑 CSS 动画合成之后：

```bash
npx hyperframes lint
npx hyperframes validate
```

## 参考与致谢

- HyperFrames 适配器源码：`packages/core/src/runtime/adapters/css.ts`。
- MDN CSS 动画文档：https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation
- MDN `animation-fill-mode`：https://developer.mozilla.org/en-US/docs/Web/CSS/animation-fill-mode
