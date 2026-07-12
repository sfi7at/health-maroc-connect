import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Dev-only visual regression showcase.
 * Renders every typography-critical primitive with representative content
 * so Playwright can snapshot them in light and dark mode.
 *
 * URL: /dev/typography — public route, no data fetches, deterministic markup.
 */
export const Route = createFileRoute("/dev/typography")({
  head: () => ({
    meta: [
      { title: "Typography Showcase — HealthLink Maroc" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: TypographyShowcase,
});

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} data-vr-section={id} className="space-y-4 rounded-lg border bg-card p-6">
      <h2 className="t-h2">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function TypographyShowcase() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6 bg-background text-foreground">
      <header className="space-y-2" data-vr-section="headings">
        <p className="t-eyebrow">Design system</p>
        <h1 className="t-display">Typography showcase</h1>
        <p className="t-body">
          Reference surface used by visual regression tests to catch drift in shadcn primitives
          and the centralised <code>t-*</code> utilities.
        </p>
        <div className="space-y-1">
          <h1 className="t-h1">Heading 1 · t-h1</h1>
          <h2 className="t-h2">Heading 2 · t-h2</h2>
          <h3 className="t-h3">Heading 3 · t-h3</h3>
          <h4 className="t-h4">Heading 4 · t-h4</h4>
          <p className="t-body">Body — quick brown fox 0123456789.</p>
          <p className="t-body-sm">Body small — quick brown fox.</p>
          <p className="t-caption">Caption — quick brown fox.</p>
        </div>
      </header>

      <Section id="buttons" title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button>Default size</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section id="badges" title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </Section>

      <Section id="inputs" title="Inputs & Select">
        <Input placeholder="Rechercher un médecin, une pharmacie…" defaultValue="" />
        <Input defaultValue="Ahmed Benali" />
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Choisir une spécialité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Cardiologie</SelectItem>
            <SelectItem value="b">Dermatologie</SelectItem>
          </SelectContent>
        </Select>
      </Section>

      <Section id="dialog" title="Dialog (inline)">
        {/* Render Dialog primitives inline (not portalled) for a stable screenshot. */}
        <Dialog open modal={false}>
          <DialogContent
            className="static !translate-x-0 !translate-y-0 !left-auto !top-auto shadow-none"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Confirmer le rendez-vous</DialogTitle>
              <DialogDescription>
                Vous êtes sur le point de réserver un créneau. Vérifiez les informations avant de valider.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline">Annuler</Button>
              <Button>Confirmer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </Section>

      <Section id="table" title="Table">
        <Table>
          <TableCaption>Rendez-vous récents.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Spécialité</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Fatima Zahra</TableCell>
              <TableCell>Cardiologie</TableCell>
              <TableCell>12/07/2026</TableCell>
              <TableCell><Badge>Confirmé</Badge></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Youssef El Amrani</TableCell>
              <TableCell>Dermatologie</TableCell>
              <TableCell>15/07/2026</TableCell>
              <TableCell><Badge variant="secondary">En attente</Badge></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>
    </main>
  );
}