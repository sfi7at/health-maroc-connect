REVOKE INSERT, UPDATE, DELETE ON public.provider_schedules FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.provider_services FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.provider_blocked_dates FROM anon;
GRANT SELECT ON public.provider_schedules TO anon;
GRANT SELECT ON public.provider_services TO anon;
GRANT SELECT ON public.provider_blocked_dates TO anon;