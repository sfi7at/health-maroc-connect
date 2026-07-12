
-- Undo the view + restrictive policy from the previous migration
DROP VIEW IF EXISTS public.profiles_public;
DROP POLICY IF EXISTS "Profiles readable by self or admin" ON public.profiles;

-- Column-level privacy on profiles
CREATE POLICY "Profiles readable authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (
  id, full_name, first_name, avatar_url, city_id, active_role, language
) ON public.profiles TO authenticated;

-- Owner fetches full profile (incl. phone, last_name) via SECURITY DEFINER helper
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
