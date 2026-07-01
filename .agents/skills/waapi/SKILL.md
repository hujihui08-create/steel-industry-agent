---
name: waapi
description: HyperFrames 的 Web Animations API 适配器模式。当创作 element.animate() 动效、Animation currentTime 定位、document.getAnimations()、KeyframeEffect 时序、填充模式，或需要在 HyperFrames 中确定性渲染的原生浏览器动画时使用。
---

# HyperFrames 的 Web Animations API

HyperFrames 可以通过其 `waapi` 运行时适配器定位 Web Animations API 动画。当你想要使用原生浏览器关键帧配合 JavaScript 创建的时序而不依赖 GSAP 时，WAAPI 非常有用。

## 契约

- 在合成初始化期间同步创建动画。
- 使用 `element.animate(...)` 配合有限的 `duration` 和 `iterations`。
- 使用 `fill: "both"` 使定位后的状态持久化。
- 创建后暂停动画，或让适配器在首次定位时暂停它们。
- 避免对渲染关键状态使用回调和 Promise。

适配器调用 `document.getAnimations()`，将每个动画的 `currentTime` 设置为 HyperFrames 时间（毫秒），然后暂停它。

## 基本模式

```html
<div id="orb" class="clip orb" data-start="2" data-duration="3" data-track-index="2"></div>

<script>
  const orb = document.getElementById("orb");
  const animation = orb.animate(
    [
      { transform: "translate3d(-160px, 0, 0) scale(0.8)", opacity: 0 },
      { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1, offset: 0.35 },
      { transform: "translate3d(120px, 0, 0) scale(1.08)", opacity: 1 },
    ],
    {
      duration: 3000,
      delay: 2000,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
      fill: "both",
      iterations: 1,
    },
  );

  animation.pause();
</script>
```

## 交错模式

```js
document.querySelectorAll(".token").forEach((token, index) => {
  const animation = token.animate(
    [
      { transform: "translateY(24px)", opacity: 0 },
      { transform: "translateY(0)", opacity: 1 },
    ],
    {
      duration: 620,
      delay: index * 80,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
      fill: "both",
      iterations: 1,
    },
  );
  animation.pause();
});
```

## 适用场景

- CSS 关键帧过于僵化且 GSAP 不必要的轻量级 DOM 动效。
- 从结构化数据生成的动画。
- 可以表示为关键帧、延迟和偏移的简单时间线。

## 避免

- 无限 `iterations`。
- 依赖 `animation.finished` 来改变渲染关键的 DOM。
- 使用 `requestAnimationFrame`、定时器或 `performance.now()` 运行独立的时钟。
- 当 transforms 和 opacity 可以表达动效时动画化布局属性。
- 假设剪辑本地开始时间是自动的。WAAPI 适配器定位文档级动画时间；使用 `delay` 建模剪辑偏移，或在可见性由 HyperFrames 时序控制的元素上创建动画。

## 验证

编辑 WAAPI 合成后：

```bash
npx hyperframes lint
npx hyperframes validate
```

## 致谢与参考

- HyperFrames 适配器源码：`packages/core/src/runtime/adapters/waapi.ts`。
- MDN Web Animations API 指南：https://developer.mozilla.org/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API
- MDN `Animation.currentTime`：https://developer.mozilla.org/en-US/docs/Web/API/Animation/currentTime
