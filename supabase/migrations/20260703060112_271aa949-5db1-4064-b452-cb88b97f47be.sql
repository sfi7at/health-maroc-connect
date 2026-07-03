
-- Extend prescriptions for HealthLink Pro
ALTER TABLE public.prescriptions
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS patient_name text,
  ADD COLUMN IF NOT EXISTS patient_phone text,
  ADD COLUMN IF NOT EXISTS patient_age integer,
  ADD COLUMN IF NOT EXISTS patient_gender text,
  ADD COLUMN IF NOT EXISTS diagnosis text,
  ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS expires_at date,
  ADD COLUMN IF NOT EXISTS verification_token text UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS prescriptions_provider_id_idx ON public.prescriptions(provider_id);
CREATE INDEX IF NOT EXISTS prescriptions_token_idx ON public.prescriptions(verification_token);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_prescriptions_updated_at ON public.prescriptions;
CREATE TRIGGER trg_prescriptions_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Additional policies: provider (owner of provider record) can manage prescriptions they issued
DROP POLICY IF EXISTS "rx provider manage" ON public.prescriptions;
CREATE POLICY "rx provider manage" ON public.prescriptions
  FOR ALL TO authenticated
  USING (provider_id IS NOT NULL AND public.owns_provider(auth.uid(), provider_id))
  WITH CHECK (provider_id IS NOT NULL AND public.owns_provider(auth.uid(), provider_id));

-- Public verification via SECURITY DEFINER function (no direct anon SELECT)
CREATE OR REPLACE FUNCTION public.verify_prescription(_token text)
RETURNS TABLE (
  id uuid,
  prescribed_at date,
  expires_at date,
  status text,
  diagnosis text,
  items jsonb,
  patient_name text,
  provider_name text,
  provider_verified boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.prescribed_at, r.expires_at, r.status, r.diagnosis, r.items,
         COALESCE(r.patient_name, ''),
         COALESCE(p.name, ''),
         COALESCE(p.is_verified, false)
  FROM public.prescriptions r
  LEFT JOIN public.providers p ON p.id = r.provider_id
  WHERE r.verification_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_prescription(text) TO anon, authenticated;

-- Ensure Realtime for prescriptions
ALTER TABLE public.prescriptions REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Also ensure Realtime on appointments & notifications for the Pro workspace
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
