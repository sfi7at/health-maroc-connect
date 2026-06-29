import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, BadgeCheck, CalendarPlus, Crown, GraduationCap, Heart, Languages,
  MapPin, MessageCircle, Navigation, Phone, Share2, Star, Stethoscope, Clock,
  Wallet, Award, Globe, CheckCircle2, Accessibility,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MapView } from "@/components/common/MapView";
import { EmptyState } from "@/components/common/EmptyState";
import { DoctorReviews } from "@/components/doctors/DoctorReviews";
import {
  doctorByIdQuery, doctorReviewsQuery, readDoctorMeta, priceLabel, languageLabel,
} from "@/lib/doctors";
import { initialsOf } from "@/lib/format";
import { getOpenStatus, OPEN_STATUS_META, buildDirectionsUrl } from "@/lib/map-utils";
import { useFavorites } from "@/hooks/use-favorites";
import { buildHead } from "@/lib/seo";

const DAYS = [
  { key: "mon", label: "Lundi" },
  { key: "tue", label: "Mardi" },
  { key: "wed", label: "Mercredi" },
  { key: "thu", label: "Jeudi" },
  { key: "fri", label: "Vendredi" },
  { key: "sat", label: "Samedi" },
  { key: "sun", label: "Dimanche" },
];

export const Route = createFileRoute("/doctors/$id")({
  head: ({ params }) =>
    buildHead({
      title: "Profil du médecin — HealthLink Maroc",
      description: "Profil vérifié, horaires, prix, avis et prise de rendez-vous.",
      path: `/doctors/${params.id}`,
    }),
  component: DoctorProfile,
  notFoundComponent: () => (
    <EmptyState icon={Stethoscope} title="Médecin introuvable" description="Ce profil n'existe pas ou a été désactivé." />
  ),
  errorComponent: ({ error }) => (
    <EmptyState icon={Stethoscope} title="Erreur" description={error.message} />
  ),
});

