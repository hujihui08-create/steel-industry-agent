import { CircleSlash } from "lucide-react";

export interface EmptyStateProps {
  /** Custom icon override. Defaults to CircleSlash. */
  icon?: React.ReactNode;
  /** Primary title text. */
  title: string;
  /** Optional secondary description. */
  description?: string;
  /** Optional action button. */
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-4">
      <div className="flex items-center justify-center text-steel-placeholder">
        {icon ?? <CircleSlash className="h-10 w-10" strokeWidth={1.75} />}
      </div>

      <p className="text-[15px] leading-[1.6] text-steel-body text-center">
        {title}
      </p>

      {description && (
        <p className="text-[12px] leading-[1.5] text-steel-muted text-center max-w-[280px]">
          {description}
        </p>
      )}

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          aria-label={action.label}
          className="mt-2 inline-flex items-center rounded-full border border-steel-line px-4 py-2 text-[13px] text-steel-ink hover:bg-steel-surface transition-colors duration-150"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
