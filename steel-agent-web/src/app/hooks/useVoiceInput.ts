import { useState, useRef, useCallback, useEffect } from "react";

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const SpeechRecognitionCtor =
    typeof window !== "undefined"
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;

  const isSupported = SpeechRecognitionCtor != null;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isActiveRef = useRef(false);
  const finalRef = useRef("");
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const startInstance = useCallback(() => {
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        // zh-CN：Chrome 会在每个 segment 前补空格（英文习惯），中文无需分隔
        const text = (result[0]?.transcript ?? "").trim();
        if (!text) continue;
        if (result.isFinal) {
          finalRef.current += text;
        } else {
          interim += text;
        }
      }
      setTranscript(finalRef.current + interim);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (!isActiveRef.current) return;
      restartTimeoutRef.current = setTimeout(() => {
        if (isActiveRef.current) {
          startInstance();
        }
      }, 200);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      recognitionRef.current = null;
      if (event.error === "aborted") return;
      if (event.error === "no-speech" || event.error === "audio-capture") {
        if (isActiveRef.current) {
          setTimeout(() => {
            if (isActiveRef.current) startInstance();
          }, 300);
        }
        return;
      }
      if (event.error === "not-allowed") {
        setError("未获得麦克风权限，请在浏览器设置中允许麦克风访问");
      } else {
        setError(event.message || `语音识别错误：${event.error}`);
      }
      isActiveRef.current = false;
      setIsListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      recognitionRef.current = null;
      setError("语音识别启动失败，请检查浏览器权限或刷新重试");
      isActiveRef.current = false;
      setIsListening(false);
    }
  }, [SpeechRecognitionCtor]);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionCtor) {
      setError("当前浏览器不支持语音识别，请使用 Chrome 浏览器");
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }

    setTranscript("");
    setError(null);
    finalRef.current = "";
    isActiveRef.current = true;
    setIsListening(true);

    startInstance();
  }, [SpeechRecognitionCtor, startInstance]);

  const stopListening = useCallback(() => {
    isActiveRef.current = false;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try { recognition.abort(); } catch { /* ignore */ }
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = undefined;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}

export default useVoiceInput;
