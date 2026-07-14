import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  Loader2,
  BadgeAlert,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { useSelectedProvider } from "@/lib/provider-store";
import { supabase } from "@/integrations/supabase/client";
import {
  formatMad,
  pharmacyOwnedProductsQuery,
  productCategoriesQuery,
  signProductImage,
  type ProductWithPharmacy,
} from "@/lib/pharmacy-products";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider/products")({
  head: () =>
    buildHead({
      title: "Produits — Espace pharmacie",
      description: "Gérez votre catalogue de produits médicaux.",
      path: "/provider/products",
    }),
  component: ProviderProducts,
});

type Draft = {
  id?: string;
  name: string;
  brand: string;
  dosage_form: string;
  category_id: string;
  description: string;
  price_mad: string;
  compare_at_price_mad: string;
  stock: string;
  requires_prescription: boolean;
  is_active: boolean;
  is_featured: boolean;
  images: string[];
};

const EMPTY: Draft = {
  name: "",
  brand: "",
  dosage_form: "",
  category_id: "",
  description: "",
  price_mad: "",
  compare_at_price_mad: "",
  stock: "0",
  requires_prescription: false,
  is_active: true,
  is_featured: false,
  images: [],
};

function ProviderProducts() {
  const { provider } = useSelectedProvider();
  const qc = useQueryClient();
  const { data: products = [], isLoading } = useQuery(pharmacyOwnedProductsQuery(provider?.id));
  const { data: categories = [] } = useQuery(productCategoriesQuery());
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);

  const filtered = useMemo(() => {
    if (!q.trim()) return products;
    const needle = q.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        (p.brand ?? "").toLowerCase().includes(needle),
    );
  }, [q, products]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pharmacy_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacy_owned_products", provider?.id] });
      toast.success("Produit supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isPharmacy = provider?.category === "pharmacy";

  if (!isPharmacy) {
    return (
      <EmptyState
        icon={Package}
        title="Espace produits réservé aux pharmacies"
        description="Cette section est destinée aux comptes pharmacie. Sélectionnez une pharmacie dans votre liste d'établissements."
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Boutique"
        title="Produits"
        description="Publiez vos médicaments, parapharmacie et matériel médical."
        icon={<Package className="h-5 w-5" />}
        actions={
          <Button onClick={() => setDraft({ ...EMPTY })} className="gap-1.5">
            <Plus className="h-4 w-4" /> Nouveau produit
          </Button>
        }
      />

      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un produit…"
          className="h-11 border-0 bg-transparent focus-visible:ring-0"
        />
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-muted/50" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={q ? "Aucun résultat" : "Aucun produit encore"}
          description={q ? "Essayez un autre mot-clé." : "Ajoutez votre premier produit pour commencer à vendre."}
          action={
            !q ? (
              <Button onClick={() => setDraft({ ...EMPTY })} className="gap-1.5">
                <Plus className="h-4 w-4" /> Ajouter un produit
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              onEdit={() =>
                setDraft({
                  id: p.id,
                  name: p.name,
                  brand: p.brand ?? "",
                  dosage_form: p.dosage_form ?? "",
                  category_id: p.category_id ?? "",
                  description: p.description ?? "",
                  price_mad: String(p.price_mad),
                  compare_at_price_mad: p.compare_at_price_mad ? String(p.compare_at_price_mad) : "",
                  stock: String(p.stock),
                  requires_prescription: p.requires_prescription,
                  is_active: p.is_active,
                  is_featured: p.is_featured,
                  images: Array.isArray(p.images) ? (p.images as string[]) : [],
                })
              }
              onDelete={() => {
                if (window.confirm(`Supprimer "${p.name}" ?`)) del.mutate(p.id);
              }}
            />
          ))}
        </div>
      )}

      {draft ? (
        <ProductDialog
          draft={draft}
          onClose={() => setDraft(null)}
          categories={categories}
          pharmacyId={provider!.id}
          onSaved={() => {
            setDraft(null);
            qc.invalidateQueries({ queryKey: ["pharmacy_owned_products", provider?.id] });
          }}
        />
      ) : null}
    </div>
  );
}

function ProductRow({
  product,
  onEdit,
  onDelete,
}: {
  product: ProductWithPharmacy;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const images = Array.isArray(product.images) ? (product.images as string[]) : [];
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    if (images[0]) signProductImage(images[0]).then(setThumb);
  }, [images]);
  return (
    <article className="flex gap-3 rounded-3xl border border-border bg-card p-3 shadow-soft">
      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-muted">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold">{product.name}</h3>
            <p className="truncate text-xs text-muted-foreground">
              {product.brand ?? "—"} {product.dosage_form ? `· ${product.dosage_form}` : ""}
            </p>
          </div>
          <p className="shrink-0 text-sm font-bold text-primary">{formatMad(product.price_mad)}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {product.requires_prescription ? (
            <Badge className="gap-1 border-0 bg-amber-500/15 text-amber-700">
              <BadgeAlert className="h-3 w-3" /> Ordonnance requise
            </Badge>
          ) : (
            <Badge variant="secondary">OTC</Badge>
          )}
          {product.is_featured ? (
            <Badge className="gap-1 border-0 bg-fuchsia-500/15 text-fuchsia-700">
              <Sparkles className="h-3 w-3" /> Mis en avant
            </Badge>
          ) : null}
          {!product.is_active ? <Badge variant="outline">Inactif</Badge> : null}
          <Badge variant="outline">Stock : {product.stock}</Badge>
        </div>
        <div className="mt-2 flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1">
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="gap-1 text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Supprimer
          </Button>
        </div>
      </div>
    </article>
  );
}

