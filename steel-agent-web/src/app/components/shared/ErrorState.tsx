import { AlertTriangle } from "lucide-react";

export interface ErrorStateProps {
  /** Error message to display. Defaults to "加载失败". */
  message?: string;
  /** Optional retry callback. When provided, a retry button appears. */
  onRetry?: () => void;
}

export function ErrorState({ message = "加载失败", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-4">
      <AlertTriangle
        className="h-10 w-10 text-steel-down"
        strokeWidth={1.75}
      />

      <p className="text-[15px] leading-[1.6] text-steel-body text-center">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          aria-label="重试"
          className="mt-2 inline-flex items-center rounded-full border border-steel-line px-4 py-2 text-[13px] text-steel-ink hover:bg-steel-surface transition-colors duration-150"
        >
          重试
        </button>
      )}
    </div>
  );
}
