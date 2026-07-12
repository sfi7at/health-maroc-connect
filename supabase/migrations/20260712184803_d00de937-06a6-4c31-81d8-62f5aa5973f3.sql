
-- Auto-generate slug when null on insert
CREATE OR REPLACE FUNCTION public.providers_autofill_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    base := NULLIF(public.slugify(NEW.name), '');
    IF base IS NULL THEN base := 'provider'; END IF;
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.providers WHERE lower(slug) = lower(candidate) AND id <> COALESCE(NEW.id, gen_random_uuid())) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS providers_slug_autofill ON public.providers;
CREATE TRIGGER providers_slug_autofill
  BEFORE INSERT ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.providers_autofill_slug();

-- Relax NOT NULL so client inserts without slug work (trigger fills it before check)
-- Actually keep NOT NULL because trigger runs BEFORE INSERT.

-- Lock down helper functions — internal use only
REVOKE EXECUTE ON FUNCTION public.slugify(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.providers_validate_slug() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.providers_autofill_slug() FROM PUBLIC, anon, authenticated;
