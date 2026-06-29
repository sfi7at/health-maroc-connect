
-- Replace SECURITY DEFINER view with column-level GRANTs + RLS so anon/auth can read only safe donor columns.
DROP VIEW IF EXISTS public.blood_donors_public;

-- Lock down direct SELECT on the table to safe columns only
REVOKE SELECT ON public.blood_donors FROM anon, authenticated;
GRANT SELECT (
  id, first_name, last_name, blood_group, gender,
  city_id, province_id, avatar_url, is_available, status,
  is_verified, total_donations, last_donation_at, last_active_at, created_at
) ON public.blood_donors TO anon, authenticated;

-- Add explicit public SELECT policy (existing owner-only policies remain for UPDATE/INSERT/DELETE)
DROP POLICY IF EXISTS "Public can list donors (safe cols only)" ON public.blood_donors;
CREATE POLICY "Public can list donors (safe cols only)"
  ON public.blood_donors FOR SELECT TO anon, authenticated
  USING (true);

-- Owner gets full row read access via a SECURITY DEFINER RPC (returns sensitive fields)
CREATE OR REPLACE FUNCTION public.get_my_donor_profile()
RETURNS public.blood_donors
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.blood_donors WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_donor_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_donor_profile() TO authenticated;

-- Reveal contact info only after donor has accepted the request
CREATE OR REPLACE FUNCTION public.get_donor_contact_for_request(_request uuid, _donor uuid)
RETURNS TABLE(contact_phone text, contact_email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.blood_requests r
    WHERE r.id = _request AND r.requester_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.blood_request_responses x
    WHERE x.request_id = _request AND x.donor_id = _donor AND x.status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'donor has not accepted';
  END IF;
  RETURN QUERY SELECT d.contact_phone, d.contact_email FROM public.blood_donors d WHERE d.id = _donor;
END;
$$;
REVOKE ALL ON FUNCTION public.get_donor_contact_for_request(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_donor_contact_for_request(uuid,uuid) TO authenticated;

-- Restrict chat helper to authenticated only
REVOKE ALL ON FUNCTION public.can_chat_on_request(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_chat_on_request(uuid,uuid) TO authenticated;
