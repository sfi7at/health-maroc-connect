
-- Fix Security Definer View
DROP VIEW IF EXISTS public.blood_donors_public;
CREATE VIEW public.blood_donors_public
WITH (security_invoker = true) AS
  SELECT id, blood_group, city_id, is_available, last_donation_at, total_donations, created_at
  FROM public.blood_donors
  WHERE is_available = true;
GRANT SELECT ON public.blood_donors_public TO anon, authenticated;

-- Lock down SECURITY DEFINER helper functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_provider(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.owns_provider(uuid, uuid) TO authenticated, service_role;
