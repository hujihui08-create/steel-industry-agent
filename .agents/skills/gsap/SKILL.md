---
name: gsap
description: HyperFrames 的 GSAP 动画参考。涵盖 gsap.to()、from()、fromTo()、缓动、stagger、defaults、时间线（gsap.timeline()、位置参数、标签、嵌套、播放控制）以及性能优化（transforms、will-change、quickTo）。适用于在 HyperFrames 合成中编写 GSAP 动画。
---

# GSAP

## HyperFrames 契约

HyperFrames 通过其 `gsap` 运行时适配器控制 GSAP。同步创建暂停的时间线，将其注册到 `window.__timelines`，键值为精确的 `data-composition-id`，然后由 HyperFrames 进行 seek。

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });

  tl.from(".title", { y: 48, opacity: 0, duration: 0.6, ease: "power3.out" }, 0);
  tl.to(".accent", { scaleX: 1, duration: 0.5, ease: "power2.out" }, 0.25);

  window.__timelines["main"] = tl; // 键值必须等于合成根元素上的 data-composition-id
</script>
```

- 注册表键值必须匹配合成根元素的 `data-composition-id`。
- 不要为渲染关键动画调用 `tl.play()`。
- 不要在异步代码、定时器或事件处理器中构建时间线。
- 保持循环有限。HyperFrames 渲染有限的视频时长。

## 核心 Tween 方法

- **gsap.to(targets, vars)**——从当前状态动画到 `vars`。最常用。
- **gsap.from(targets, vars)**——从 `vars` 动画到当前状态（入场效果）。
- **gsap.fromTo(targets, fromVars, toVars)**——显式指定起点和终点。
- **gsap.set(targets, vars)**——立即应用（持续时间为 0）。

始终使用 **camelCase** 属性名（例如 `backgroundColor`、`rotationX`）。

## 常用 vars

- **duration**——秒数（默认 0.5）。
- **delay**——开始前的秒数。
- **ease**——`"power1.out"`（默认）、`"power3.inOut"`、`"back.out(1.7)"`、`"elastic.out(1, 0.3)"`、`"none"`。
- **stagger**——数值 `0.1` 或对象：`{ amount: 0.3, from: "center" }`、`{ each: 0.1, from: "random" }`。
- **overwrite**——`false`（默认）、`true` 或 `"auto"`。
- **repeat**——有限次数；在 HyperFrames 中永远不要使用 `-1`。根据可见持续时间计算重复次数。**yoyo**——与 repeat 交替改变方向。
- **onComplete**、**onStart**、**onUpdate**——回调函数。
- **immediateRender**——from()/fromTo() 默认 `true`。对于后续针对相同属性+元素的 tween，设置为 `false` 以避免覆盖。

## Transforms 和 CSS

优先使用 GSAP 的 **transform 别名** 而非原始 `transform` 字符串：

| GSAP 属性                   | 等效值                  |
| --------------------------- | ----------------------- |
| `x`、`y`、`z`               | translateX/Y/Z（px）    |
| `xPercent`、`yPercent`      | translateX/Y（%）       |
| `scale`、`scaleX`、`scaleY` | scale                   |
| `rotation`                  | rotate（deg）           |
| `rotationX`、`rotationY`    | 3D rotate               |
| `skewX`、`skewY`            | skew                    |
| `transformOrigin`           | transform-origin        |

- **autoAlpha**——优先于 `opacity`。为 0 时：同时设置 `visibility: hidden`。
- **CSS 变量**——`"--hue": 180`。
- **svgOrigin**（仅 SVG）——全局 SVG 坐标空间原点。不要与 `transformOrigin` 结合使用。
- **方向性旋转**——`"360_cw"`、`"-170_short"`、`"90_ccw"`。
- **clearProps**——`"all"` 或逗号分隔；完成后移除内联样式。
- **相对值**——`"+=20"`、`"-=10"`、`"*=2"`。

## 基于函数的值

```javascript
gsap.to(".item", {
  x: (i, target, targets) => i * 50,
  stagger: 0.1,
});
```

## 缓动

内置缓动：`power1`–`power4`、`back`、`bounce`、`circ`、`elastic`、`expo`、`sine`。每种都有 `.in`、`.out`、`.inOut`。

## Defaults

```javascript
gsap.defaults({ duration: 0.6, ease: "power2.out" });
```

## 控制 Tween

```javascript
const tween = gsap.to(".box", { x: 100 });
tween.pause();
tween.play();
tween.reverse();
tween.kill();
tween.progress(0.5);
tween.time(0.2);
```

## gsap.matchMedia()（响应式 + 无障碍）

仅在媒体查询匹配时运行设置；不匹配时自动回退。

```javascript
let mm = gsap.matchMedia();
mm.add(
  {
    isDesktop: "(min-width: 800px)",
    reduceMotion: "(prefers-reduced-motion: reduce)",
  },
  (context) => {
    const { isDesktop, reduceMotion } = context.conditions;
    gsap.to(".box", {
      rotation: isDesktop ? 360 : 180,
      duration: reduceMotion ? 0 : 2,
    });
  },
);
```

---

## 时间线

### 创建时间线

```javascript
const tl = gsap.timeline({ defaults: { duration: 0.5, ease: "power2.out" } });
tl.to(".a", { x: 100 }).to(".b", { y: 50 }).to(".c", { opacity: 0 });
```

### 位置参数

第三个参数控制放置位置：

- **绝对位置**：`1`——在 1 秒处
- **相对位置**：`"+=0.5"`——结束后；`"-=0.2"`——结束前
- **标签**：`"intro"`、`"intro+=0.3"`
- **对齐**：`"<"`——与前一个同时开始；`">"`——前一个结束后开始；`"<0.2"`——前一个开始后 0.2 秒

```javascript
tl.to(".a", { x: 100 }, 0);
tl.to(".b", { y: 50 }, "<"); // 与 .a 同时开始
tl.to(".c", { opacity: 0 }, "<0.2"); // .b 开始后 0.2 秒
```

### 标签

```javascript
tl.addLabel("intro", 0);
tl.to(".a", { x: 100 }, "intro");
tl.addLabel("outro", "+=0.5");
tl.play("outro");
tl.tweenFromTo("intro", "outro");
```

### 时间线选项

- **paused: true**——创建时暂停；调用 `.play()` 开始。
- **repeat**、**yoyo**——应用于整个时间线。
- **defaults**——合并到每个子 tween 的变量。

### 嵌套时间线

```javascript
const master = gsap.timeline();
const child = gsap.timeline();
child.to(".a", { x: 100 }).to(".b", { y: 50 });
master.add(child, 0);
```

### 播放控制

`tl.play()`、`tl.pause()`、`tl.reverse()`、`tl.restart()`、`tl.time(2)`、`tl.progress(0.5)`、`tl.kill()`。

---

## 性能

### 优先使用 Transform 和 Opacity

动画化 `x`、`y`、`scale`、`rotation`、`opacity` 保留在合成器上。当 transform 可以达到相同效果时，避免使用 `width`、`height`、`top`、`left`。

### will-change

```css
will-change: transform;
```

仅在真正需要动画的元素上使用。

### 频繁更新使用 gsap.quickTo()

```javascript
let xTo = gsap.quickTo("#id", "x", { duration: 0.4, ease: "power3" }),
  yTo = gsap.quickTo("#id", "y", { duration: 0.4, ease: "power3" });
