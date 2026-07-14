-- =========================================================================
-- Pharmacy E-commerce Foundation
-- =========================================================================

-- Enums --------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'pending_prescription',
    'pending_review',
    'approved',
    'rejected',
    'preparing',
    'ready_for_pickup',
    'out_for_delivery',
    'delivered',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_fulfillment AS ENUM ('pickup','delivery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.prescription_review_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- product_categories
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_fr TEXT NOT NULL,
  name_ar TEXT,
  name_en TEXT,
  parent_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_categories TO anon, authenticated;
GRANT ALL ON public.product_categories TO service_role;

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_categories readable by all"
  ON public.product_categories FOR SELECT
  USING (is_active = true OR public.has_any_admin_role(auth.uid()));

CREATE POLICY "product_categories admin write"
  ON public.product_categories FOR ALL
  USING (public.has_any_admin_role(auth.uid()))
  WITH CHECK (public.has_any_admin_role(auth.uid()));

CREATE TRIGGER trg_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed a starting set of pharmacy-relevant categories
INSERT INTO public.product_categories(slug, name_fr, name_ar, name_en, icon, sort_order) VALUES
  ('medicaments', 'Médicaments', 'أدوية', 'Medications', 'Pill', 10),
  ('otc', 'Sans ordonnance', 'بدون وصفة', 'Over-the-counter', 'Pill', 20),
  ('parapharmacie', 'Parapharmacie', 'شبه صيدلية', 'Parapharmacy', 'Sparkles', 30),
  ('bebe', 'Bébé & maternité', 'الأم والطفل', 'Baby & maternity', 'Baby', 40),
  ('cosmetiques', 'Cosmétiques', 'مستحضرات التجميل', 'Cosmetics', 'Sparkles', 50),
  ('hygiene', 'Hygiène', 'النظافة', 'Hygiene', 'Droplet', 60),
  ('materiel-medical', 'Matériel médical', 'معدات طبية', 'Medical equipment', 'Stethoscope', 70),
  ('premiers-secours', 'Premiers secours', 'إسعافات أولية', 'First aid', 'HeartPulse', 80),
  ('nutrition', 'Nutrition & sport', 'التغذية والرياضة', 'Nutrition & sport', 'Activity', 90),
  ('veterinaire', 'Vétérinaire', 'بيطري', 'Veterinary', 'Pill', 100)
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- pharmacy_products
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.pharmacy_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  dosage_form TEXT,
  sku TEXT,
  price_mad NUMERIC(10,2) NOT NULL CHECK (price_mad >= 0),
  compare_at_price_mad NUMERIC(10,2) CHECK (compare_at_price_mad IS NULL OR compare_at_price_mad >= 0),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  requires_prescription BOOLEAN NOT NULL DEFAULT false,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  promo_starts_at TIMESTAMPTZ,
  promo_ends_at TIMESTAMPTZ,
  avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  reviews_count INT NOT NULL DEFAULT 0,
  views_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pharmacy_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_products_pharmacy ON public.pharmacy_products(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_products_category ON public.pharmacy_products(category_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_products_active ON public.pharmacy_products(is_active, is_featured, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_products_name_trgm ON public.pharmacy_products USING GIN (name gin_trgm_ops);

GRANT SELECT ON public.pharmacy_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pharmacy_products TO authenticated;
GRANT ALL ON public.pharmacy_products TO service_role;

ALTER TABLE public.pharmacy_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products public read active"
  ON public.pharmacy_products FOR SELECT
  USING (
    is_active = true
    OR public.owns_provider(auth.uid(), pharmacy_id)
    OR public.has_any_admin_role(auth.uid())
  );

CREATE POLICY "products owner insert"
  ON public.pharmacy_products FOR INSERT
  WITH CHECK (public.owns_provider(auth.uid(), pharmacy_id));

CREATE POLICY "products owner update"
  ON public.pharmacy_products FOR UPDATE
  USING (public.owns_provider(auth.uid(), pharmacy_id) OR public.has_any_admin_role(auth.uid()))
  WITH CHECK (public.owns_provider(auth.uid(), pharmacy_id) OR public.has_any_admin_role(auth.uid()));

CREATE POLICY "products owner delete"
  ON public.pharmacy_products FOR DELETE
  USING (public.owns_provider(auth.uid(), pharmacy_id) OR public.has_any_admin_role(auth.uid()));

CREATE TRIGGER trg_pharmacy_products_updated_at
  BEFORE UPDATE ON public.pharmacy_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-slug on insert (per-pharmacy scope)
CREATE OR REPLACE FUNCTION public.pharmacy_products_autofill_slug()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  n INT := 1;
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    base := NULLIF(public.slugify(NEW.name), '');
    IF base IS NULL THEN base := 'produit'; END IF;
    candidate := base;
    WHILE EXISTS (
      SELECT 1 FROM public.pharmacy_products
      WHERE pharmacy_id = NEW.pharmacy_id AND lower(slug) = lower(candidate)
        AND id <> COALESCE(NEW.id, gen_random_uuid())
    ) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_pharmacy_products_slug
  BEFORE INSERT ON public.pharmacy_products
  FOR EACH ROW EXECUTE FUNCTION public.pharmacy_products_autofill_slug();

-- =========================================================================
-- pharmacy_product_reviews
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.pharmacy_product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.pharmacy_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);

GRANT SELECT ON public.pharmacy_product_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pharmacy_product_reviews TO authenticated;
GRANT ALL ON public.pharmacy_product_reviews TO service_role;

ALTER TABLE public.pharmacy_product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_reviews read approved"
  ON public.pharmacy_product_reviews FOR SELECT
  USING (status = 'approved' OR user_id = auth.uid() OR public.has_any_admin_role(auth.uid()));

CREATE POLICY "product_reviews own insert"
  ON public.pharmacy_product_reviews FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "product_reviews own update"
  ON public.pharmacy_product_reviews FOR UPDATE
  USING (user_id = auth.uid() OR public.has_any_admin_role(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.has_any_admin_role(auth.uid()));

CREATE POLICY "product_reviews own delete"
  ON public.pharmacy_product_reviews FOR DELETE
  USING (user_id = auth.uid() OR public.has_any_admin_role(auth.uid()));

CREATE TRIGGER trg_pharmacy_product_reviews_updated_at
  BEFORE UPDATE ON public.pharmacy_product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Refresh product aggregate rating
CREATE OR REPLACE FUNCTION public.refresh_pharmacy_product_rating(_product uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.pharmacy_products p SET
    avg_rating = COALESCE((SELECT AVG(rating)::numeric(3,2) FROM public.pharmacy_product_reviews WHERE product_id = _product AND status = 'approved'), 0),
    reviews_count = COALESCE((SELECT COUNT(*)::int FROM public.pharmacy_product_reviews WHERE product_id = _product AND status = 'approved'), 0)
  WHERE p.id = _product;
$$;

CREATE OR REPLACE FUNCTION public.tg_refresh_pharmacy_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_pharmacy_product_rating(OLD.product_id);
    RETURN OLD;
  ELSE
    PERFORM public.refresh_pharmacy_product_rating(NEW.product_id);
    RETURN NEW;
  END IF;
END $$;

CREATE TRIGGER trg_product_review_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.pharmacy_product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_pharmacy_product_rating();

-- =========================================================================
-- carts + cart_items
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.carts TO authenticated;
GRANT ALL ON public.carts TO service_role;

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carts own all"
  ON public.carts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.pharmacy_products(id) ON DELETE CASCADE,
  qty INT NOT NULL CHECK (qty > 0),
  unit_price_snapshot NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items(cart_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cart_items own all"
  ON public.cart_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));

CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- orders + order_items + order_prescriptions + order_events
-- =========================================================================
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 100000;

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('VYT-' || to_char(nextval('public.order_number_seq'), 'FM000000')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE RESTRICT,
  status public.order_status NOT NULL DEFAULT 'pending_review',
  fulfillment public.order_fulfillment NOT NULL DEFAULT 'pickup',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  contact_phone TEXT,
  delivery_address TEXT,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  notes TEXT,
  requires_prescription BOOLEAN NOT NULL DEFAULT false,
  payment_method TEXT NOT NULL DEFAULT 'pay_at_pharmacy' CHECK (payment_method IN ('pay_at_pharmacy','cash_on_delivery')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_pharmacy ON public.orders(pharmacy_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders buyer read"
  ON public.orders FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.owns_provider(auth.uid(), pharmacy_id)
    OR public.has_any_admin_role(auth.uid())
  );

CREATE POLICY "orders buyer insert"
  ON public.orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "orders update by parties"
  ON public.orders FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.owns_provider(auth.uid(), pharmacy_id)
    OR public.has_any_admin_role(auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.owns_provider(auth.uid(), pharmacy_id)
    OR public.has_any_admin_role(auth.uid())
  );

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper: is the current user a party to this order?
CREATE OR REPLACE FUNCTION public.can_access_order(_order uuid)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order
      AND (
        o.user_id = auth.uid()
        OR public.owns_provider(auth.uid(), o.pharmacy_id)
        OR public.has_any_admin_role(auth.uid())
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_order(uuid) TO authenticated;

-- order_items -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.pharmacy_products(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  image_snapshot TEXT,
  unit_price NUMERIC(10,2) NOT NULL,
  qty INT NOT NULL CHECK (qty > 0),
  requires_prescription BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items read parties"
  ON public.order_items FOR SELECT
  USING (public.can_access_order(order_id));

CREATE POLICY "order_items buyer insert"
  ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- order_prescriptions -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  mime TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_status public.prescription_review_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_prescriptions_order ON public.order_prescriptions(order_id);

GRANT SELECT, INSERT, UPDATE ON public.order_prescriptions TO authenticated;
GRANT ALL ON public.order_prescriptions TO service_role;

ALTER TABLE public.order_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_rx read parties"
  ON public.order_prescriptions FOR SELECT
  USING (public.can_access_order(order_id));

CREATE POLICY "order_rx buyer insert"
  ON public.order_prescriptions FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

CREATE POLICY "order_rx pharmacy or admin review"
  ON public.order_prescriptions FOR UPDATE
  USING (
    public.has_any_admin_role(auth.uid())
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.owns_provider(auth.uid(), o.pharmacy_id))
  )
  WITH CHECK (
    public.has_any_admin_role(auth.uid())
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.owns_provider(auth.uid(), o.pharmacy_id))
  );

CREATE TRIGGER trg_order_prescriptions_updated_at
  BEFORE UPDATE ON public.order_prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- order_events (status history) -------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status public.order_status,
  to_status public.order_status NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order ON public.order_events(order_id, created_at DESC);

GRANT SELECT, INSERT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_events read parties"
  ON public.order_events FOR SELECT
  USING (public.can_access_order(order_id));

CREATE POLICY "order_events parties insert"
  ON public.order_events FOR INSERT
  WITH CHECK (public.can_access_order(order_id));

-- Auto-log status changes
CREATE OR REPLACE FUNCTION public.tg_log_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_events(order_id, actor_id, from_status, to_status, note)
    VALUES (NEW.id, auth.uid(), NULL, NEW.status, 'Commande créée');
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_events(order_id, actor_id, from_status, to_status)
    VALUES (NEW.id, auth.uid(), OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_orders_log_status
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_log_order_status_change();

-- Notify buyer + pharmacy on order status change --------------------------
CREATE OR REPLACE FUNCTION public.notify_order_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pharmacy_owner uuid;
  v_pharmacy_name text;
  v_status text;
BEGIN
  SELECT owner_id, name INTO v_pharmacy_owner, v_pharmacy_name
  FROM public.providers WHERE id = NEW.pharmacy_id;

  IF TG_OP = 'INSERT' THEN
    IF v_pharmacy_owner IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, priority, title, body, action_url, action_label, data, dedupe_key)
      VALUES (
        v_pharmacy_owner,
        'system',
        'high'::notification_priority,
        'Nouvelle commande',
        'Commande ' || NEW.order_number || ' — ' || NEW.total || ' MAD',
        '/provider/orders/' || NEW.id::text,
        'Voir la commande',
        jsonb_build_object('order_id', NEW.id, 'kind', 'order_created'),
        'order:pharmacy:created:' || NEW.id::text
      )
      ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
    END IF;

    INSERT INTO public.notifications(user_id, type, priority, title, body, action_url, action_label, data, dedupe_key)
    VALUES (
      NEW.user_id,
      'system',
      'normal'::notification_priority,
      'Commande envoyée',
      'Votre commande ' || NEW.order_number || ' auprès de ' || COALESCE(v_pharmacy_name, 'la pharmacie') || ' a été reçue.',
      '/orders/' || NEW.id::text,
      'Suivre',
      jsonb_build_object('order_id', NEW.id, 'kind', 'order_created'),
      'order:buyer:created:' || NEW.id::text
    )
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_status := NEW.status::text;
    INSERT INTO public.notifications(user_id, type, priority, title, body, action_url, action_label, data, dedupe_key)
    VALUES (
      NEW.user_id,
      'system',
      (CASE WHEN v_status IN ('approved','rejected','ready_for_pickup','out_for_delivery','delivered','cancelled') THEN 'high' ELSE 'normal' END)::notification_priority,
      CASE v_status
        WHEN 'approved' THEN 'Commande approuvée'
        WHEN 'rejected' THEN 'Commande refusée'
        WHEN 'preparing' THEN 'Commande en préparation'
        WHEN 'ready_for_pickup' THEN 'Commande prête à retirer'
        WHEN 'out_for_delivery' THEN 'Commande en livraison'
        WHEN 'delivered' THEN 'Commande livrée'
        WHEN 'cancelled' THEN 'Commande annulée'
        ELSE 'Mise à jour de la commande'
      END,
      'Commande ' || NEW.order_number,
      '/orders/' || NEW.id::text,
      'Voir',
      jsonb_build_object('order_id', NEW.id, 'status', v_status, 'kind', 'order_status'),
      'order:buyer:status:' || NEW.id::text || ':' || v_status
    )
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_orders_notify
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_change();

-- =========================================================================
-- Realtime
-- =========================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object OR others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_items;
EXCEPTION WHEN duplicate_object OR others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacy_products;
EXCEPTION WHEN duplicate_object OR others THEN NULL; END $$;
