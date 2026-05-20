import { cn } from "@/lib/utils";

export interface LoadingSkeletonProps {
  /** Shape variant of the skeleton. */
  variant?: "card" | "list" | "text" | "chart";
  /** Number of skeleton items to render. */
  count?: number;
  /** Optional additional class name for the outer container. */
  className?: string;
}

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-steel-line",
        className,
      )}
      aria-hidden="true"
    />
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-steel-line p-5 space-y-4">
      <SkeletonBar className="h-4 w-2/3" />
      <SkeletonBar className="h-3 w-1/3" />
      <SkeletonBar className="h-8 w-1/2 mt-2" />
      <div className="space-y-2 pt-2">
        <SkeletonBar className="h-3 w-full" />
        <SkeletonBar className="h-3 w-4/5" />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 py-3">
        <SkeletonBar className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBar className="h-4 w-2/5" />
          <SkeletonBar className="h-3 w-3/5" />
        </div>
      </div>
      <div className="border-t border-steel-line" />
      <div className="flex items-center gap-3 py-3">
        <SkeletonBar className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBar className="h-4 w-1/2" />
          <SkeletonBar className="h-3 w-4/5" />
        </div>
      </div>
      <div className="border-t border-steel-line" />
      <div className="flex items-center gap-3 py-3">
        <SkeletonBar className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBar className="h-4 w-2/5" />
          <SkeletonBar className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}

function TextSkeleton() {
  return <SkeletonBar className="h-4 w-full" />;
}

function ChartSkeleton() {
  return (
    <div className="rounded-lg border border-steel-line p-5 space-y-4">
      <SkeletonBar className="h-4 w-1/3" />
      <SkeletonBar className="h-48 w-full rounded-lg" />
      <div className="flex gap-4">
        <SkeletonBar className="h-3 w-16" />
        <SkeletonBar className="h-3 w-16" />
        <SkeletonBar className="h-3 w-16" />
      </div>
    </div>
  );
}

const variantMap: Record<string, () => React.ReactNode> = {
  card: CardSkeleton,
  list: ListSkeleton,
  text: TextSkeleton,
  chart: ChartSkeleton,
};

export function LoadingSkeleton({
  variant = "card",
  count = 1,
  className,
}: LoadingSkeletonProps) {
  const renderer = variantMap[variant] ?? variantMap.card;

  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>{renderer()}</div>
      ))}
    </div>
  );
}
