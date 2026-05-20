import { ArrowLeft } from "lucide-react";

export interface PageHeaderProps {
  /** Page title. */
  title: string;
  /** Optional back button callback. When provided, shows an ArrowLeft button. */
  onBack?: () => void;
  /** Optional slot for right-side actions. */
  rightAction?: React.ReactNode;
}

export function PageHeader({ title, onBack, rightAction }: PageHeaderProps) {
  return (
    <header className="flex items-center h-14 px-4 border-b border-steel-line bg-steel-canvas shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="返回"
            className="inline-flex items-center justify-center w-9 h-9 -ml-1 rounded-md text-steel-ink hover:bg-steel-surface transition-colors duration-150 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
        )}

        <h1 className="text-[18px] leading-[1.4] font-medium text-steel-ink truncate">
          {title}
        </h1>
      </div>

      {rightAction && (
        <div className="flex items-center shrink-0 ml-3">
          {rightAction}
        </div>
      )}
    </header>
  );
}
