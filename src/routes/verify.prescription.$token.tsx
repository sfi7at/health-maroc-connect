import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, FileText, ShieldAlert, ShieldCheck, Stethoscope } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { verifyPrescriptionByToken } from "@/lib/prescriptions";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/verify/prescription/$token")({
  head: () => buildHead({
    title: "Vérification d'ordonnance — HealthLink Maroc",
    description: "Vérifiez l'authenticité d'une ordonnance médicale numérique.",
    path: "/verify/prescription",
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { token } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["verify_prescription", token],
    queryFn: () => verifyPrescriptionByToken(token),
    retry: false,
  });

  const isExpired = data?.expires_at ? new Date(data.expires_at) < new Date() : false;
  const isValid = !!data && data.status === "active" && !isExpired;

  return (
    <main className="min-h-dvh bg-gradient-to-b from-[#0B2545] to-[#0E8C7F] px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="text-center text-white">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur">
            <FileText className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-2xl font-bold">Vérification d'ordonnance</h1>
          <p className="mt-1 text-sm text-white/70">HealthLink Maroc · Système national de vérification</p>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-2xl dark:bg-card">
          {isLoading ? (
            <Skeleton className="h-40" />
          ) : error || !data ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <ShieldAlert className="h-10 w-10 text-destructive" />
              <h2 className="text-lg font-bold">Ordonnance introuvable</h2>
              <p className="text-sm text-muted-foreground">
                Ce QR code n'est pas reconnu ou a été révoqué.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className={`flex items-center gap-3 rounded-2xl p-4 ${
                isValid ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/10 text-amber-800 dark:text-amber-200"
              }`}>
                {isValid ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
                <div>
                  <p className="font-semibold">
                    {isValid ? "Ordonnance authentique" : isExpired ? "Ordonnance expirée" : `Statut : ${data.status}`}
                  </p>
                  <p className="text-xs opacity-80">
                    Émise le {new Date(data.prescribed_at).toLocaleDateString("fr-FR")}
                    {data.expires_at ? ` · Valable jusqu'au ${new Date(data.expires_at).toLocaleDateString("fr-FR")}` : ""}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Patient" value={data.patient_name} />
                <Field label="Praticien" value={
                  <span className="inline-flex items-center gap-1">
                    <Stethoscope className="h-3.5 w-3.5" />{data.provider_name}
                    {data.provider_verified ? <BadgeCheck className="h-3.5 w-3.5 text-primary" /> : null}
                  </span>
                } />
                {data.diagnosis ? <Field label="Diagnostic" value={data.diagnosis} full /> : null}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Médicaments</p>
                <ol className="mt-2 space-y-2">
                  {(data.items ?? []).map((it, i) => (
                    <li key={i} className="rounded-2xl border border-border p-3">
                      <p className="text-sm font-semibold">{i + 1}. {it.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[it.dosage, it.frequency, it.duration].filter(Boolean).join(" • ")}
                      </p>
                      {it.instructions ? <p className="mt-1 text-xs">{it.instructions}</p> : null}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span>ID : {data.id.slice(0, 8).toUpperCase()}</span>
                <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" />Vérifié en base</Badge>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value ?? "—"}</p>
    </div>
  );
}