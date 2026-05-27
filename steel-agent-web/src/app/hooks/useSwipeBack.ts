// ============================================================
// useSwipeBack — 手势返回 Hook
// 检测触屏设备上的右滑手势（deltaX > 80px）触发返回
// ============================================================

import { useEffect, useRef, useCallback } from 'react';

interface SwipeBackOptions {
  /** 触发返回的最小水平滑动距离（px），默认 80 */
  threshold?: number;
  /** 是否启用（默认仅在 pointer: coarse 设备上启用） */
  enabled?: boolean;
}

/**
 * 触屏设备右滑返回 Hook
 *
 * 用法：
 * ```tsx
 * useSwipeBack(() => navigate(-1));
 * ```
 *
 * - 仅在 touch 设备（pointer: coarse）上激活
 * - 检测右滑手势：deltaX > threshold 且 水平位移 > 垂直位移
 */
export function useSwipeBack(onBack: () => void, options: SwipeBackOptions = {}) {
  const { threshold = 80 } = options;
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  });

  const touchRef = useRef<{
    startX: number;
    startY: number;
    tracking: boolean;
  }>({
    startX: 0,
    startY: 0,
    tracking: false,
  });

  const isTouchDeviceRef = useRef(false);

  // ---- 检测触屏设备 -------------------------------------------
  useEffect(() => {
    if (options.enabled !== undefined) {
      isTouchDeviceRef.current = options.enabled;
      return;
    }

    // 优先检查 matchMedia
    const mql = window.matchMedia('(pointer: coarse)');
    const update = () => {
      isTouchDeviceRef.current = mql.matches;
    };
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [options.enabled]);

  // ---- Touch handlers ----------------------------------------
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isTouchDeviceRef.current) return;
    const touch = e.touches[0];
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      tracking: true,
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isTouchDeviceRef.current || !touchRef.current.tracking) return;
    // 不做 preventDefault，避免干扰正常滚动
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isTouchDeviceRef.current || !touchRef.current.tracking) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchRef.current.startX;
    const deltaY = Math.abs(touch.clientY - touchRef.current.startY);

    // 右滑 + 水平位移 > 阈值 + 水平位移 > 垂直位移
    if (deltaX > threshold && deltaX > deltaY) {
      onBackRef.current();
    }

    touchRef.current.tracking = false;
  }, [threshold]);

  // ---- 绑定/解绑 Touch 事件 -----------------------------------
  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
}

export default useSwipeBack;
