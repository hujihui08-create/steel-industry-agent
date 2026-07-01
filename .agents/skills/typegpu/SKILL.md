---
name: typegpu
description: HyperFrames 的 TypeGPU 和原始 WebGPU 适配器模式。当创建使用 TypeGPU、原始 WebGPU、WGSL 片段着色器、计算管线、液态玻璃效果、粒子系统，或任何由 navigator.gpu 驱动并响应 HyperFrames hf-seek 事件的 canvas 层的 GPU 渲染合成时使用。
---

# HyperFrames 的 TypeGPU / WebGPU

HyperFrames 通过其 `typegpu` 运行时适配器支持 TypeGPU 和原始 WebGPU。适配器不控制你的管线。它会发布 HyperFrames 时间并分发 seek 事件，使你的合成可以渲染精确的 GPU 帧。

## 契约

- 异步初始化 WebGPU（`await navigator.gpu.requestAdapter()`），但**同步**注册所有 GSAP 缓动 — 在任何 `await` 之前。HyperFrames 播放器在页面加载时立即读取时间线。
- 从 HyperFrames 时间渲染，而非 `performance.now()`。
- 监听 `hf-seek` 事件并在确切时间重新渲染。
- 防范 WebGPU 不可用的环境 — 适配器不会为你检查。
- 对于视频渲染，在提交 GPU 工作后调用 `await device.queue.onSubmittedWorkDone()` 以确保在帧被捕获前 canvas 已刷新。

适配器设置 `window.__hfTypegpuTime` 并在每次 seek 时分发 `new CustomEvent("hf-seek", { detail: { time } })`。

## 基本模式

```html
<canvas id="gpu-layer"></canvas>
<script>
  (async () => {
    if (!navigator.gpu) return;
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return;
    const device = await adapter.requestDevice();
    const canvas = document.getElementById("gpu-layer");
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext("webgpu");
    const fmt = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({ device, format: fmt, alphaMode: "opaque" });

    // 构建你的管线、缓冲区、绑定组...
    const timeUniform = new Float32Array([0]);
    const timeBuf = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    function render(t) {
      timeUniform[0] = t;
      device.queue.writeBuffer(timeBuf, 0, timeUniform);
      const enc = device.createCommandEncoder();
      const pass = enc.beginRenderPass({
        colorAttachments: [
          {
            view: ctx.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            storeOp: "store",
          },
        ],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();
      device.queue.submit([enc.finish()]);
    }

    render(0);
    window.addEventListener("hf-seek", (e) => render(e.detail.time));
  })();
</script>
```

## 时间线注册

驱动文本、字幕或 HTML 元素的 GSAP 缓动必须**同步**注册 — 在任何 `await` 之前：

```js
const tl = gsap.timeline({ paused: true });

// 字幕缓动：同步，在 WebGPU 初始化之前添加
gsap.set(".cap", { opacity: 0 });
tl.to("#cap-1", { opacity: 1, duration: 0.3 }, 1.0);
tl.to("#cap-1", { opacity: 0, duration: 0.2 }, 3.5);

window.__timelines["my-comp"] = tl;

// GPU 依赖的缓动可以放在 async IIFE 内部
(async () => {
  // ... WebGPU 初始化 ...
  const proxy = { value: 0 };
  tl.to(proxy, { value: 1, duration: 2, onUpdate: render }, 0.5);
})();
```

## 视频驱动效果（液态玻璃、扭曲）

将 `<video>` 用作 GPU 输入纹理：

```js
const videoEl = document.getElementById("aroll");

// 在创建纹理之前等待视频元数据
await new Promise((r) => {
  if (videoEl.readyState >= 1) r();
  else videoEl.addEventListener("loadedmetadata", r, { once: true });
});

// 以视频的原始分辨率创建纹理
const vw = videoEl.videoWidth,
  vh = videoEl.videoHeight;
const bgTex = device.createTexture({
  size: [vw, vh],
  format: "rgba8unorm",
  usage:
    GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
});

function render(t) {
  try {
    device.queue.copyExternalImageToTexture({ source: videoEl }, { texture: bgTex }, [vw, vh]);
  } catch (_) {
    /* 帧尚未解码 */
  }
  // ... 绘制 ...
}
```

**渲染模式注意事项：** 无头 Chrome 可能对 video 元素的 `copyExternalImageToTexture` 失败。对于生产渲染，通过 FFmpeg 预提取关键帧为 PNG，然后作为图像纹理加载。

## 通过降采样通道实现磨砂模糊

单通道高斯核对玻璃般的磨砂模糊效果太弱。使用双通道方法：

1. **通道 1 — 降采样：** 将全分辨率纹理渲染到小纹理（1/6 分辨率）。降采样期间的双线性过滤自然平均像素。
2. **通道 2 — 玻璃合成：** 采样小纹理用于磨砂内部（双线性放大 = 重度平滑模糊），采样全分辨率纹理用于清晰区域和色差折射。

这匹配了 TypeGPU 的 `textureSampleBias` mip 级别方法，无需生成 mipmap。

## 透明 vs 不透明 Canvas

- **`alphaMode: 'opaque'`** — GPU canvas 渲染完整帧（视频 + 效果）。当 GPU 管线处理所有视觉内容时使用。
- **`alphaMode: 'premultiplied'`** — GPU canvas 在 alpha = 0 处透明，允许下方的 HTML 元素透出。用于在常规 `<video>` 元素上方的叠加层（粒子、路径动画）。

## WGSL 全屏三角形

全屏效果的标准顶点着色器（无需顶点缓冲区）：

```wgsl
struct Vo { @builtin(position) pos: vec4f, @location(0) uv: vec2f }

@vertex fn vs(@builtin(vertex_index) vi: u32) -> Vo {
  let ps = array<vec2f, 3>(vec2f(-1., -1.), vec2f(3., -1.), vec2f(-1., 3.));
  let ts = array<vec2f, 3>(vec2f(0., 1.), vec2f(2., 1.), vec2f(0., -1.));
  return Vo(vec4f(ps[vi], 0., 1.), ts[vi]);
}
```

使用 `pass.draw(3)` 绘制 — 一个覆盖视口的三角形。

## 圆角矩形 SDF（液态玻璃胶囊）

```wgsl
fn sdf_box(p: vec2f, half_size: vec2f, corner_radius: f32) -> f32 {
  let d = abs(p) - half_size + vec2f(corner_radius);
  return length(max(d, vec2f(0.))) + min(max(d.x, d.y), 0.) - corner_radius;
}
```

使用它来定义玻璃效果的内部/环/外部区域。负值在形状内部。

## 确定性渲染

- 禁止 `Math.random()` — 使用种子 PRNG。
- 禁止 `requestAnimationFrame` 用于渲染循环 — 仅在响应 `hf-seek` 时渲染。
- 禁止 `performance.now()` 用于动画时间 — 读取 `window.__hfTypegpuTime` 或 `e.detail.time`。
- GPU 提交后，为渲染模式帧捕获调用 `await device.queue.onSubmittedWorkDone()`。
