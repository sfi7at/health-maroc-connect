REVOKE SELECT, INSERT, UPDATE, DELETE ON public.appointments FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.notifications FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;