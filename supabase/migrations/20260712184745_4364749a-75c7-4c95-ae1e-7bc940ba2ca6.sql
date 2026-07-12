
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.slugify(_input text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(public.unaccent(coalesce(_input, ''))),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
$$;

DO $$
DECLARE
  r record;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN SELECT id, name FROM public.providers WHERE slug IS NULL LOOP
    base := NULLIF(public.slugify(r.name), '');
    IF base IS NULL THEN base := 'provider'; END IF;
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM public.providers WHERE slug = candidate) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    UPDATE public.providers SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS providers_slug_unique_idx
  ON public.providers (lower(slug));

ALTER TABLE public.providers
  ALTER COLUMN slug SET NOT NULL;

CREATE OR REPLACE FUNCTION public.providers_validate_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR length(NEW.slug) < 3 THEN
    RAISE EXCEPTION 'slug must be at least 3 characters';
  END IF;
  IF NEW.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'slug must contain only lowercase letters, numbers and hyphens';
  END IF;
  IF NEW.slug IN ('new','search','map','specialties','specialty','on-duty','open','emergency','departments','analyses','campaigns','centers','donors','request','me','history','chat','become-donor') THEN
    RAISE EXCEPTION 'slug "%" is reserved', NEW.slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS providers_slug_validate ON public.providers;
CREATE TRIGGER providers_slug_validate
  BEFORE INSERT OR UPDATE OF slug ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.providers_validate_slug();