function ProductDialog({
  draft,
  onClose,
  onSaved,
  categories,
  pharmacyId,
}: {
  draft: Draft;
  onClose: () => void;
  onSaved: () => void;
  categories: Array<{ id: string; name_fr: string }>;
  pharmacyId: string;
}) {
  const [state, setState] = useState<Draft>(draft);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setState((s) => ({ ...s, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!state.name.trim()) throw new Error("Nom requis");
      if (!state.price_mad) throw new Error("Prix requis");
      const payload = {
        pharmacy_id: pharmacyId,
        name: state.name.trim(),
        slug: slugify(state.name),
        brand: state.brand.trim() || null,
        dosage_form: state.dosage_form.trim() || null,
        category_id: state.category_id || null,
        description: state.description.trim() || null,
        price_mad: Number(state.price_mad),
        compare_at_price_mad: state.compare_at_price_mad ? Number(state.compare_at_price_mad) : null,
        stock: Number(state.stock) || 0,
        requires_prescription: state.requires_prescription,
        is_active: state.is_active,
        is_featured: state.is_featured,
        images: state.images,
      };
      if (state.id) {
        const { error } = await supabase.from("pharmacy_products").update(payload).eq("id", state.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pharmacy_products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(state.id ? "Produit modifié" : "Produit créé");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const path = `${pharmacyId}/${Date.now()}-${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage
          .from("pharmacy-products")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (error) throw error;
        uploaded.push(path);
      }
      set("images", [...state.images, ...uploaded]);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{state.id ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nom *</Label>
            <Input value={state.name} onChange={(e) => set("name", e.target.value)} className="mt-1 h-11 rounded-xl" />
          </div>
          <div>
            <Label>Marque</Label>
            <Input value={state.brand} onChange={(e) => set("brand", e.target.value)} className="mt-1 h-11 rounded-xl" />
          </div>
          <div>
            <Label>Forme (comprimé, sirop…)</Label>
            <Input value={state.dosage_form} onChange={(e) => set("dosage_form", e.target.value)} className="mt-1 h-11 rounded-xl" />
          </div>
          <div>
            <Label>Catégorie</Label>
            <Select value={state.category_id || "none"} onValueChange={(v) => set("category_id", v === "none" ? "" : v)}>
              <SelectTrigger className="mt-1 h-11 rounded-xl">
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name_fr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prix (MAD) *</Label>
            <Input
              type="number"
              step="0.01"
              value={state.price_mad}
              onChange={(e) => set("price_mad", e.target.value)}
              className="mt-1 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label>Prix barré (avant remise)</Label>
            <Input
              type="number"
              step="0.01"
              value={state.compare_at_price_mad}
              onChange={(e) => set("compare_at_price_mad", e.target.value)}
              className="mt-1 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label>Stock</Label>
            <Input
              type="number"
              value={state.stock}
              onChange={(e) => set("stock", e.target.value)}
              className="mt-1 h-11 rounded-xl"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={state.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className="mt-1 rounded-2xl"
            />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Toggle
              label="Ordonnance requise"
              hint="Le client devra téléverser une ordonnance avant la validation."
              checked={state.requires_prescription}
              onChange={(v) => set("requires_prescription", v)}
            />
            <Toggle label="Produit actif (visible)" checked={state.is_active} onChange={(v) => set("is_active", v)} />
            <Toggle label="Mettre en avant" checked={state.is_featured} onChange={(v) => set("is_featured", v)} />
          </div>

          <div className="sm:col-span-2">
            <Label>Photos</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {state.images.map((path, i) => (
                <ImageThumb
                  key={i}
                  path={path}
                  onRemove={() => set("images", state.images.filter((_, x) => x !== i))}
                />
              ))}
              <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-border bg-muted/30 text-xs text-muted-foreground hover:bg-muted">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <input type="file" accept="image/*" multiple onChange={onUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ImageThumb({ path, onRemove }: { path: string; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    signProductImage(path).then(setUrl);
  }, [path]);
  return (
    <div className="group relative h-20 w-20 overflow-hidden rounded-2xl border border-border">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 80) || `product-${Date.now()}`
  );
}