function DoctorProfile() {
  const { id } = Route.useParams();
  const { data: doctor, isLoading } = useQuery(doctorByIdQuery(id));
  const { data: reviews = [] } = useQuery(doctorReviewsQuery(id));
  const fav = useFavorites();
  const isFav = fav.isFavorite(id);

  if (isLoading) return <ProfileSkeleton />;
  if (!doctor) throw notFound();

  const meta = readDoctorMeta(doctor);
  const open = getOpenStatus(doctor.working_hours);
  const openMeta = OPEN_STATUS_META[open];
  const specialties = (doctor.provider_specialties ?? []).map((s) => s.specialties).filter(Boolean) as { id: string; slug: string; name_fr: string }[];
  const price = priceLabel(meta);
  const hours = (doctor.working_hours ?? {}) as Record<string, { open?: string; close?: string } | null>;

  function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) navigator.share({ title: doctor!.name, url }).catch(() => {});
    else { navigator.clipboard.writeText(url); toast.success("Lien copié"); }
  }

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="gap-2 self-start">
        <Link to="/doctors"><ArrowLeft className="h-4 w-4" /> Médecins</Link>
      </Button>

      {/* HERO */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
      >
        <div className="relative h-48 bg-gradient-to-br from-emerald-500 to-teal-600 sm:h-64">
          {doctor.cover_image ? (
            <img src={doctor.cover_image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        </div>
        <div className="relative -mt-16 px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white text-foreground shadow-elevated ring-4 ring-card">
                {doctor.profile_image ? (
                  <img src={doctor.profile_image} alt={doctor.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold">{initialsOf(doctor.name)}</span>
                )}
              </div>
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  {doctor.is_premium ? <Badge className="gap-1 border-0 bg-amber-400 text-amber-950"><Crown className="h-3 w-3" /> Premium</Badge> : null}
                  {doctor.is_verified ? <Badge className="gap-1 border-0 bg-white text-foreground"><BadgeCheck className="h-3.5 w-3.5 text-primary" /> Vérifié</Badge> : null}
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${openMeta.tint}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${openMeta.dot}`} /> {openMeta.label}
                  </span>
                </div>
                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  {meta.title ? `${meta.title} ` : "Dr. "}{doctor.name}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {specialties.map((s) => s.name_fr).join(" · ") || (doctor.category === "dentist" ? "Dentiste" : "Médecin")}
                </p>
                {doctor.average_rating > 0 ? (
                  <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {doctor.average_rating.toFixed(1)}
                    <span className="text-muted-foreground">({doctor.reviews_count} avis)</span>
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="gap-2">
                <Link to="/appointments/book/$providerId" params={{ providerId: doctor.id }}>
                  <CalendarPlus className="h-4 w-4" /> Prendre RDV
                </Link>
              </Button>
              {doctor.phone ? (
                <Button asChild size="lg" variant="outline" className="gap-2">
                  <a href={`tel:${doctor.phone}`}><Phone className="h-4 w-4" /> Appeler</a>
                </Button>
              ) : null}
              <Button size="lg" variant="outline" className="px-3" aria-label="Favoris" onClick={() => fav.toggle(doctor.id)}>
                <Heart className={`h-4 w-4 ${isFav ? "fill-blood text-blood" : ""}`} />
              </Button>
              <Button size="lg" variant="outline" className="px-3" aria-label="Partager" onClick={share}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {meta.experience_years ? <Stat icon={Clock} label="Expérience" value={`${meta.experience_years} ans`} /> : null}
            {price ? <Stat icon={Wallet} label="Consultation" value={price} /> : null}
            {meta.languages?.length ? <Stat icon={Languages} label="Langues" value={meta.languages.map(languageLabel).join(", ")} /> : null}
            {doctor.cities?.name_fr ? <Stat icon={MapPin} label="Ville" value={meta.neighborhood ? `${meta.neighborhood}, ${doctor.cities.name_fr}` : doctor.cities.name_fr} /> : null}
          </div>
        </div>
      </motion.section>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto rounded-2xl">
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="reviews">Avis ({reviews.length})</TabsTrigger>
          <TabsTrigger value="hours">Horaires</TabsTrigger>
          <TabsTrigger value="location">Localisation</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {meta.bio || doctor.description ? (
                <Card title="Biographie">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {meta.bio ?? doctor.description}
                  </p>
                </Card>
              ) : null}

              {specialties.length ? (
                <Card title="Spécialités">
                  <div className="flex flex-wrap gap-2">
                    {specialties.map((s) => (
                      <Link key={s.id} to="/doctors/specialty/$slug" params={{ slug: s.slug }} className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/15">
                        {s.name_fr}
                      </Link>
                    ))}
                  </div>
                </Card>
              ) : null}

              {meta.education?.length ? (
                <Card title="Formation" icon={GraduationCap}>
                  <ul className="space-y-2 text-sm">
                    {meta.education.map((e, i) => (<li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {e}</li>))}
                  </ul>
                </Card>
              ) : null}

              {meta.certifications?.length ? (
                <Card title="Certifications" icon={Award}>
                  <ul className="space-y-2 text-sm">
                    {meta.certifications.map((e, i) => (<li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {e}</li>))}
                  </ul>
                </Card>
              ) : null}

              {meta.gallery?.length ? (
                <Card title="Galerie">
                  <div className="grid grid-cols-3 gap-2">
                    {meta.gallery.map((src, i) => (
                      <img key={i} src={src} alt="" loading="lazy" className="aspect-square rounded-xl object-cover" />
                    ))}
                  </div>
                </Card>
              ) : null}
            </div>

            <aside className="space-y-4">
              <Card title="Services">
                <ul className="space-y-2 text-sm">
                  <ServiceRow ok={!!meta.online_appointment} label="Téléconsultation" />
                  <ServiceRow ok={!!meta.home_visit} label="Visite à domicile" />
                  <ServiceRow ok={!!meta.online_appointment || true} label="Prise de RDV en ligne" />
                </ul>
              </Card>
              {meta.insurance_accepted?.length ? (
                <Card title="Assurances acceptées">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {meta.insurance_accepted.map((i) => (
                      <span key={i} className="rounded-full border border-border px-2.5 py-1">{i}</span>
                    ))}
                  </div>
                </Card>
              ) : null}
              {meta.accessibility?.length || meta.parking ? (
                <Card title="Accessibilité" icon={Accessibility}>
                  <ul className="space-y-2 text-sm">
                    {meta.parking ? <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Parking: {meta.parking}</li> : null}
                    {(meta.accessibility ?? []).map((e, i) => (<li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {e}</li>))}
                  </ul>
                </Card>
              ) : null}
              {meta.whatsapp ? (
                <Button asChild variant="outline" className="w-full gap-2">
                  <a href={`https://wa.me/${meta.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </Button>
              ) : null}
              {doctor.website ? (
                <Button asChild variant="outline" className="w-full gap-2">
                  <a href={doctor.website} target="_blank" rel="noreferrer">
                    <Globe className="h-4 w-4" /> Site web
                  </a>
                </Button>
              ) : null}
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="pt-6">
          <DoctorReviews providerId={doctor.id} reviews={reviews} />
        </TabsContent>

        <TabsContent value="hours" className="pt-6">
          <Card title="Horaires de consultation">
            <ul className="divide-y divide-border">
              {DAYS.map((d) => {
                const h = hours[d.key] ?? hours[d.label.toLowerCase()] ?? null;
                return (
                  <li key={d.key} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="font-medium">{d.label}</span>
                    <span className="text-muted-foreground">{h?.open && h?.close ? `${h.open} – ${h.close}` : "Fermé"}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-4 pt-6">
          <Card title="Adresse">
            <p className="text-sm text-muted-foreground">{doctor.address ?? "Adresse non renseignée"}</p>
            {doctor.latitude != null && doctor.longitude != null ? (
              <Button asChild className="mt-3 gap-2">
                <a href={buildDirectionsUrl({ lat: Number(doctor.latitude), lng: Number(doctor.longitude) })} target="_blank" rel="noreferrer">
                  <Navigation className="h-4 w-4" /> Itinéraire
                </a>
              </Button>
            ) : null}
          </Card>
          {doctor.latitude != null && doctor.longitude != null ? (
            <div className="overflow-hidden rounded-3xl border border-border">
              <MapView
                center={{ lat: Number(doctor.latitude), lng: Number(doctor.longitude) }}
                markers={[{ id: doctor.id, lat: Number(doctor.latitude), lng: Number(doctor.longitude), title: doctor.name }]}
                height="380px"
              />
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="faq" className="pt-6">
          <Card title="Questions fréquentes">
            {meta.faq?.length ? (
              <Accordion type="single" collapsible className="w-full">
                {meta.faq.map((f, i) => (
                  <AccordionItem key={i} value={`f-${i}`}>
                    <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                    <AccordionContent>{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune question fréquente publiée.</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: React.ElementType }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function ServiceRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center justify-between ${ok ? "" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={ok ? "text-primary" : "text-muted-foreground"}>{ok ? "Oui" : "—"}</span>
    </li>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-72 w-full rounded-3xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-40 lg:col-span-2" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
