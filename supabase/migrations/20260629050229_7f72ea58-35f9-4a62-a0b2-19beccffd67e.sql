
-- ============ API METRICS ============
CREATE TABLE public.api_metrics (
  id BIGSERIAL PRIMARY KEY,
  route TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INT NOT NULL,
  duration_ms INT NOT NULL,
  user_id UUID,
  region TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_metrics_created ON public.api_metrics (created_at DESC);
CREATE INDEX idx_api_metrics_route ON public.api_metrics (route, created_at DESC);
CREATE INDEX idx_api_metrics_slow ON public.api_metrics (duration_ms DESC) WHERE duration_ms > 1000;
GRANT SELECT ON public.api_metrics TO authenticated;
GRANT INSERT ON public.api_metrics TO authenticated;
GRANT USAGE ON SEQUENCE public.api_metrics_id_seq TO authenticated;
GRANT ALL ON public.api_metrics TO service_role;
GRANT ALL ON SEQUENCE public.api_metrics_id_seq TO service_role;
ALTER TABLE public.api_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_insert_any_auth" ON public.api_metrics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "metrics_select_admin" ON public.api_metrics FOR SELECT TO authenticated
  USING (public.has_any_admin_role(auth.uid()));

-- ============ ERROR REPORTS ============
CREATE TABLE public.error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('debug','info','warning','error','fatal')),
  source TEXT NOT NULL DEFAULT 'client' CHECK (source IN ('client','server','edge','worker')),
  url TEXT,
  user_id UUID,
  user_agent TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurrences INT NOT NULL DEFAULT 1,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_error_fingerprint ON public.error_reports (fingerprint);
CREATE INDEX idx_error_last_seen ON public.error_reports (last_seen DESC) WHERE resolved = false;
GRANT SELECT, INSERT, UPDATE ON public.error_reports TO authenticated;
GRANT ALL ON public.error_reports TO service_role;
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "errors_insert_any_auth" ON public.error_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "errors_select_admin" ON public.error_reports FOR SELECT TO authenticated
  USING (public.has_any_admin_role(auth.uid()));
CREATE POLICY "errors_update_admin" ON public.error_reports FOR UPDATE TO authenticated
  USING (public.has_any_admin_role(auth.uid()));

-- ============ HEALTH CHECKS ============
CREATE TABLE public.system_health_checks (
  id BIGSERIAL PRIMARY KEY,
  component TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy','degraded','down')),
  latency_ms INT,
  details JSONB DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_health_recent ON public.system_health_checks (component, checked_at DESC);
GRANT SELECT ON public.system_health_checks TO authenticated;
GRANT ALL ON public.system_health_checks TO service_role;
ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "health_select_admin" ON public.system_health_checks FOR SELECT TO authenticated
  USING (public.has_any_admin_role(auth.uid()));

-- ============ ANALYTICS EVENTS ============
CREATE TABLE public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_category TEXT,
  user_id UUID,
  session_id TEXT,
  city_id UUID,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  url TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_analytics_event ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX idx_analytics_user ON public.analytics_events (user_id, created_at DESC);
CREATE INDEX idx_analytics_created ON public.analytics_events (created_at DESC);
GRANT INSERT ON public.analytics_events TO authenticated, anon;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT USAGE ON SEQUENCE public.analytics_events_id_seq TO authenticated, anon;
GRANT ALL ON public.analytics_events TO service_role;
GRANT ALL ON SEQUENCE public.analytics_events_id_seq TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics_insert_anyone" ON public.analytics_events FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "analytics_select_admin" ON public.analytics_events FOR SELECT TO authenticated
  USING (public.has_any_admin_role(auth.uid()));

-- ============ BACKUP RUNS ============
CREATE TABLE public.backup_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('database','storage','full')),
  status TEXT NOT NULL CHECK (status IN ('running','success','failed')),
  size_bytes BIGINT,
  duration_ms INT,
  location TEXT,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX idx_backup_started ON public.backup_runs (started_at DESC);
GRANT SELECT ON public.backup_runs TO authenticated;
GRANT ALL ON public.backup_runs TO service_role;
ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "backups_select_admin" ON public.backup_runs FOR SELECT TO authenticated
  USING (public.has_any_admin_role(auth.uid()));

