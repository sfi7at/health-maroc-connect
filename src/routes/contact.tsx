import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () =>
    buildHead({
      title: "Contact",
      description: "Contactez l'équipe HealthLink Maroc.",
      path: "/contact",
    }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Nous écrire"
        title="Contact"
        description="Une question, un partenariat, un signalement ? Nous sommes à l'écoute."
        icon={<Mail className="h-5 w-5" />}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <ContactTile icon={<Mail className="h-4 w-4" />} title="Email" value="contact@healthlink.ma" />
          <ContactTile icon={<Phone className="h-4 w-4" />} title="Téléphone" value="+212 5 22 00 00 00" />
          <ContactTile icon={<MessageCircle className="h-4 w-4" />} title="Support" value="Réponse sous 24h" />
        </div>
        <form className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" placeholder="Votre nom" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="vous@exemple.ma" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={5} placeholder="Comment pouvons-nous vous aider ?" />
          </div>
          <Button type="button" size="lg">Envoyer le message</Button>
        </form>
      </div>
    </div>
  );
}

function ContactTile({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}