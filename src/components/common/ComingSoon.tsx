import { Sparkles } from "lucide-react";
import { EmptyState } from "./EmptyState";

export function ComingSoon({
  title = "Bientôt disponible",
  description = "Cette section sera connectée à de vraies données via Lovable Cloud, Google Places et notre réseau de professionnels vérifiés.",
}: {
  title?: string;
  description?: string;
}) {
  return <EmptyState icon={Sparkles} title={title} description={description} />;
}