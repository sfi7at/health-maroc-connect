import { cn } from "@/lib/utils";

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

export function CardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <LoadingSkeleton className="h-12 w-12 rounded-full" />
          <LoadingSkeleton className="mt-4 h-4 w-2/3" />
          <LoadingSkeleton className="mt-2 h-3 w-1/2" />
          <LoadingSkeleton className="mt-5 h-9 w-full" />
        </div>
      ))}
    </div>
  );
}