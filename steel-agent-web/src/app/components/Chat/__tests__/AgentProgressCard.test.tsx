import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgentProgressCard from '../AgentProgressCard';
import type { AgentStepState } from '@/app/stores/chatStore';

// ===========================================================================
// Factory helper - create AgentStepState fixtures
// ===========================================================================
function makeStep(overrides: Partial<AgentStepState> = {}): AgentStepState {
  return {
    step: 0,
    status: 'pending',
    tool_name: 'query_steel_price',
    intent: '查询螺纹钢价格',
    ...overrides,
  };
}

// ===========================================================================
// 1. renders all pending steps
// ===========================================================================
describe('AgentProgressCard - pending steps', () => {
  it('should render all pending step labels', () => {
    const steps: AgentStepState[] = [
      makeStep({ step: 0, intent: '查询螺纹钢价格', tool_name: 'query_steel_price' }),
      makeStep({ step: 1, intent: '查询热卷价格', tool_name: 'query_steel_price' }),
      makeStep({ step: 2, intent: '计算报价', tool_name: 'calculate_quotation' }),
    ];

    render(<AgentProgressCard steps={steps} isActive />);

    expect(screen.getByText('查询螺纹钢价格')).toBeInTheDocument();
    expect(screen.getByText('查询热卷价格')).toBeInTheDocument();
    expect(screen.getByText('计算报价')).toBeInTheDocument();
  });

  it('should show 等待中 status text for pending steps', () => {
    const steps: AgentStepState[] = [
      makeStep({ step: 0, status: 'pending', intent: '查询螺纹钢价格' }),
    ];

    render(<AgentProgressCard steps={steps} isActive />);

    // Each pending step shows "等待中"
    const waitingLabels = screen.getAllByText('等待中');
    expect(waitingLabels).toHaveLength(1);
  });
});

// ===========================================================================
// 2. shows running state with spinner
// ===========================================================================
describe('AgentProgressCard - running state', () => {
  it('should render Loader2 spinner for running step', () => {
    const steps: AgentStepState[] = [
      makeStep({ step: 0, status: 'pending', intent: '查询产地' }),
      makeStep({ step: 1, status: 'running', intent: '查询螺纹钢价格' }),
      makeStep({ step: 2, status: 'pending', intent: '计算报价' }),
    ];

    render(<AgentProgressCard steps={steps} isActive />);

    // The running step's icon wrapper should have the animate-spin class (Loader2)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner?.tagName).toBe('svg');
  });

  it('should show 进行中... text for running step', () => {
    const steps: AgentStepState[] = [
      makeStep({ step: 0, status: 'running', intent: '查询螺纹钢价格' }),
    ];

    render(<AgentProgressCard steps={steps} isActive />);

    expect(screen.getByText('进行中...')).toBeInTheDocument();
  });

  it('should apply ink color to running step label', () => {
    const steps: AgentStepState[] = [
      makeStep({ step: 0, status: 'running', intent: '查询螺纹钢价格' }),
    ];

    const { container } = render(<AgentProgressCard steps={steps} isActive />);

    // Running step label should have text-steel-ink + font-medium
    const label = screen.getByText('查询螺纹钢价格');
    expect(label.className).toContain('text-steel-ink');
    expect(label.className).toContain('font-medium');
  });
});

// ===========================================================================
// 3. shows done state with checkmark
// ===========================================================================
describe('AgentProgressCard - done state', () => {
  it('should render Check icon with green color for done step', () => {
    const steps: AgentStepState[] = [
      makeStep({ step: 0, status: 'done', intent: '查询螺纹钢价格' }),
    ];

    const { container } = render(<AgentProgressCard steps={steps} isActive />);

    // The done icon wrapper should have text-steel-up (green) class
    const iconWrapper = container.querySelector('.text-steel-up');
    expect(iconWrapper).toBeInTheDocument();

    // The check svg should be inside the wrapper
    const checkIcon = iconWrapper?.querySelector('svg');
    expect(checkIcon).toBeInTheDocument();
  });

  it('should show 完成 text for done step', () => {
    const steps: AgentStepState[] = [
      makeStep({ step: 0, status: 'done', intent: '查询螺纹钢价格' }),
    ];

    render(<AgentProgressCard steps={steps} isActive />);

    expect(screen.getByText('完成')).toBeInTheDocument();
  });

  it('should apply body color to done step label', () => {
    const steps: AgentStepState[] = [
      makeStep({ step: 0, status: 'done', intent: '查询螺纹钢价格' }),
    ];

    render(<AgentProgressCard steps={steps} isActive />);

    const label = screen.getByText('查询螺纹钢价格');
    expect(label.className).toContain('text-steel-body');
  });
});

