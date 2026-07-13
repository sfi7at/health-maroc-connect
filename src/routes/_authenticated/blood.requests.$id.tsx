import { createFileRoute, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Droplet,
  Phone,
  MapPin,
  Hospital,
  Clock,
  AlertTriangle,
  User,
  Copy,
  MessageCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { bloodRequestByIdQuery } from "@/lib/blood-queries";
import { URGENCY_META } from "@/lib/categories";
import { formatRelativeFr } from "@/lib/format";
import { buildHead } from "@/lib/seo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/blood/requests/$id")({
  head: () =>
    buildHead({
      title: "Demande de sang — Vytalma",
      description: "Détails d'une demande de don de sang et contact du demandeur.",
    }),
  component: RequestDetailPage,
  errorComponent: () => <NotFound />,
  notFoundComponent: () => <NotFound />,
});

function NotFound() {
  return (
    <div className="grid place-items-center py-20 text-center">
      <p className="text-muted-foreground">Demande introuvable.</p>
      <Button asChild variant="ghost" className="mt-4">
        <Link to="/blood">Retour</Link>
      </Button>
    </div>
  );
}

function RequestDetailPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: req, isLoading } = useQuery(bloodRequestByIdQuery(id));

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("blood_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Annonce supprimée");
      queryClient.invalidateQueries({ queryKey: ["blood_requests"] });
      navigate({ to: "/blood" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-96 rounded-3xl" />;
  if (!req) return <NotFound />;
  const isOwner = !!user && req.requester_id === user.id;

  const u = URGENCY_META[req.urgency as keyof typeof URGENCY_META];
  const phone = req.contact_phone ?? "";
  const telHref = `tel:${phone.replace(/\s+/g, "")}`;
  const waHref = `https://wa.me/${phone.replace(/[^\d]/g, "")}`;

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success("Numéro copié");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" className="gap-2" onClick={() => router.history.back()}>
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
        {isOwner && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2 text-rose-600 hover:text-rose-700">
                <Trash2 className="h-4 w-4" /> Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cette annonce ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Les donneurs ne pourront plus voir votre demande.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    del.mutate();
                  }}
                  disabled={del.isPending}
                  className="gap-2 bg-rose-600 text-white hover:bg-rose-700"
                >
                  {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <PageHeader
        eyebrow="Demande de sang"
        title={req.patient_name}
        description={
          req.hospital_name
            ? `${req.hospital_name}${(req as { cities?: { name_fr?: string } }).cities?.name_fr ? " • " + (req as { cities?: { name_fr?: string } }).cities?.name_fr : ""}`
            : (req as { cities?: { name_fr?: string } }).cities?.name_fr ?? "Maroc"
        }
        icon={<Droplet className="h-5 w-5" />}
      />

      <section className="grid gap-4 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-0 bg-rose-500/10 text-rose-600 text-base font-bold">
            {req.blood_group}
          </Badge>
          <Badge className={`border-0 ${u.tint}`}>{u.label}</Badge>
          {req.is_emergency && (
            <Badge className="border-0 bg-rose-600 text-white">
              <AlertTriangle className="mr-1 h-3 w-3" /> URGENCE
            </Badge>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Publiée {formatRelativeFr(req.created_at)}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow icon={Droplet} label="Poches requises" value={`${req.units_needed}`} />
          {req.needed_by && (
            <InfoRow
              icon={Clock}
              label="Requis avant"
              value={new Date(req.needed_by).toLocaleString("fr-FR")}
            />
          )}
          {req.hospital_name && <InfoRow icon={Hospital} label="Établissement" value={req.hospital_name} />}
          {req.address && <InfoRow icon={MapPin} label="Adresse" value={req.address} />}
          {req.contact_name && <InfoRow icon={User} label="Contact" value={req.contact_name} />}
        </div>

        {req.notes && (
          <div className="rounded-2xl bg-muted/40 p-4 text-sm">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Notes médicales</p>
            <p className="whitespace-pre-wrap">{req.notes}</p>
          </div>
        )}
      </section>

      <section className="grid gap-3 rounded-3xl border border-border bg-gradient-to-br from-rose-50 to-white p-5 shadow-soft dark:from-rose-950/30 dark:to-card sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Phone className="h-4 w-4 text-rose-600" /> Contact du demandeur
        </div>
        <p className="text-2xl font-bold tracking-tight tabular-nums">{phone || "—"}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="gap-2" size="lg">
            <a href={telHref}>
              <Phone className="h-4 w-4" /> Appeler
            </a>
          </Button>
          <Button asChild variant="outline" className="gap-2" size="lg">
            <a href={waHref} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </Button>
          <Button variant="ghost" className="gap-2" size="lg" onClick={copyPhone}>
            <Copy className="h-4 w-4" /> Copier
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Merci de contacter le demandeur uniquement si vous pouvez donner ou l'aider. Respectez sa
          confidentialité.
        </p>
      </section>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Droplet;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}