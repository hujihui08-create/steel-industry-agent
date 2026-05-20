// ============================================================
// NetworkStatus — 网络状态指示条
// 固定在页面顶部，断开时显示警告，恢复时显示成功提示（2.4s 后消失）
// 设计系统: 极简 · 1px 描边 · 仅语义色
// ============================================================

import { Wifi, WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/app/hooks/useNetworkStatus";

export function NetworkStatus() {
  const { isOnline, showRecovery } = useNetworkStatus();

  if (isOnline && !showRecovery) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {!isOnline && (
        <div
          className="flex items-center justify-center gap-2 bg-[#B45309]/10 border-b border-[#B45309]/20 px-4 py-2"
          role="alert"
          aria-live="assertive"
        >
          <WifiOff className="size-4 text-[#B45309]" strokeWidth={1.75} />
          <span className="text-[15px] leading-[1.6] text-[#B45309]">
            网络连接已断开
          </span>
        </div>
      )}
      {showRecovery && isOnline && (
        <div
          className="flex items-center justify-center gap-2 bg-[#1F7A4D]/10 border-b border-[#1F7A4D]/20 px-4 py-2"
          role="status"
          aria-live="polite"
        >
          <Wifi className="size-4 text-[#1F7A4D]" strokeWidth={1.75} />
          <span className="text-[15px] leading-[1.6] text-[#1F7A4D]">
            网络已恢复
          </span>
        </div>
      )}
    </div>
  );
}
