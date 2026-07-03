
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS clinic_logo_url text,
  ADD COLUMN IF NOT EXISTS prescription_header jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_role text NOT NULL DEFAULT 'citizen';
