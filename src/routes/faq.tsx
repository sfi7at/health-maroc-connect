import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/faq")({
  component: FaqPage,
  head: () => ({
    meta: [
      { title: "FAQ — Questions fréquentes — Vytalma" },
      { name: "description", content: "Réponses aux questions fréquentes : rendez-vous, don du sang, pharmacies de garde, urgences." },
    ],
  }),
});

type Faq = { id: string; question: string; answer: string; category: string | null; language: string };

function FaqPage() {
  const items = useQuery({
    queryKey: ["public-faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs" as never)
        .select("id,question,answer,category,language")
        .eq("is_published", true)
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Faq[];
    },
  });

  const grouped: Record<string, Faq[]> = {};
  for (const f of items.data ?? []) {
    const key = f.category ?? "Général";
    (grouped[key] ??= []).push(f);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader icon={<HelpCircle className="h-5 w-5" />} title="Questions fréquentes" description="Tout ce qu'il faut savoir sur Vytalma." />
      {items.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Aucune question pour l'instant.</Card>
      ) : (
        Object.entries(grouped).map(([cat, list]) => (
          <section key={cat}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h2>
            <Accordion type="single" collapsible className="rounded-2xl border bg-card">
              {list.map((f) => (
                <AccordionItem key={f.id} value={f.id} className="px-4">
                  <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
                  <AccordionContent className="whitespace-pre-wrap text-muted-foreground">{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))
      )}
    </div>
  );
}