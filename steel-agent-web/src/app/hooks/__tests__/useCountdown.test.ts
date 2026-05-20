// ============================================================
// useCountdown Hook 单元测试
// 使用 vitest + @testing-library/react
// ============================================================

import { renderHook, act } from "@testing-library/react";
import { useCountdown } from "@/app/hooks/useCountdown";

// -----------------------------------------------------------
// Setup & Teardown: 使用假计时器
// -----------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// -----------------------------------------------------------
// 测试用例
// -----------------------------------------------------------

describe("useCountdown", () => {
  // -----------------------------------------------------------
  // 1. 初始状态：countdown 应为 0
  // -----------------------------------------------------------
  it("should have initial countdown of 0", () => {
    const { result } = renderHook(() => useCountdown());

    expect(result.current.countdown).toBe(0);
  });

  // -----------------------------------------------------------
  // 2. startCountdown(60)：countdown 应立即设为 60
  // -----------------------------------------------------------
  it("should set countdown to 60 immediately after startCountdown(60)", () => {
    const { result } = renderHook(() => useCountdown());

    act(() => {
      result.current.startCountdown(60);
    });

    expect(result.current.countdown).toBe(60);
  });

  // -----------------------------------------------------------
  // 3. 前进 1000ms（1 tick）：countdown 应变为 59
  // -----------------------------------------------------------
  it("should decrement to 59 after one second", () => {
    const { result } = renderHook(() => useCountdown());

    act(() => {
      result.current.startCountdown(60);
    });
    expect(result.current.countdown).toBe(60);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.countdown).toBe(59);
  });

  // -----------------------------------------------------------
  // 4. 前进 60000ms（60 秒）：countdown 应达到 0 并停止
  // -----------------------------------------------------------
  it("should reach 0 after 60 seconds and stop", () => {
    const { result } = renderHook(() => useCountdown());

    act(() => {
      result.current.startCountdown(60);
    });

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(result.current.countdown).toBe(0);

    // 额外再前进 5 秒，确保计时器已停止
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.countdown).toBe(0);
  });

  // -----------------------------------------------------------
  // 5. resetCountdown()：应清除倒计时并停止 interval
  // -----------------------------------------------------------
  it("should reset countdown to 0 and clear interval", () => {
    const { result } = renderHook(() => useCountdown());

    // 启动 60 秒倒计时
    act(() => {
      result.current.startCountdown(60);
    });
    expect(result.current.countdown).toBe(60);

    // 前进 5 秒
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.countdown).toBe(55);

    // 重置
    act(() => {
      result.current.resetCountdown();
    });
    expect(result.current.countdown).toBe(0);

    // 再前进 5 秒，应保持为 0
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.countdown).toBe(0);
  });

  // -----------------------------------------------------------
  // 6. 多次调用 startCountdown 应重启倒计时
  // -----------------------------------------------------------
  it("should restart countdown when startCountdown is called again", () => {
    const { result } = renderHook(() => useCountdown());

    // 首次启动
    act(() => {
      result.current.startCountdown(30);
    });
    expect(result.current.countdown).toBe(30);

    // 前进 10 秒
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.countdown).toBe(20);

    // 重新启动一个新的倒计时
    act(() => {
      result.current.startCountdown(60);
    });
    expect(result.current.countdown).toBe(60);

    // 前进 1 秒确认新倒计时正常运行
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.countdown).toBe(59);
  });
});
