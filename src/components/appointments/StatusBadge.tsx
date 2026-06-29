import { Badge } from "@/components/ui/badge";
import { STATUS_META } from "@/lib/appointments";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: "", dot: "bg-muted-foreground" };
  return (
    <Badge variant="outline" className={cn("gap-1.5 border", meta.tone, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Badge>
  );
}