// ===========================================================================
// 4. shows failed state with X icon
// ===========================================================================
describe('AgentProgressCard - failed state', () => {
  it('should render X icon with red color for failed step', () => {
    const steps: AgentStepState[] = [
      makeStep({ step: 0, status: 'failed', intent: '查询螺纹钢价格' }),
    ];

    const { container } = render(<AgentProgressCard steps={steps} isActive />);

    // The failed icon wrapper should have text-steel-down (red) class
    const iconWrapper = container.querySelector('.text-steel-down');
    expect(iconWrapper).toBeInTheDocument();

    // The X svg should be inside the wrapper
    const xIcon = iconWrapper?.querySelector('svg');
    expect(xIcon).toBeInTheDocument();
  });

  it('should show 失败 text for failed step', () => {
    const steps: AgentStepState[] = [
      makeStep({ step: 0, status: 'failed', intent: '查询螺纹钢价格' }),
    ];

    render(<AgentProgressCard steps={steps} isActive />);

    expect(screen.getByText('失败')).toBeInTheDocument();
  });

  it('should apply red color to failed step label', () => {
    const steps: AgentStepState[] = [
      makeStep({ step: 0, status: 'failed', intent: '查询螺纹钢价格' }),
    ];

    render(<AgentProgressCard steps={steps} isActive />);

    const label = screen.getByText('查询螺纹钢价格');
    expect(label.className).toContain('text-steel-down');
  });
});

// ===========================================================================
// 5. shows progress count in header
// ===========================================================================
describe('AgentProgressCard - progress header', () => {
  it('should show "AI 正在分析并执行..." with progress count when active and running', () => {
    const steps: AgentStepState[] = [
      makeStep({ step: 0, status: 'done', intent: '查询产地' }),
      makeStep({ step: 1, status: 'running', intent: '查询螺纹钢价格' }),
      makeStep({ step: 2, status: 'pending', intent: '计算报价' }),
    ];

    render(<AgentProgressCard steps={steps} isActive />);

    expect(screen.getByText('AI 正在分析并执行...（1/3）')).toBeInTheDocument();
  });

  it('should show "执行完成" when no steps are running', () => {
    const steps: AgentStepState[] = [
      makeStep({ step: 0, status: 'done', intent: '查询螺纹钢价格' }),
      makeStep({ step: 1, status: 'done', intent: '计算报价' }),
    ];

    render(<AgentProgressCard steps={steps} isActive={false} />);

    expect(screen.getByText('执行完成（2/2）')).toBeInTheDocument();
  });

  it('should show correct done count', () => {
    const steps: AgentStepState[] = [
      makeStep({ step: 0, status: 'done', intent: '查询产地' }),
      makeStep({ step: 1, status: 'done', intent: '查询价格' }),
      makeStep({ step: 2, status: 'running', intent: '计算报价' }),
      makeStep({ step: 3, status: 'pending', intent: '生成报告' }),
    ];

    render(<AgentProgressCard steps={steps} isActive />);

    expect(screen.getByText('AI 正在分析并执行...（2/4）')).toBeInTheDocument();
  });
});

// ===========================================================================
// 6. renders error message for failed steps
// ===========================================================================
describe('AgentProgressCard - error messages', () => {
  it('should render error text for a failed step with error message', () => {
    const steps: AgentStepState[] = [
      makeStep({
        step: 0,
        status: 'failed',
        intent: '查询螺纹钢价格',
        error: '网络超时，请重试',
      }),
    ];

    render(<AgentProgressCard steps={steps} isActive />);

    expect(screen.getByText('网络超时，请重试')).toBeInTheDocument();
  });

  it('should render multiple error messages for multiple failed steps', () => {
    const steps: AgentStepState[] = [
      makeStep({
        step: 0,
        status: 'failed',
        intent: '查询螺纹钢价格',
        error: '连接超时',
      }),
      makeStep({
        step: 1,
        status: 'failed',
        intent: '查询热卷价格',
        error: '数据源不可用',
      }),
    ];

    render(<AgentProgressCard steps={steps} isActive />);

    expect(screen.getByText('连接超时')).toBeInTheDocument();
    expect(screen.getByText('数据源不可用')).toBeInTheDocument();
  });

  it('should not render error section when no failed steps have error', () => {
    const steps: AgentStepState[] = [
      makeStep({ step: 0, status: 'failed', intent: '查询价格' }),
      // failed but no error message
    ];

    const { container } = render(<AgentProgressCard steps={steps} isActive />);

    // No error detail section rendered (the border-t divider only appears when errors exist)
    const errorTexts = container.querySelectorAll('.text-steel-down');
    // We should have: status icon wrapper + status text + label text = 3 elements with text-steel-down
    // But NO error message element (which would be <p> with text-steel-down)
    const errorParagraphs = container.querySelectorAll(
      'p.text-steel-down',
    );
    expect(errorParagraphs).toHaveLength(0);
  });

  it('should apply red color to error message text', () => {
    const steps: AgentStepState[] = [
      makeStep({
        step: 0,
        status: 'failed',
        intent: '查询价格',
        error: '服务不可用',
      }),
    ];

    const { container } = render(<AgentProgressCard steps={steps} isActive />);

    // The error <p> is rendered with text-steel-down
    const errorEl = screen.getByText('服务不可用');
    expect(errorEl.className).toContain('text-steel-down');
    expect(errorEl.tagName).toBe('P');
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================
describe('AgentProgressCard - edge cases', () => {
  it('should return null when steps array is empty', () => {
    const { container } = render(<AgentProgressCard steps={[]} isActive />);

    expect(container.firstChild).toBeNull();
  });

  it('should use tool_name as label when intent is missing', () => {
    const steps: AgentStepState[] = [
      makeStep({ step: 0, status: 'pending', intent: undefined, tool_name: 'convert_unit' }),
    ];

    render(<AgentProgressCard steps={steps} isActive />);

    // When intent is missing, tool_name is used as the display label
    expect(screen.getByText('convert_unit')).toBeInTheDocument();
  });
});
