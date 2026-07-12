-- Backfill missing city assignments for doctor/dentist providers
UPDATE public.providers
SET city_id = (SELECT id FROM public.cities WHERE name_fr = 'Rabat' LIMIT 1)
WHERE category IN ('doctor', 'dentist') AND city_id IS NULL;