
REVOKE EXECUTE ON FUNCTION public.check_brute_force(text, inet, integer, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_blocked(text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_security_event(uuid, text, text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.compute_provider_trust(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.detect_duplicate_providers(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.check_brute_force(text, inet, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_blocked(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_security_event(uuid, text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_provider_trust(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.detect_duplicate_providers(uuid) TO authenticated, service_role;

-- Tighten rate-limit RLS (only the bucket owner key prefix matching auth uid OR staff)
DROP POLICY IF EXISTS "rate self write" ON public.rate_limit_buckets;
DROP POLICY IF EXISTS "rate self update" ON public.rate_limit_buckets;
CREATE POLICY "rate self write" ON public.rate_limit_buckets FOR INSERT TO authenticated
  WITH CHECK (bucket_key LIKE ('u:' || auth.uid()::text || ':%') OR public.has_any_admin_role(auth.uid()));
CREATE POLICY "rate self update" ON public.rate_limit_buckets FOR UPDATE TO authenticated
  USING (bucket_key LIKE ('u:' || auth.uid()::text || ':%') OR public.has_any_admin_role(auth.uid()))
  WITH CHECK (bucket_key LIKE ('u:' || auth.uid()::text || ':%') OR public.has_any_admin_role(auth.uid()));
