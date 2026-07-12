REVOKE ALL ON public.appointments FROM anon;
REVOKE ALL ON public.notifications FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

GRANT SELECT ON public.provider_schedules TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_schedules TO authenticated;
GRANT ALL ON public.provider_schedules TO service_role;

GRANT SELECT ON public.provider_services TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_services TO authenticated;
GRANT ALL ON public.provider_services TO service_role;

GRANT SELECT ON public.provider_blocked_dates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_blocked_dates TO authenticated;
GRANT ALL ON public.provider_blocked_dates TO service_role;