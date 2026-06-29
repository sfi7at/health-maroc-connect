
-- Donor status enum
DO $$ BEGIN
  CREATE TYPE public.donor_status AS ENUM ('available','unavailable','busy','traveling','inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.blood_donors
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS status public.donor_status NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS province_id uuid REFERENCES public.provinces(id),
  ADD COLUMN IF NOT EXISTS availability_radius_km integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.blood_requests
  ADD COLUMN IF NOT EXISTS province_id uuid REFERENCES public.provinces(id),
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS contact_name text;

DROP VIEW IF EXISTS public.blood_donors_public;
CREATE VIEW public.blood_donors_public
WITH (security_invoker = false) AS
SELECT
  d.id,
  d.first_name,
  d.last_name,
  d.blood_group,
  d.gender,
  d.city_id,
  d.province_id,
  d.avatar_url,
  d.is_available,
  d.status,
  d.is_verified,
  d.total_donations,
  d.last_donation_at,
  d.last_active_at,
  d.created_at,
  ROUND(d.latitude::numeric, 2) AS approx_latitude,
  ROUND(d.longitude::numeric, 2) AS approx_longitude
FROM public.blood_donors d;

GRANT SELECT ON public.blood_donors_public TO authenticated, anon;

CREATE TABLE IF NOT EXISTS public.blood_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  organizer text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  city_id uuid REFERENCES public.cities(id),
  province_id uuid REFERENCES public.provinces(id),
  address text,
  latitude numeric,
  longitude numeric,
  cover_image text,
  contact_phone text,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blood_campaigns TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blood_campaigns TO authenticated;
GRANT ALL ON public.blood_campaigns TO service_role;
ALTER TABLE public.blood_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Campaigns are public when published" ON public.blood_campaigns;
DROP POLICY IF EXISTS "Admins manage campaigns" ON public.blood_campaigns;
DROP POLICY IF EXISTS "Authenticated can propose campaigns" ON public.blood_campaigns;
CREATE POLICY "Campaigns are public when published"
  ON public.blood_campaigns FOR SELECT
  USING (is_published OR auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage campaigns"
  ON public.blood_campaigns FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated can propose campaigns"
  ON public.blood_campaigns FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
DROP TRIGGER IF EXISTS trg_campaigns_updated ON public.blood_campaigns;
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.blood_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.blood_campaign_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.blood_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.blood_campaign_registrations TO authenticated;
GRANT ALL ON public.blood_campaign_registrations TO service_role;
ALTER TABLE public.blood_campaign_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own registrations" ON public.blood_campaign_registrations;
DROP POLICY IF EXISTS "Users register themselves" ON public.blood_campaign_registrations;
DROP POLICY IF EXISTS "Users cancel own registration" ON public.blood_campaign_registrations;
CREATE POLICY "Users see own registrations"
  ON public.blood_campaign_registrations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users register themselves"
  ON public.blood_campaign_registrations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users cancel own registration"
  ON public.blood_campaign_registrations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.blood_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  kind text NOT NULL DEFAULT 'text',
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.blood_chat_messages TO authenticated;
GRANT ALL ON public.blood_chat_messages TO service_role;
ALTER TABLE public.blood_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_chat_on_request(_user uuid, _request uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blood_requests r
    WHERE r.id = _request AND (
      r.requester_id = _user
      OR EXISTS (
        SELECT 1 FROM public.blood_request_responses x
        WHERE x.request_id = _request AND x.donor_id = _user AND x.status = 'accepted'
      )
    )
  );
$$;

DROP POLICY IF EXISTS "Chat participants can read" ON public.blood_chat_messages;
DROP POLICY IF EXISTS "Chat participants can send" ON public.blood_chat_messages;
DROP POLICY IF EXISTS "Recipient can mark read" ON public.blood_chat_messages;
CREATE POLICY "Chat participants can read"
  ON public.blood_chat_messages FOR SELECT TO authenticated
  USING (public.can_chat_on_request(auth.uid(), request_id));
CREATE POLICY "Chat participants can send"
  ON public.blood_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.can_chat_on_request(auth.uid(), request_id)
    AND public.can_chat_on_request(recipient_id, request_id)
  );
CREATE POLICY "Recipient can mark read"
  ON public.blood_chat_messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);
CREATE INDEX IF NOT EXISTS idx_blood_chat_request ON public.blood_chat_messages(request_id, created_at);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_donors;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
