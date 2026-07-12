INSERT INTO public.provider_specialties (provider_id, specialty_id)
SELECT p.id, s.id
FROM public.providers p
JOIN public.specialties s
  ON s.category IN ('doctor','dentist')
 AND (
      extensions.unaccent(lower(p.name)) LIKE '%' || extensions.unaccent(lower(s.name_fr)) || '%'
      OR (s.slug = 'gynecology'        AND extensions.unaccent(lower(p.name)) LIKE '%gynecolog%')
      OR (s.slug = 'radiology'         AND extensions.unaccent(lower(p.name)) LIKE '%radiolog%')
      OR (s.slug = 'dermatology'       AND extensions.unaccent(lower(p.name)) LIKE '%dermatolog%')
      OR (s.slug = 'orthopedics'       AND (extensions.unaccent(lower(p.name)) LIKE '%traumatolog%' OR extensions.unaccent(lower(p.name)) LIKE '%orthoped%'))
      OR (s.slug = 'ophthalmology'     AND extensions.unaccent(lower(p.name)) LIKE '%ophtalmolog%')
      OR (s.slug = 'cardiology'        AND extensions.unaccent(lower(p.name)) LIKE '%cardiolog%')
      OR (s.slug = 'pediatrics'        AND extensions.unaccent(lower(p.name)) LIKE '%pediatr%')
      OR (s.slug = 'neurology'         AND extensions.unaccent(lower(p.name)) LIKE '%neurolog%')
      OR (s.slug = 'psychiatry'        AND extensions.unaccent(lower(p.name)) LIKE '%psychiatr%')
      OR (s.slug = 'urology'           AND extensions.unaccent(lower(p.name)) LIKE '%urolog%')
      OR (s.slug = 'endocrinology'     AND extensions.unaccent(lower(p.name)) LIKE '%endocrinolog%')
      OR (s.slug = 'gastroenterology'  AND extensions.unaccent(lower(p.name)) LIKE '%gastro%')
      OR (s.slug = 'nephrology'        AND extensions.unaccent(lower(p.name)) LIKE '%nephrolog%')
      OR (s.slug = 'pulmonology'       AND extensions.unaccent(lower(p.name)) LIKE '%pneumolog%')
      OR (s.slug = 'oncology'          AND extensions.unaccent(lower(p.name)) LIKE '%oncolog%')
      OR (s.slug = 'ent'               AND (extensions.unaccent(lower(p.name)) LIKE '% orl %' OR extensions.unaccent(lower(p.name)) LIKE '%oto-rhino%'))
      OR (s.slug = 'dentistry'         AND (extensions.unaccent(lower(p.name)) LIKE '%dentiste%' OR extensions.unaccent(lower(p.name)) LIKE '%dentaire%' OR p.category = 'dentist'))
      OR (s.slug = 'internal-medicine' AND extensions.unaccent(lower(p.name)) LIKE '%medecine interne%')
      OR (s.slug = 'general-medicine'  AND extensions.unaccent(lower(p.name)) LIKE '%medecine generale%')
     )
WHERE p.category IN ('doctor','dentist')
  AND p.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.provider_specialties ps WHERE ps.provider_id = p.id AND ps.specialty_id = s.id)
ON CONFLICT DO NOTHING;

-- Index to speed up specialty lookups on the junction table
CREATE INDEX IF NOT EXISTS idx_provider_specialties_specialty_id ON public.provider_specialties(specialty_id);
CREATE INDEX IF NOT EXISTS idx_provider_specialties_provider_id ON public.provider_specialties(provider_id);