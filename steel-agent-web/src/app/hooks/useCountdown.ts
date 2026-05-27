import { useState, useEffect, useRef, useCallback } from "react";

export function useCountdown() {
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
      return;
    }
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [countdown]);

  const startCountdown = useCallback((seconds: number) => {
    setCountdown(seconds);
  }, []);

  const resetCountdown = useCallback(() => {
    setCountdown(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  return { countdown, startCountdown, resetCountdown };
}
