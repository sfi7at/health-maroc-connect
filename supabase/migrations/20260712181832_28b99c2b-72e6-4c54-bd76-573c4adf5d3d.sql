REVOKE ALL ON FUNCTION public.get_provider_booked_slots(uuid, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_provider_booked_slots(uuid, timestamptz, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.get_provider_booked_slots(uuid, timestamptz, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_booked_slots(uuid, timestamptz, timestamptz) TO authenticated;