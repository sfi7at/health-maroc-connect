
-- 1) Profiles: drop broad public read, add authenticated-only read
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles readable by authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 2) Blood requests: drop public read, restrict to authenticated
DROP POLICY IF EXISTS "blood requests readable" ON public.blood_requests;
CREATE POLICY "blood requests readable authenticated"
  ON public.blood_requests FOR SELECT
  TO authenticated
  USING (true);

-- 3) Providers: hide email from anon via column-level grants
REVOKE SELECT ON public.providers FROM anon;
GRANT SELECT (
  id, owner_id, category, name, slug, description, address, city_id, district_id,
  latitude, longitude, phone, website, working_hours, profile_image, cover_image,
  is_verified, is_premium, is_active, average_rating, reviews_count, metadata,
  created_at, updated_at, verification_status, verification_notes, verified_at,
  verified_by, suspended_at, suspension_reason
) ON public.providers TO anon;

-- 4) Tighten always-true insert policies on telemetry tables
DROP POLICY IF EXISTS "login_attempts insert any" ON public.login_attempts;
CREATE POLICY "login_attempts insert scoped"
  ON public.login_attempts FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "metrics_insert_any_auth" ON public.api_metrics;
CREATE POLICY "metrics_insert_scoped"
  ON public.api_metrics FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "errors_insert_any_auth" ON public.error_reports;
CREATE POLICY "errors_insert_scoped"
  ON public.error_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "analytics_insert_anyone" ON public.analytics_events;
CREATE POLICY "analytics_insert_scoped"
  ON public.analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 5) Revoke EXECUTE on SECURITY DEFINER functions from anon and (where unnecessary) authenticated.
-- Trigger / admin-only functions: revoke from both
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_provider_trust(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_duplicate_providers(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_brute_force(text, inet, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_security_event(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- RLS helpers and user-callable functions: revoke from anon only; keep authenticated execute
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_any_admin_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_admin_role(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.owns_provider(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_provider(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_chat_on_request(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_chat_on_request(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_blocked(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_notification_rate_limit(uuid, notification_type, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_notification_rate_limit(uuid, notification_type, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_donor_contact_for_request(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_donor_contact_for_request(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_donor_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_donor_profile() TO authenticated;
