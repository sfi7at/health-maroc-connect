
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_donors TO authenticated;
GRANT ALL ON public.blood_donors TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_requests TO authenticated;
GRANT ALL ON public.blood_requests TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_request_responses TO authenticated;
GRANT ALL ON public.blood_request_responses TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_chat_messages TO authenticated;
GRANT ALL ON public.blood_chat_messages TO service_role;

GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
