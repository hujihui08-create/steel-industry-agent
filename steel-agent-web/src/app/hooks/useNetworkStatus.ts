// ============================================================
// useNetworkStatus — 网络状态检测 Hook
// 监听 online/offline 事件，返回在线状态和恢复提示
// ============================================================

import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRecovery(true);
      setTimeout(() => setShowRecovery(false), 2400);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowRecovery(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, showRecovery };
}
