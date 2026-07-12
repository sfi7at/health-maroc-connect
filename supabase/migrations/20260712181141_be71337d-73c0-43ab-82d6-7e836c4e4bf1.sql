
-- ============================================================
-- 1) blood_donors : column-level privacy for the public listing
-- ============================================================
DROP POLICY IF EXISTS "Public can list donors (safe cols only)" ON public.blood_donors;

CREATE POLICY "Donors listing (authenticated)"
  ON public.blood_donors
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.blood_donors FROM anon;
REVOKE SELECT ON public.blood_donors FROM authenticated;

GRANT SELECT (
  id, blood_group, city_id, province_id, is_available,
  last_donation_at, total_donations, availability_radius_km,
  last_active_at, is_verified, status, created_at, updated_at
) ON public.blood_donors TO authenticated;

-- Donors read their own full row through get_my_donor_profile() (SECURITY DEFINER).

-- ============================================================
-- 2) profiles : restrict to owner + admin, add public safe view
-- ============================================================
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;

CREATE POLICY "Profiles readable by self or admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.profiles_public AS
  SELECT id, full_name, first_name, avatar_url, city_id
  FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;
COMMENT ON VIEW public.profiles_public IS
  'Safe cross-user profile fields (no phone, no last_name). Runs as owner to bypass profiles RLS.';

-- ============================================================
-- 3) blood_requests : hide contact/PII columns from all-authenticated read
-- ============================================================
REVOKE SELECT ON public.blood_requests FROM anon;
REVOKE SELECT ON public.blood_requests FROM authenticated;

GRANT SELECT (
  id, requester_id, blood_group, units_needed, hospital_name,
  city_id, province_id, address, urgency, status, notes,
  needed_by, is_emergency, created_at, updated_at
) ON public.blood_requests TO authenticated;

-- Requesters read the full row of their own request via SECURITY DEFINER helper.
CREATE OR REPLACE FUNCTION public.get_my_blood_request(_id uuid)
RETURNS SETOF public.blood_requests
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.blood_requests
  WHERE id = _id AND requester_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_blood_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_blood_request(uuid) TO authenticated;

-- Existing get_donor_contact_for_request(uuid, uuid) already exposes contact info
-- only to accepted donors — unchanged.

-- ============================================================
-- 4) prescriptions : hide verification_token from normal SELECTs
-- ============================================================
REVOKE SELECT (verification_token) ON public.prescriptions FROM anon;
REVOKE SELECT (verification_token) ON public.prescriptions FROM authenticated;
-- verify_prescription() is SECURITY DEFINER and can still read the column.

-- Prevent creating "orphan" prescriptions without either a patient user_id or a provider link
ALTER TABLE public.prescriptions
  DROP CONSTRAINT IF EXISTS prescriptions_owner_or_provider_required;
ALTER TABLE public.prescriptions
  ADD CONSTRAINT prescriptions_owner_or_provider_required
  CHECK (user_id IS NOT NULL OR provider_id IS NOT NULL) NOT VALID;

-- ============================================================
-- 5) SECURITY DEFINER function : lock verify_prescription
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.verify_prescription(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_prescription(text) TO service_role;
-- Public verification is now performed by a server function calling this
-- helper with the service role client.
