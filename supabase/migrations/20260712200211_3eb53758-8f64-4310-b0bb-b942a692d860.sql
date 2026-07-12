
CREATE OR REPLACE FUNCTION public.refresh_provider_rating(_provider uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.providers p SET
    rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE provider_id = _provider AND status = 'approved'), NULL),
    review_count = COALESCE((SELECT COUNT(*)::int FROM public.reviews WHERE provider_id = _provider AND status = 'approved'), 0),
    average_rating = COALESCE((SELECT AVG(rating)::numeric(3,2) FROM public.reviews WHERE provider_id = _provider AND status = 'approved'), 0),
    reviews_count = COALESCE((SELECT COUNT(*)::int FROM public.reviews WHERE provider_id = _provider AND status = 'approved'), 0)
  WHERE p.id = _provider;
$$;

-- Backfill both sets of columns
UPDATE public.providers p SET
  rating = sub.avg_r,
  review_count = sub.cnt,
  average_rating = sub.avg_r,
  reviews_count = sub.cnt
FROM (
  SELECT provider_id, ROUND(AVG(rating)::numeric, 2) AS avg_r, COUNT(*)::int AS cnt
  FROM public.reviews WHERE status = 'approved' GROUP BY provider_id
) sub
WHERE p.id = sub.provider_id;
