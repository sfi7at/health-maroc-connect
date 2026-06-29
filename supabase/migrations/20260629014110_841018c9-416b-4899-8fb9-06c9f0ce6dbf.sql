
-- 1. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'fr' CHECK (language IN ('fr','ar','en')),
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_city_id ON public.profiles(city_id);

-- 2. Update handle_new_user to copy extra signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_first text := NULLIF(meta->>'first_name','');
  v_last  text := NULLIF(meta->>'last_name','');
  v_full  text := COALESCE(
    NULLIF(meta->>'full_name',''),
    NULLIF(meta->>'name',''),
    TRIM(CONCAT_WS(' ', v_first, v_last)),
    split_part(NEW.email, '@', 1)
  );
  v_lang text := COALESCE(NULLIF(meta->>'language',''), 'fr');
  v_city uuid := NULLIF(meta->>'city_id','')::uuid;
  v_terms timestamptz := CASE WHEN (meta->>'terms_accepted')::boolean THEN now() ELSE NULL END;
BEGIN
  INSERT INTO public.profiles (id, full_name, first_name, last_name, avatar_url, phone, city_id, language, terms_accepted_at)
  VALUES (
    NEW.id,
    v_full,
    v_first,
    v_last,
    NULLIF(meta->>'avatar_url',''),
    COALESCE(NULLIF(meta->>'phone',''), NEW.phone),
    v_city,
    CASE WHEN v_lang IN ('fr','ar','en') THEN v_lang ELSE 'fr' END,
    v_terms
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
