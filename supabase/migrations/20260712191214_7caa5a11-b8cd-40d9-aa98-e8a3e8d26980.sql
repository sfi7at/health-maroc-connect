GRANT SELECT ON public.providers TO anon;
GRANT SELECT, INSERT, UPDATE ON public.providers TO authenticated;
GRANT ALL ON public.providers TO service_role;
GRANT SELECT ON public.blood_requests TO anon;
GRANT SELECT, INSERT, UPDATE ON public.blood_requests TO authenticated;
GRANT ALL ON public.blood_requests TO service_role;