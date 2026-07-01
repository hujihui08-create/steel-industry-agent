import { Tokens } from "./components/spec/Tokens";
import { ChatBubbles } from "./components/spec/ChatBubbles";
import { RichCards } from "./components/spec/RichCards";
import { InputBar } from "./components/spec/InputBar";
import { Atoms } from "./components/spec/Atoms";
import { Preview } from "./components/spec/Preview";
import { Motion } from "./components/spec/Motion";
import { Interaction } from "./components/spec/Interaction";
import { Voice } from "./components/spec/Voice";
import { Responsive } from "./components/spec/Responsive";
import { InteractiveChat } from "./components/spec/InteractiveChat";

const nav = [
  ["01", "Tokens"],
  ["02", "Bubbles"],
  ["03", "Cards"],
  ["04", "Composer"],
  ["05", "Atoms"],
  ["06", "Preview"],
  ["07", "Interactive"],
  ["08", "Motion"],
  ["09", "Interaction"],
  ["10", "Voice"],
  ["11", "Responsive"],
];

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-primary" />
            <span className="text-[14px] leading-[20px]">钢铁 Agent · Design System</span>
          </div>
          <nav className="hidden md:flex items-center gap-4 text-[12px] leading-[16px] text-muted-foreground">
            {nav.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="hover:text-foreground">
                <span className="text-muted-foreground/60 mr-1.5 font-mono">{id}</span>
                {label}
              </a>
            ))}
          </nav>
          <span className="text-[12px] leading-[16px] text-muted-foreground font-mono">v1.0 · 极简</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 pb-24">
        <section className="pt-20 pb-16">
          <div className="text-[12px] leading-[16px] tracking-[0.18em] uppercase text-muted-foreground mb-4">
            Component Specification
          </div>
          <h1 className="text-[56px] leading-[1.05] tracking-tight max-w-3xl">
            为钢铁行业 AI 助手而设计的<br />
            <span className="text-muted-foreground">极简组件规范</span>
          </h1>
          <p className="mt-6 max-w-xl text-muted-foreground leading-relaxed">
            一套服务于对话式智能体的视觉语言：以中性灰阶为底，单一墨色为强调，
            通过 1px 描边、克制的圆角与留白构建信息层级。覆盖对话气泡、富媒体卡片、
            输入栏、快捷指令等全部对话核心场景。
          </p>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-px bg-muted border border-border rounded-xl overflow-hidden">
            {[
              ["6", "组件分组"],
              ["32", "原子组件"],
              ["1", "强调色"],
              ["0", "拟物阴影"],
            ].map(([n, l]) => (
              <div key={l} className="bg-card px-6 py-5">
                <div className="text-[28px] tabular-nums">{n}</div>
                <div className="text-[12px] leading-[16px] text-muted-foreground mt-1">{l}</div>
              </div>
            ))}
          </div>
        </section>

        <Tokens />
        <ChatBubbles />
        <RichCards />
        <InputBar />
        <Atoms />
        <Preview />
        <InteractiveChat />
        <Motion />
        <Interaction />
        <Voice />
        <Responsive />

        <footer className="border-t border-border pt-10 mt-16 flex justify-between text-[12px] leading-[16px] text-muted-foreground">
          <span>钢铁行业 Agent · Design System v1.0</span>
          <span className="font-mono">© 2026 · Minimal</span>
        </footer>
      </main>
    </div>
  );
}
