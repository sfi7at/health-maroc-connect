-- Booking flow requires RLS policies to call owns_provider(); grant EXECUTE to signed-in users.
GRANT EXECUTE ON FUNCTION public.owns_provider(uuid, uuid) TO authenticated;