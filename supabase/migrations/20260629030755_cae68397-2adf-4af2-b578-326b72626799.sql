
-- Staff helper
CREATE OR REPLACE FUNCTION public.has_any_admin_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','moderator','content_manager','verification_manager','support_agent','analytics_viewer')
  );
$$;

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type text NOT NULL,
  target_id uuid,
  category text NOT NULL DEFAULT 'other',
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolver_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports insert by authenticated" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports read self or staff" ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_any_admin_role(auth.uid()));

CREATE POLICY "reports staff update" ON public.reports
  FOR UPDATE TO authenticated
  USING (public.has_any_admin_role(auth.uid()))
  WITH CHECK (public.has_any_admin_role(auth.uid()));

CREATE POLICY "reports admin delete" ON public.reports
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_reports_status ON public.reports(status, created_at DESC);
CREATE INDEX idx_reports_target ON public.reports(target_type, target_id);

-- App settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL DEFAULT 'general',
  is_public boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings public read" ON public.app_settings
  FOR SELECT
  USING (is_public = true OR public.has_any_admin_role(auth.uid()));

CREATE POLICY "settings admin write" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default settings
INSERT INTO public.app_settings (key, value, category, is_public) VALUES
  ('platform_name', '"HealthLink Maroc"'::jsonb, 'branding', true),
  ('platform_tagline', '"Tous les services de santé du Maroc en une seule application."'::jsonb, 'branding', true),
  ('support_email', '"support@healthlink.ma"'::jsonb, 'contact', true),
  ('support_phone', '"+212 5XX-XXXXXX"'::jsonb, 'contact', true),
  ('social_links', '{"facebook":"","instagram":"","linkedin":"","twitter":""}'::jsonb, 'contact', true),
  ('default_language', '"fr"'::jsonb, 'general', true),
  ('maintenance_mode', 'false'::jsonb, 'system', true)
ON CONFLICT (key) DO NOTHING;
