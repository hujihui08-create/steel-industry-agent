---
name: lottie
description: HyperFrames 的 Lottie 和 dotLottie 适配器模式。当嵌入 lottie-web JSON 动画、.lottie 文件、@lottiefiles/dotlottie-web 播放器、在 window.__hfLottie 上注册实例，或使 After Effects 导出在 HyperFrames 中具有确定性时使用。
---

# HyperFrames 的 Lottie

HyperFrames 可以通过其 `lottie` 运行时适配器定位 `lottie-web` 和 dotLottie 播放器。Lottie 非常适合，因为动画时间线已经编码在资源中；HyperFrames 只需要一个可以定位的播放器对象。

## 契约

- 从本地项目文件加载资源，通常放在 `assets/` 下。
- 设置 `autoplay: false`。
- 优先使用 `loop: false`，除非用户明确需要循环。
- 将每个返回的动画或播放器注册到 `window.__hfLottie`。
- 使用 CSS 保持 Lottie 容器尺寸稳定。

适配器使用 `goToAndStop(timeMs, false)` 定位 `lottie-web`，并根据播放器形态使用帧或百分比 API 定位 dotLottie。

## lottie-web 模式

```html
<div id="logo-lottie" class="lottie-layer"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js"></script>
<script>
  const anim = lottie.loadAnimation({
    container: document.getElementById("logo-lottie"),
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: "assets/logo-reveal.json",
  });

  window.__hfLottie = window.__hfLottie || [];
  window.__hfLottie.push(anim);
</script>
```

```css
.lottie-layer {
  width: 100%;
  height: 100%;
}
```

## dotLottie 模式

```html
<canvas id="product-lottie" class="lottie-canvas"></canvas>
<script src="https://unpkg.com/@lottiefiles/dotlottie-web"></script>
<script>
  const player = new DotLottie({
    canvas: document.getElementById("product-lottie"),
    src: "assets/product-flow.lottie",
    autoplay: false,
    loop: false,
  });

  window.__hfLottie = window.__hfLottie || [];
  window.__hfLottie.push(player);
</script>
```

```css
.lottie-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
```

## 多个动画

将每个播放器推入同一个注册表：

```js
window.__hfLottie = window.__hfLottie || [];
window.__hfLottie.push(backgroundAnim);
window.__hfLottie.push(iconAnim);
window.__hfLottie.push(confettiAnim);
```

HyperFrames 将它们全部定位到相同的合成时间。

## 适用场景

- 已知在 lottie-web 中正确渲染的 After Effects 导出。
- Logo 揭示、图标循环、装饰性点缀和产品 UI 动效。
- 将 Remotion Lottie 用法翻译为纯 HyperFrames HTML。

## 避免

- 在渲染时依赖远程 `path` URL。
- 使用 `play()` 启动播放。
- 假设不支持的 After Effects 效果能在导出后保留。先在浏览器中测试 JSON 或 `.lottie` 文件。
- 异步加载播放器并在 HyperFrames 验证已检查页面之后注册它。

## 验证

编辑 Lottie 合成后：

```bash
npx hyperframes lint
npx hyperframes validate
```

## 致谢与参考

- HyperFrames 适配器源码：`packages/core/src/runtime/adapters/lottie.ts`。
- Airbnb 的 lottie-web：https://github.com/airbnb/lottie-web
- lottie-web `loadAnimation` 选项：https://github.com/airbnb/lottie-web/wiki/loadAnimation-options
- LottieFiles 的 dotLottie web 播放器方法：https://developers.lottiefiles.com/docs/dotlottie-player/dotlottie-web/methods
