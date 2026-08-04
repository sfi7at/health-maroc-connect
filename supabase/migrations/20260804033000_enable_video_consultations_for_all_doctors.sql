-- Give every integrated doctor/dentist a standard video-consultation option.
-- The actual secure meeting link is still supplied after the provider confirms.
INSERT INTO public.provider_services (
  provider_id,
  name,
  description,
  duration_minutes,
  preparation,
  category,
  is_active,
  is_online_eligible,
  sort_order
)
SELECT
  p.id,
  'Téléconsultation vidéo',
  'Consultation médicale à distance par appel vidéo sécurisé.',
  30,
  'Préparez vos documents médicaux et installez-vous dans un endroit calme et confidentiel.',
  'Téléconsultation',
  true,
  true,
  -10
FROM public.providers p
WHERE p.category IN ('doctor', 'dentist')
  AND p.owner_id IS NOT NULL
  AND p.is_active = true
  AND p.verification_status <> 'suspended'
  AND NOT EXISTS (
    SELECT 1
    FROM public.provider_services ps
    WHERE ps.provider_id = p.id
      AND ps.is_online_eligible = true
      AND lower(ps.name) = lower('Téléconsultation vidéo')
  );

UPDATE public.providers
SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{online_appointment}', 'true'::jsonb, true)
WHERE category IN ('doctor', 'dentist')
  AND owner_id IS NOT NULL
  AND is_active = true
  AND verification_status <> 'suspended';
