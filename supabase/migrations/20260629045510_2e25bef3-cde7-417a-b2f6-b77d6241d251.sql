
-- ============================================================
-- HealthLink Maroc — Security, Trust & Anti-Fraud Layer
-- ============================================================

-- 1. Extend admin_audit_log with forensic context
ALTER TABLE public.admin_audit_log
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS before_state jsonb,
  ADD COLUMN IF NOT EXISTS after_state jsonb,
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info';

CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.admin_audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.admin_audit_log(entity_type, entity_id);

-- 2. Security events (suspicious activity, anomalies, alerts)
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,           -- login_failed, brute_force, suspicious_login, account_locked, password_reset, role_changed, mfa_disabled, ip_change, geo_anomaly, mass_signup, bot_detected, fraud_signal
  severity text NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  ip_address inet,
  user_agent text,
  country text,
  city text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sec_events_created ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_events_user ON public.security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_events_severity ON public.security_events(severity, resolved, created_at DESC);
CREATE POLICY "sec_events insert self" ON public.security_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "sec_events staff read" ON public.security_events FOR SELECT TO authenticated
  USING (public.has_any_admin_role(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "sec_events admin update" ON public.security_events FOR UPDATE TO authenticated
  USING (public.has_any_admin_role(auth.uid()))
  WITH CHECK (public.has_any_admin_role(auth.uid()));

-- 3. Login attempts (brute-force detection)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  success boolean NOT NULL DEFAULT false,
  ip_address inet,
  user_agent text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.login_attempts TO authenticated;
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_login_email_time ON public.login_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_ip_time ON public.login_attempts(ip_address, created_at DESC);
CREATE POLICY "login_attempts insert any" ON public.login_attempts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "login_attempts staff read" ON public.login_attempts FOR SELECT TO authenticated
  USING (public.has_any_admin_role(auth.uid()) OR user_id = auth.uid());

-- 4. Trusted devices
CREATE TABLE IF NOT EXISTS public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  device_name text,
  user_agent text,
  ip_address inet,
  trusted boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fingerprint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_devices TO authenticated;
GRANT ALL ON public.user_devices TO service_role;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "devices owner all" ON public.user_devices FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_any_admin_role(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.has_any_admin_role(auth.uid()));

-- 5. Block list (IPs, emails, users)
CREATE TABLE IF NOT EXISTS public.blocked_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('ip','email','user','phone','device')),
  value text NOT NULL,
  reason text,
  blocked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, value)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_entities TO authenticated;
GRANT ALL ON public.blocked_entities TO service_role;
ALTER TABLE public.blocked_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocked staff all" ON public.blocked_entities FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid()))
  WITH CHECK (public.has_any_admin_role(auth.uid()));

-- 6. Provider trust scores
CREATE TABLE IF NOT EXISTS public.provider_trust_scores (
  provider_id uuid PRIMARY KEY REFERENCES public.providers(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'unverified',  -- unverified, partial, verified, official
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.provider_trust_scores TO anon, authenticated;
GRANT ALL ON public.provider_trust_scores TO service_role;
ALTER TABLE public.provider_trust_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trust public read" ON public.provider_trust_scores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "trust staff write" ON public.provider_trust_scores FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid()))
  WITH CHECK (public.has_any_admin_role(auth.uid()));

-- 7. Fraud signals (raw events feeding trust + alerts)
CREATE TABLE IF NOT EXISTS public.fraud_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,    -- provider, user, listing
  target_id uuid,
  signal_type text NOT NULL,    -- duplicate_phone, duplicate_gps, fake_address, mass_register, bot_pattern, blacklist_hit, suspicious_edit
  weight integer NOT NULL DEFAULT 1,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.fraud_signals TO authenticated;
GRANT ALL ON public.fraud_signals TO service_role;
ALTER TABLE public.fraud_signals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_fraud_target ON public.fraud_signals(target_type, target_id);
CREATE POLICY "fraud staff all" ON public.fraud_signals FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid()))
  WITH CHECK (public.has_any_admin_role(auth.uid()));

-- 8. Rate-limit buckets (used by app + edge code)
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);
GRANT SELECT, INSERT, UPDATE ON public.rate_limit_buckets TO authenticated;
GRANT ALL ON public.rate_limit_buckets TO service_role;
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate staff read" ON public.rate_limit_buckets FOR SELECT TO authenticated
  USING (public.has_any_admin_role(auth.uid()));
