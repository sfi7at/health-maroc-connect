
-- 1) Restrict anonymous column access on blood_donors (RLS is row-level only; columns are gated by GRANTs)
REVOKE SELECT ON public.blood_donors FROM anon;
GRANT SELECT (
  id, blood_group, city_id, gender, is_available, is_verified, status,
  total_donations, last_donation_at, last_active_at, created_at, updated_at
) ON public.blood_donors TO anon;

-- 2) Revoke EXECUTE on SECURITY DEFINER helpers from public/authenticated where signed-in users should not call them directly.
--    These are invoked internally by RLS policies or trusted server code; policy evaluation still works because
--    SECURITY DEFINER runs as the function owner regardless of caller's EXECUTE grant on the schema-exposed API.
REVOKE EXECUTE ON FUNCTION public.can_chat_on_request(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_notification_rate_limit(uuid, notification_type, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_donor_contact_for_request(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_donor_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_any_admin_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_blocked(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_provider(uuid, uuid) FROM PUBLIC, anon, authenticated;
