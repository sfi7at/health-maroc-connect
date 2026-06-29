import { ShieldCheck, ShieldAlert, ShieldQuestion, BadgeCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trustBadgeMeta } from "@/lib/security";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  green: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  blue: "bg-sky-500/10 text-sky-700 border-sky-200",
  amber: "bg-amber-500/10 text-amber-700 border-amber-200",
  slate: "bg-muted text-muted-foreground border-border",
};

const ICON: Record<string, typeof ShieldCheck> = {
  official: BadgeCheck,
  verified: ShieldCheck,
  partial: ShieldAlert,
  unverified: ShieldQuestion,
};

export function TrustBadge({
  providerId,
  level,
  score,
  size = "md",
  className,
}: {
  providerId?: string;
  level?: string | null;
  score?: number | null;
  size?: "sm" | "md";
  className?: string;
}) {
  // If level/score not passed, fetch from provider_trust_scores
  const q = useQuery({
    queryKey: ["trust", providerId],
    enabled: !!providerId && (level == null || score == null),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("provider_trust_scores")
        .select("score, level")
        .eq("provider_id", providerId!)
        .maybeSingle();
      return data;
    },
  });

  const effLevel = level ?? q.data?.level ?? "unverified";
  const effScore = score ?? q.data?.score ?? null;
  const meta = trustBadgeMeta(effLevel);
  const Icon = ICON[effLevel] ?? ShieldQuestion;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium",
        TONE[meta.tone],
        size === "sm" ? "text-[10px]" : "text-xs",
        className,
      )}
      title={effScore != null ? `Score de confiance : ${effScore}/100` : meta.label}
    >
      <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      <span>{meta.label}</span>
      {effScore != null && size !== "sm" && (
        <span className="opacity-70">· {effScore}</span>
      )}
    </span>
  );
}
