import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVoiceInput } from "@/app/hooks/useVoiceInput";

// ------------------------------------------------------------------
// Mock SpeechRecognition — 必须用 class 才能被 new 构造
// ------------------------------------------------------------------
const mockStart = vi.fn();
const mockStop = vi.fn();
const mockAbort = vi.fn();

let mockInstance: MockSpeechRecognition;

interface MockSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: { error: string; message: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
}

class MockSpeechRecognitionClass {
  lang = "";
  interimResults = false;
  continuous = false;
  maxAlternatives = 0;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string; message: string }) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  start = mockStart;
  stop = mockStop;
  abort = mockAbort;

  constructor() {
    // 每次 new 时捕获实例引用
    Object.assign(this, {
      start: mockStart,
      stop: mockStop,
      abort: mockAbort,
    });
    mockInstance = this as unknown as MockSpeechRecognition;
  }
}

describe("useVoiceInput", () => {
  beforeEach(() => {
    mockStart.mockReset();
    mockStop.mockReset();
    mockAbort.mockReset();
    Object.defineProperty(window, "SpeechRecognition", {
      value: MockSpeechRecognitionClass,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------
  describe("isSupported", () => {
    it("返回 true，当 SpeechRecognition 可用", () => {
      const { result } = renderHook(() => useVoiceInput());
      expect(result.current.isSupported).toBe(true);
    });

    it("返回 false，当 SpeechRecognition 不可用", () => {
      delete (window as Record<string, unknown>).SpeechRecognition;
      const { result } = renderHook(() => useVoiceInput());
      expect(result.current.isSupported).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  describe("startListening", () => {
    it("设置 isListening 为 true 并重置 transcript", () => {
      const { result } = renderHook(() => useVoiceInput());
      act(() => {
        result.current.startListening();
      });
      expect(result.current.isListening).toBe(true);
      expect(result.current.transcript).toBe("");
      expect(result.current.error).toBeNull();
      expect(mockStart).toHaveBeenCalledOnce();
    });

    it("当浏览器不支持时设置错误", () => {
      delete (window as Record<string, unknown>).SpeechRecognition;
      const { result } = renderHook(() => useVoiceInput());
      act(() => {
        result.current.startListening();
      });
      expect(result.current.isListening).toBe(false);
      expect(result.current.error).toContain("不支持语音识别");
    });
  });

  // ------------------------------------------------------------------
  describe("stopListening", () => {
    it("设置 isListening 为 false 并 abort", () => {
      const { result } = renderHook(() => useVoiceInput());
      act(() => {
        result.current.startListening();
      });
      expect(result.current.isListening).toBe(true);

      act(() => {
        result.current.stopListening();
      });
      expect(result.current.isListening).toBe(false);
      expect(mockAbort).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  describe("recognition.start() 抛出异常时", () => {
    it("报告错误并退出收听状态", () => {
      mockStart.mockImplementation(() => {
        throw new Error("Speech recognition unavailable");
      });

      const { result } = renderHook(() => useVoiceInput());
      act(() => {
        result.current.startListening();
      });

      expect(result.current.isListening).toBe(false);
      expect(result.current.error).toContain("语音识别启动失败");
    });
  });

  // ------------------------------------------------------------------
  describe("onresult 处理", () => {
    it("将 interim 和 final 结果合并到 transcript", () => {
      const { result } = renderHook(() => useVoiceInput());
      act(() => {
        result.current.startListening();
      });

      expect(mockInstance.onresult).not.toBeNull();
      act(() => {
        mockInstance.onresult?.({
          resultIndex: 0,
          results: {
            length: 1,
            0: {
              isFinal: false,
              length: 1,
              0: { transcript: "螺纹钢价格", confidence: 0.9 },
              item: vi.fn(),
              namedItem: vi.fn(),
            },
          } as unknown as SpeechRecognitionResultList,
        } as unknown as Event);
      });

      expect(result.current.transcript).toBe("螺纹钢价格");
    });

    it("累积 final 结果", () => {
      const { result } = renderHook(() => useVoiceInput());
      act(() => {
        result.current.startListening();
      });

      // 第一个 final 结果
      act(() => {
        mockInstance.onresult?.({
          resultIndex: 0,
          results: {
            length: 1,
            0: {
              isFinal: true,
              length: 1,
              0: { transcript: "今天", confidence: 0.9 },
              item: vi.fn(),
              namedItem: vi.fn(),
            },
          } as unknown as SpeechRecognitionResultList,
        } as unknown as Event);
      });

      expect(result.current.transcript).toBe("今天");

      // 第二个事件带 interim
      act(() => {
        mockInstance.onresult?.({
          resultIndex: 1,
          results: {
            length: 2,
            0: {
              isFinal: true,
              length: 1,
              0: { transcript: "今天", confidence: 0.9 },
              item: vi.fn(),
              namedItem: vi.fn(),
            },
            1: {
              isFinal: false,
              length: 1,
              0: { transcript: "螺纹钢", confidence: 0.85 },
              item: vi.fn(),
              namedItem: vi.fn(),
            },
          } as unknown as SpeechRecognitionResultList,
        } as unknown as Event);
      });

      expect(result.current.transcript).toBe("今天螺纹钢");
    });

    it("剔除 zh-CN segment 首尾空格（Chrome 习惯性前置空格）", () => {
      const { result } = renderHook(() => useVoiceInput());
      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockInstance.onresult?.({
          resultIndex: 0,
          results: {
            length: 1,
            0: {
              isFinal: true,
              length: 1,
              0: { transcript: " 螺纹钢", confidence: 0.9 },
              item: vi.fn(),
              namedItem: vi.fn(),
            },
          } as unknown as SpeechRecognitionResultList,
        } as unknown as Event);
      });

      act(() => {
        mockInstance.onresult?.({
          resultIndex: 1,
          results: {
            length: 2,
            0: {
              isFinal: true,
              length: 1,
              0: { transcript: " 螺纹钢", confidence: 0.9 },
              item: vi.fn(),
              namedItem: vi.fn(),
            },
            1: {
              isFinal: false,
              length: 1,
              0: { transcript: " 今日价格 ", confidence: 0.85 },
              item: vi.fn(),
              namedItem: vi.fn(),
            },
          } as unknown as SpeechRecognitionResultList,
        } as unknown as Event);
      });

      expect(result.current.transcript).toBe("螺纹钢今日价格");
    });
  });

  // ------------------------------------------------------------------
  describe("resetTranscript", () => {
    it("清空 transcript 和 error", () => {
      const { result } = renderHook(() => useVoiceInput());
      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockInstance.onresult?.({
          resultIndex: 0,
          results: {
            length: 1,
            0: {
              isFinal: true,
              length: 1,
              0: { transcript: "test", confidence: 0.9 },
              item: vi.fn(),
              namedItem: vi.fn(),
            },
          } as unknown as SpeechRecognitionResultList,
        } as unknown as Event);
      });

      expect(result.current.transcript).toBe("test");

      act(() => {
        result.current.resetTranscript();
      });

      expect(result.current.transcript).toBe("");
    });
  });

  // ------------------------------------------------------------------
  describe("cleanup on unmount", () => {
    it("abort 活动的 recognition", () => {
      const { result, unmount } = renderHook(() => useVoiceInput());
      act(() => {
        result.current.startListening();
      });

      unmount();
      expect(mockAbort).toHaveBeenCalled();
    });
  });
});
