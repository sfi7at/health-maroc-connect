import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pill, Newspaper, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buildHead } from "@/lib/seo";
import {
  formatMedicationTitle,
  formatPrice,
  medicationByIdQuery,
  relatedArticlesForMedicationQuery,
  relatedFaqsForMedicationQuery,
  relatedMedicationsQuery,
} from "@/lib/medications";
import { MedicationRow } from "./medicaments.index";

export const Route = createFileRoute("/medicaments/$id")({
  loader: async ({ params, context }) => {
    const med = await context.queryClient.ensureQueryData(medicationByIdQuery(params.id));
    if (!med) throw notFound();
    return { med };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Médicament introuvable — Vytalma" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const m = loaderData.med;
    const title = formatMedicationTitle(m);
    const desc =
      m.indication?.slice(0, 155) ??
      `${title}${m.laboratory ? ` — ${m.laboratory}` : ""}. Fiche médicament au Maroc.`;
    return buildHead({ title: `${title} — Vytalma`, description: desc, path: `/medicaments/${m.id}` });
  },
  errorComponent: MedicationError,
  notFoundComponent: MedicationNotFound,
  component: MedicationDetailPage,
});

function MedicationDetailPage() {
  const { id } = Route.useParams();
  const { data: med } = useQuery(medicationByIdQuery(id));
  const related = useQuery(relatedMedicationsQuery(med));
  const articles = useQuery(relatedArticlesForMedicationQuery(med));
  const faqs = useQuery(relatedFaqsForMedicationQuery(med));

  if (!med) return <DetailSkeleton />;

  const rows: { label: string; value: string | number | null }[] = [
    { label: "DCI", value: med.dci },
    { label: "Dosage", value: med.dosage },
    { label: "Forme", value: med.form },
    { label: "Présentation", value: med.presentation },
    { label: "Laboratoire", value: med.laboratory },
    { label: "Classe thérapeutique", value: med.therapeutic_class },
    { label: "Sous-classe", value: med.sub_class },
    { label: "Conditionnement", value: med.packaging },
    { label: "Spécification", value: med.specification },
    { label: "Tableau", value: med.schedule_table },
    { label: "Durée de conservation", value: med.shelf_life },
    { label: "Prix public", value: formatPrice(med.public_price) },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/medicaments">
          <ArrowLeft className="mr-1 h-4 w-4" /> Retour aux médicaments
        </Link>
      </Button>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Pill className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="t-h2 sm:t-h1 text-balance">{formatMedicationTitle(med)}</h1>
            {med.dci && (
              <p className="t-body-sm mt-1 text-muted-foreground">DCI : {med.dci}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {med.therapeutic_class && (
                <Badge variant="secondary" className="rounded-full">{med.therapeutic_class}</Badge>
              )}
              {med.sub_class && (
                <Badge variant="outline" className="rounded-full">{med.sub_class}</Badge>
              )}
              {med.schedule_table && (
                <Badge variant="outline" className="rounded-full">Tableau {med.schedule_table}</Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      <section className="mt-6">
        <h2 className="t-h3 mb-3">Informations produit</h2>
        <Card className="overflow-hidden">
          <dl className="divide-y">
            {rows
              .filter((r) => r.value !== null && r.value !== "")
              .map((r, i) => (
                <div
                  key={r.label}
                  className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-6 ${
                    i % 2 === 1 ? "bg-muted/40" : ""
                  }`}
                >
                  <dt className="t-body-sm w-full text-muted-foreground sm:w-56">{r.label}</dt>
                  <dd className="t-body font-medium">{r.value}</dd>
                </div>
              ))}
          </dl>
        </Card>
      </section>

      {med.indication && (
        <section className="mt-6">
          <h2 className="t-h3 mb-3">Indication</h2>
          <Card className="p-5">
            <p className="t-body whitespace-pre-line">{med.indication}</p>
          </Card>
        </section>
      )}

      {articles.data && articles.data.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-primary" />
            <h2 className="t-h3">Articles similaires</h2>
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
            {articles.data.map((a) => (
              <Link
                key={a.id}
                to="/content/$slug"
                params={{ slug: a.slug }}
                className="w-64 shrink-0 snap-start rounded-xl border bg-card p-4 transition hover:border-primary/50"
              >
                {a.cover_image && (
                  <img
                    src={a.cover_image}
                    alt=""
                    loading="lazy"
                    className="mb-3 h-32 w-full rounded-lg object-cover"
                  />
                )}
                <p className="t-h4 line-clamp-2">{a.title}</p>
                {a.excerpt && (
                  <p className="t-body-sm mt-1 line-clamp-2 text-muted-foreground">{a.excerpt}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {faqs.data && faqs.data.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            <h2 className="t-h3">Questions fréquentes</h2>
          </div>
          <Card className="p-2 sm:p-4">
            <Accordion type="single" collapsible>
              {faqs.data.map((f) => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
                  <AccordionContent className="whitespace-pre-line">{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </section>
      )}

      {related.data && related.data.length > 0 && (
        <section className="mt-8">
          <h2 className="t-h3 mb-3">Autres médicaments de la même catégorie</h2>
          <ul className="space-y-3">
            {related.data.map((m, i) => (
              <MedicationRow key={m.id} med={m} index={i} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

function MedicationNotFound() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <Pill className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <h1 className="t-h2 mb-2">Médicament introuvable</h1>
      <p className="t-body-sm mb-6 text-muted-foreground">
        Cette fiche n'existe pas ou a été retirée du catalogue.
      </p>
      <Button asChild>
        <Link to="/medicaments">Retour aux médicaments</Link>
      </Button>
    </div>
  );
}

function MedicationError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <h1 className="t-h2 mb-2">Une erreur est survenue</h1>
      <p className="t-body-sm mb-6 text-muted-foreground">
        Impossible de charger cette fiche médicament.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}