container.addEventListener("mousemove", (e) => {
  xTo(e.pageX);
  yTo(e.pageY);
});
```

### Stagger 优于多个 Tween

使用 `stagger` 代替带有手动延迟的多个独立 tween。

### 清理

暂停或 kill 屏幕外的动画。

---

## 参考（按需加载）

- **[references/effects.md](references/effects.md)**——即用型效果：打字机文字、音频可视化器。当需要 HyperFrames 的现成效果模式时阅读。

## 最佳实践

- 使用 camelCase 属性名；优先使用 transform 别名和 autoAlpha。
- 优先使用时间线而非用 delay 链式调用；使用位置参数。
- 使用 `addLabel()` 添加标签以提高可读性。
- 将 defaults 传递给时间线构造函数。
- 存储 tween/时间线返回值以便控制播放。

## 禁止事项

- 在 transform 可以实现相同效果时动画化布局属性（width/height/top/left）。
- 在同一个 SVG 元素上同时使用 svgOrigin 和 transformOrigin。
- 当时间线可以编排动画时使用 delay 链式调用。
- 在 DOM 存在之前创建 tween。
- 跳过清理——不再需要时始终 kill tween。
- 在 HyperFrames 合成中使用无限 repeat 值。使用根据可见持续时间计算的有限 repeat 次数。

## 参考与致谢

- HyperFrames 适配器源码：`packages/core/src/runtime/adapters/gsap.ts`。
- GSAP 文档：https://gsap.com/docs/v3/
- GSAP timeline pause 和 seek 行为：https://gsap.com/docs/v3/GSAP/Timeline/pause%28%29/