CREATE POLICY "rate self write" ON public.rate_limit_buckets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "rate self update" ON public.rate_limit_buckets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 9. Extend providers with verification status enum
DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('pending','under_review','verified','official_verified','rejected','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS verification_status public.verification_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Brute-force check: returns true if email/IP exceeded N failed attempts
CREATE OR REPLACE FUNCTION public.check_brute_force(_email text, _ip inet, _window_minutes integer DEFAULT 15, _max_attempts integer DEFAULT 5)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (
    SELECT COUNT(*) FROM public.login_attempts
    WHERE success = false
      AND created_at > now() - (_window_minutes || ' minutes')::interval
      AND ((_email IS NOT NULL AND email = _email) OR (_ip IS NOT NULL AND ip_address = _ip))
  ) >= _max_attempts;
$$;

-- Generic block check
CREATE OR REPLACE FUNCTION public.is_blocked(_kind text, _value text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_entities
    WHERE kind = _kind AND value = _value
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Log a security event from any context
CREATE OR REPLACE FUNCTION public.log_security_event(_user uuid, _type text, _severity text, _meta jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.security_events(user_id, event_type, severity, metadata)
  VALUES (_user, _type, COALESCE(_severity,'medium'), COALESCE(_meta,'{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END $$;

-- Compute trust score for a provider (0-100)
CREATE OR REPLACE FUNCTION public.compute_provider_trust(_provider uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_score integer := 0;
  v_level text := 'unverified';
  v_provider record;
  v_reviews integer := 0;
  v_reports integer := 0;
  v_fraud integer := 0;
  v_factors jsonb;
BEGIN
  SELECT * INTO v_provider FROM public.providers WHERE id = _provider;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- base
  v_score := 20;
  IF v_provider.owner_id IS NOT NULL THEN v_score := v_score + 10; END IF;
  IF v_provider.phone IS NOT NULL AND length(v_provider.phone) >= 8 THEN v_score := v_score + 5; END IF;
  IF v_provider.address IS NOT NULL THEN v_score := v_score + 5; END IF;
  IF v_provider.latitude IS NOT NULL AND v_provider.longitude IS NOT NULL THEN v_score := v_score + 5; END IF;
  IF v_provider.profile_image IS NOT NULL THEN v_score := v_score + 3; END IF;
  IF v_provider.updated_at > now() - interval '90 days' THEN v_score := v_score + 5; END IF;

  -- verification
  IF v_provider.verification_status = 'verified' THEN v_score := v_score + 20; v_level := 'verified'; END IF;
  IF v_provider.verification_status = 'official_verified' THEN v_score := v_score + 35; v_level := 'official'; END IF;
  IF v_provider.verification_status = 'suspended' THEN v_score := v_score - 50; END IF;
  IF v_provider.verification_status = 'rejected' THEN v_score := v_score - 30; END IF;

  -- reviews
  SELECT COUNT(*) INTO v_reviews FROM public.reviews WHERE provider_id = _provider;
  v_score := v_score + LEAST(v_reviews, 10);

  -- reports against this provider
  SELECT COUNT(*) INTO v_reports FROM public.reports
   WHERE target_type = 'provider' AND target_id = _provider AND status IN ('open','investigating');
  v_score := v_score - (v_reports * 5);

  -- fraud signals
  SELECT COALESCE(SUM(weight),0) INTO v_fraud FROM public.fraud_signals
   WHERE target_type = 'provider' AND target_id = _provider AND resolved = false;
  v_score := v_score - v_fraud;

  v_score := GREATEST(0, LEAST(100, v_score));

  IF v_level = 'unverified' THEN
    IF v_score >= 70 THEN v_level := 'verified';
    ELSIF v_score >= 40 THEN v_level := 'partial';
    END IF;
  END IF;

  v_factors := jsonb_build_object(
    'reviews', v_reviews, 'reports', v_reports, 'fraud_weight', v_fraud,
    'status', v_provider.verification_status
  );

  INSERT INTO public.provider_trust_scores(provider_id, score, level, factors, computed_at)
  VALUES (_provider, v_score, v_level, v_factors, now())
  ON CONFLICT (provider_id) DO UPDATE
    SET score = EXCLUDED.score, level = EXCLUDED.level,
        factors = EXCLUDED.factors, computed_at = now();

  RETURN v_score;
END $$;

-- Detect duplicate providers (same phone or close GPS + similar name)
CREATE OR REPLACE FUNCTION public.detect_duplicate_providers(_provider uuid)
RETURNS TABLE(duplicate_id uuid, reason text, similarity numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  SELECT * INTO p FROM public.providers WHERE id = _provider;
  IF NOT FOUND THEN RETURN; END IF;

  RETURN QUERY
    SELECT q.id, 'phone_match'::text, 1.0::numeric
    FROM public.providers q
    WHERE q.id <> p.id AND p.phone IS NOT NULL AND q.phone = p.phone
  UNION ALL
    SELECT q.id, 'gps_proximity'::text,
      (1.0 - LEAST(1.0, (abs(q.latitude - p.latitude) + abs(q.longitude - p.longitude))::numeric * 100))
    FROM public.providers q
    WHERE q.id <> p.id
      AND p.latitude IS NOT NULL AND q.latitude IS NOT NULL
      AND abs(q.latitude - p.latitude) < 0.001
      AND abs(q.longitude - p.longitude) < 0.001;
END $$;
