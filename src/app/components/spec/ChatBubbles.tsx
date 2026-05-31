import { Section, Block } from "./Section";
import { Sparkles, User } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";

function AIBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 max-w-[85%]">
      <Avatar className="size-8 shrink-0 border border-neutral-200 bg-white">
        <AvatarFallback className="bg-white">
          <Sparkles className="size-4 text-neutral-900" strokeWidth={1.5} />
        </AvatarFallback>
      </Avatar>
      <div className="rounded-2xl rounded-tl-sm bg-neutral-50 border border-neutral-200/60 px-4 py-3 text-[15px] leading-[1.6] text-neutral-800">
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 max-w-[85%] ml-auto flex-row-reverse">
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="bg-neutral-900 text-white">
          <User className="size-4" strokeWidth={1.5} />
        </AvatarFallback>
      </Avatar>
      <div className="rounded-2xl rounded-tr-sm bg-neutral-900 text-white px-4 py-3 text-[15px] leading-[1.6]">
        {children}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex gap-3 max-w-[85%]">
      <Avatar className="size-8 shrink-0 border border-neutral-200 bg-white">
        <AvatarFallback className="bg-white">
          <Sparkles className="size-4 text-neutral-900" strokeWidth={1.5} />
        </AvatarFallback>
      </Avatar>
      <div className="rounded-2xl rounded-tl-sm bg-neutral-50 border border-neutral-200/60 px-4 py-3 flex gap-1.5">
        <span className="size-1.5 rounded-full bg-neutral-400 animate-pulse" />
        <span className="size-1.5 rounded-full bg-neutral-400 animate-pulse [animation-delay:120ms]" />
        <span className="size-1.5 rounded-full bg-neutral-400 animate-pulse [animation-delay:240ms]" />
      </div>
    </div>
  );
}

export { AIBubble, UserBubble, TypingBubble };

export function ChatBubbles() {
  return (
    <Section
      id="02"
      title="对话气泡"
      desc="基于 shadcn Avatar 构建头像，气泡本体使用 1px 描边 + 浅灰底色。AI 与用户气泡通过反色与圆角错位区分主体。"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Block label="AI 回复气泡 (Avatar + 自定义)">
          <div className="space-y-4">
            <AIBubble>您好，我是您的钢铁行业智能助手，请问有什么可以帮您？</AIBubble>
            <AIBubble>
              今日螺纹钢 HRB400E 20mm 上海价格 ¥3,850，较昨日 +12 元/吨。
            </AIBubble>
            <TypingBubble />
          </div>
        </Block>

        <Block label="用户气泡 / 引用追问">
          <div className="space-y-4">
            <UserBubble>螺纹钢今天什么价格？</UserBubble>
            <UserBubble>那热卷呢？</UserBubble>
            <div className="flex gap-3 max-w-[85%] ml-auto flex-row-reverse">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-neutral-900 text-white">
                  <User className="size-4" strokeWidth={1.5} />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="mb-1 rounded-lg border-l-2 border-neutral-300 bg-neutral-50 px-3 py-1.5 text-[12px] text-neutral-500">
                  引用 · 螺纹钢 HRB400E 20mm
                </div>
                <div className="rounded-2xl rounded-tr-sm bg-neutral-900 text-white px-4 py-3 text-[15px]">
                  100 吨送到上海多少钱？
                </div>
              </div>
            </div>
          </div>
        </Block>
      </div>
    </Section>
  );
}
