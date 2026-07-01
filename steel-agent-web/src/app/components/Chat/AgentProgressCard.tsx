// ============================================================
// AgentProgressCard — Agent 执行步骤进度卡片
// 展示 Agent 多步执行过程中每一步的状态
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色 · 无阴影
// ============================================================

import { Check, Loader2, Circle, X } from 'lucide-react';
import type { AgentStepState } from '@/app/stores/chatStore';

interface AgentProgressCardProps {
  steps: AgentStepState[];
  isActive: boolean;
}

/** 单步骤状态行 */
function StepRow({ step }: { step: AgentStepState }) {
  const label = step.intent || step.tool_name;

  const statusText = (() => {
    switch (step.status) {
      case 'done':
        return '完成';
      case 'running':
        return '进行中...';
      case 'failed':
        return '失败';
      case 'pending':
      default:
        return '等待中';
    }
  })();

  const statusIcon = (() => {
    switch (step.status) {
      case 'done':
        return (
          <span className="text-steel-up flex items-center justify-center size-4">
            <Check className="size-3.5" strokeWidth={2.5} />
          </span>
        );
      case 'running':
        return (
          <span className="text-steel-ink flex items-center justify-center size-4">
            <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
          </span>
        );
      case 'failed':
        return (
          <span className="text-steel-down flex items-center justify-center size-4">
            <X className="size-3.5" strokeWidth={2.5} />
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="text-steel-placeholder flex items-center justify-center size-4">
            <Circle className="size-[5px] fill-current" strokeWidth={0} />
          </span>
        );
    }
  })();

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2.5 min-w-0">
        {statusIcon}
        <span
          className={`text-[13px] leading-[1.5] truncate ${
            step.status === 'done'
              ? 'text-steel-body'
              : step.status === 'running'
                ? 'text-steel-ink font-medium'
                : step.status === 'failed'
                  ? 'text-steel-down'
                  : 'text-steel-muted'
          }`}
        >
          {label}
        </span>
      </div>
      <span
        className={`text-[12px] leading-[1.5] shrink-0 ml-3 ${
          step.status === 'done'
            ? 'text-steel-up'
            : step.status === 'running'
              ? 'text-steel-ink'
              : step.status === 'failed'
                ? 'text-steel-down'
                : 'text-steel-placeholder'
        }`}
      >
        {statusText}
      </span>
    </div>
  );
}

export default function AgentProgressCard({ steps, isActive }: AgentProgressCardProps) {
  if (!steps.length) return null;

  const runningCount = steps.filter((s) => s.status === 'running').length;
  const doneCount = steps.filter((s) => s.status === 'done').length;

  return (
    <div className="rounded-2xl border border-steel-line bg-steel-surface px-4 py-3.5">
      {/* Header */}
      <p className="text-[13px] leading-[1.5] text-steel-muted mb-2">
        {isActive && runningCount > 0
          ? `AI 正在分析并执行...（${doneCount}/${steps.length}）`
          : `执行完成（${doneCount}/${steps.length}）`}
      </p>

      {/* Step list */}
      <div className="divide-y divide-steel-line/60">
        {steps.map((step) => (
          <StepRow key={step.step} step={step} />
        ))}
      </div>

      {/* Failed step error detail */}
      {steps.some((s) => s.status === 'failed' && s.error) && (
        <div className="mt-2 pt-2 border-t border-steel-line/60">
          {steps
            .filter((s) => s.status === 'failed' && s.error)
            .map((s) => (
              <p
                key={s.step}
                className="text-[12px] leading-[1.5] text-steel-down"
              >
                {s.error}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
