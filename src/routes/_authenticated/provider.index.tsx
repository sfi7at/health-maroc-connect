import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarCheck, Eye, Heart, Star, Bell, BadgeCheck, AlertCircle, ArrowRight,
  CalendarRange, Users, ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { useSelectedProvider } from "@/lib/provider-store";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTimeFr } from "@/lib/format";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider/")({
  head: () => buildHead({ title: "Tableau de bord — Espace prestataire", description: "Vue d'ensemble de votre activité.", path: "/provider" }),
  component: ProviderHome,
});

function profileCompletion(p: {
  description: string | null; phone: string | null; email: string | null;
  address: string | null; profile_image: string | null; cover_image: string | null;
  website: string | null;
}) {
  const fields = [p.description, p.phone, p.email, p.address, p.profile_image, p.cover_image, p.website];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

function ProviderHome() {
  const { provider } = useSelectedProvider();
  const { user } = useAuth();
  const id = provider?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["provider_home", id, user?.id],
    enabled: !!id,
    queryFn: async () => {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
      const [profile, todays, upcoming, favCount, reviews, notif] = await Promise.all([
        supabase.from("providers").select("description, phone, email, address, profile_image, cover_image, website, average_rating, reviews_count, is_verified").eq("id", id!).maybeSingle(),
        supabase.from("appointments").select("id, status, scheduled_for, reason, profiles:patient_id(full_name)").eq("provider_id", id!).gte("scheduled_for", todayStart.toISOString()).lte("scheduled_for", todayEnd.toISOString()).order("scheduled_for"),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("provider_id", id!).gt("scheduled_for", todayEnd.toISOString()).in("status", ["pending","approved"]),
        supabase.from("favorites").select("provider_id", { count: "exact", head: true }).eq("provider_id", id!),
        supabase.from("reviews").select("id, rating, comment, created_at, profiles:author_id(full_name, avatar_url)").eq("provider_id", id!).order("created_at", { ascending: false }).limit(3),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("is_read", false),
      ]);
      return {
        profile: profile.data,
        todays: todays.data ?? [],
        upcomingCount: upcoming.count ?? 0,
        favoritesCount: favCount.count ?? 0,
        reviews: reviews.data ?? [],
        unread: notif.count ?? 0,
      };
    },
  });

  if (!provider) return null;
  if (isLoading || !data) return <Skeleton className="h-96 rounded-3xl" />;

  const completion = data.profile ? profileCompletion(data.profile) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tableau de bord"
        title={`Bonjour, ${provider.name}`}
        description="Vue d'ensemble de votre activité aujourd'hui."
        actions={
          <Button asChild variant="outline" className="gap-2">
            <Link to="/provider/appointments">Voir mes RDV <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="RDV aujourd'hui" value={data.todays.length} icon={CalendarCheck} tone="from-emerald-500 to-teal-600" />
        <Kpi label="À venir" value={data.upcomingCount} icon={CalendarRange} tone="from-sky-500 to-blue-600" />
        <Kpi label="Favoris" value={data.favoritesCount} icon={Heart} tone="from-rose-500 to-pink-600" />
        <Kpi label="Note moyenne" value={(data.profile?.average_rating ?? 0).toFixed(1)} icon={Star} tone="from-amber-500 to-orange-600" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Avis" value={data.profile?.reviews_count ?? 0} icon={Star} tone="from-violet-500 to-fuchsia-600" />
        <Kpi label="Vues du profil" value="—" icon={Eye} tone="from-slate-500 to-zinc-600" hint="Bientôt" />
        <Kpi label="Apparitions recherche" value="—" icon={Users} tone="from-cyan-500 to-sky-600" hint="Bientôt" />
        <Kpi label="Notifications" value={data.unread} icon={Bell} tone="from-indigo-500 to-violet-600" />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Rendez-vous d'aujourd'hui</h2>
            <Badge variant="secondary">{data.todays.length}</Badge>
          </div>
          {data.todays.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Aucun rendez-vous prévu aujourd'hui.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.todays.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-2xl border border-border bg-background/40 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {/* @ts-expect-error nested join */}
                      {a.profiles?.full_name ?? "Patient"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTimeFr(a.scheduled_for)}</p>
                  </div>
                  <Badge variant="outline">{a.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h3 className="text-sm font-bold">Complétion du profil</h3>
            <p className="mt-1 text-xs text-muted-foreground">Un profil complet améliore votre visibilité.</p>
            <Progress value={completion} className="mt-3" />
            <p className="mt-2 text-xs font-semibold">{completion}%</p>
            <Button asChild size="sm" variant="outline" className="mt-3 w-full">
              <Link to="/provider/profile">Compléter mon profil</Link>
            </Button>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h3 className="text-sm font-bold">Vérification</h3>
            <div className="mt-2">
              {data.profile?.is_verified ? (
                <Badge className="gap-1 border-0 bg-emerald-500/15 text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" /> Vérifié</Badge>
              ) : (
                <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3.5 w-3.5" /> En attente</Badge>
              )}
            </div>
            <Button asChild size="sm" variant="outline" className="mt-3 w-full gap-2">
              <Link to="/provider/verification"><ShieldCheck className="h-4 w-4" /> Documents</Link>
            </Button>
          </div>
        </aside>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Avis récents</h2>
        {data.reviews.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Aucun avis pour le moment.</p>
        ) : (
          <ul className="space-y-3">
            {data.reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {/* @ts-expect-error nested join */}
                    {r.profiles?.full_name ?? "Patient"}
                  </p>
                  <div className="flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5 fill-current" /><span className="text-xs font-semibold">{r.rating.toFixed(1)}</span></div>
                </div>
                {r.comment ? <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, tone, hint }: { label: string; value: string | number; icon: React.ElementType; tone: string; hint?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-soft">
      <div className={`mb-2 grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br ${tone} text-white`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </motion.div>
  );
}