-- ============ FEATURE FLAGS ============
CREATE TABLE public.feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percent INT NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
  environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('development','staging','production','all')),
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_read_all" ON public.feature_flags FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "flags_admin_write" ON public.feature_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ LAUNCH CHECKLIST ============
CREATE TABLE public.launch_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','skipped')),
  owner UUID,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.launch_checklist_items TO authenticated;
GRANT ALL ON public.launch_checklist_items TO service_role;
ALTER TABLE public.launch_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist_read_staff" ON public.launch_checklist_items FOR SELECT TO authenticated
  USING (public.has_any_admin_role(auth.uid()));
CREATE POLICY "checklist_update_admin" ON public.launch_checklist_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_checklist_updated BEFORE UPDATE ON public.launch_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SEED LAUNCH CHECKLIST ============
INSERT INTO public.launch_checklist_items (category, title, priority) VALUES
  ('Infrastructure', 'PostgreSQL backups configured (daily, 30-day retention)', 'critical'),
  ('Infrastructure', 'Point-in-time recovery verified', 'critical'),
  ('Infrastructure', 'CDN configured for static assets', 'high'),
  ('Infrastructure', 'Storage buckets sized for production load', 'high'),
  ('Infrastructure', 'Database connection pool tuned', 'high'),
  ('Security', 'All RLS policies reviewed', 'critical'),
  ('Security', 'Rate limits on auth endpoints', 'critical'),
  ('Security', 'HTTPS enforced on custom domain', 'critical'),
  ('Security', 'CSP headers configured', 'high'),
  ('Security', 'Secret rotation schedule defined', 'high'),
  ('Security', 'DDoS protection enabled', 'high'),
  ('Performance', 'Database indexes on hot query paths', 'critical'),
  ('Performance', 'Image optimization in place', 'high'),
  ('Performance', 'Code splitting verified', 'medium'),
  ('Performance', 'Lighthouse mobile score > 85', 'high'),
  ('Performance', 'Time to Interactive < 3s on 4G', 'high'),
  ('Observability', 'Error tracking active', 'critical'),
  ('Observability', 'API latency dashboard live', 'high'),
  ('Observability', 'Health check endpoint configured', 'critical'),
  ('Observability', 'Alert channels (email/Slack) wired', 'high'),
  ('SEO', 'sitemap.xml generated and submitted', 'high'),
  ('SEO', 'robots.txt allowlist verified', 'high'),
  ('SEO', 'Structured data on doctor/pharmacy pages', 'high'),
  ('SEO', 'Open Graph metadata on all routes', 'medium'),
  ('SEO', 'Local SEO pages for top 20 Moroccan cities', 'high'),
  ('PWA', 'Manifest validated', 'high'),
  ('PWA', 'Push notifications tested on iOS + Android', 'high'),
  ('PWA', 'Offline shell verified', 'medium'),
  ('Legal', 'Privacy policy published (FR/AR/EN)', 'critical'),
  ('Legal', 'Terms of service published', 'critical'),
  ('Legal', 'CNDP (Morocco) data declaration filed', 'critical'),
  ('Operations', 'On-call rotation documented', 'high'),
  ('Operations', 'Disaster recovery runbook published', 'critical'),
  ('Operations', 'Customer support inbox configured', 'high'),
  ('Launch', 'Soft launch with 100 pilot providers', 'medium'),
  ('Launch', 'Press kit prepared', 'low');

-- ============ SEED FEATURE FLAGS ============
INSERT INTO public.feature_flags (key, enabled, rollout_percent, description) VALUES
  ('ai_assistant', true, 100, 'AI health assistant'),
  ('blood_donation_chat', true, 100, 'Realtime chat for blood requests'),
  ('push_notifications', true, 100, 'Web push notifications'),
  ('emergency_mode', true, 100, 'Emergency UI shortcuts'),
  ('provider_messaging', false, 10, 'Encrypted patient-provider messaging'),
  ('appointments_v2', false, 0, 'New appointment flow with calendar holds')
ON CONFLICT (key) DO NOTHING;
