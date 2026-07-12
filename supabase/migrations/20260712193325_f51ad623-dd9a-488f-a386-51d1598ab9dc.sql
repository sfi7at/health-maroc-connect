
-- Helper: does auth uid own the provider whose id is encoded as the first folder segment?
CREATE OR REPLACE FUNCTION public.storage_first_folder_owns_provider(_name text, _uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seg text;
  pid uuid;
BEGIN
  IF _uid IS NULL OR _name IS NULL THEN RETURN false; END IF;
  seg := (storage.foldername(_name))[1];
  IF seg IS NULL THEN RETURN false; END IF;
  BEGIN
    pid := seg::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;
  RETURN EXISTS (SELECT 1 FROM public.providers WHERE id = pid AND owner_id = _uid);
END;
$$;

REVOKE ALL ON FUNCTION public.storage_first_folder_owns_provider(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_first_folder_owns_provider(text, uuid) TO authenticated, service_role;

-- Rewrite shared-bucket policies: split the `providers` bucket so folder = provider_id.
DROP POLICY IF EXISTS "shared buckets owner write" ON storage.objects;
DROP POLICY IF EXISTS "shared buckets owner update" ON storage.objects;
DROP POLICY IF EXISTS "shared buckets owner delete" ON storage.objects;
DROP POLICY IF EXISTS "shared buckets read auth" ON storage.objects;

-- Read: authenticated users may list/read shared buckets (signed URLs used publicly).
CREATE POLICY "shared buckets read auth"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = ANY (ARRAY['avatars','providers','articles','news']));

-- avatars / articles / news : first folder = auth.uid()
CREATE POLICY "user folder buckets insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = ANY (ARRAY['avatars','articles','news'])
  AND ((auth.uid())::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin'::app_role))
);
CREATE POLICY "user folder buckets update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = ANY (ARRAY['avatars','articles','news'])
  AND ((auth.uid())::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin'::app_role))
)
WITH CHECK (
  bucket_id = ANY (ARRAY['avatars','articles','news'])
  AND ((auth.uid())::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin'::app_role))
);
CREATE POLICY "user folder buckets delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = ANY (ARRAY['avatars','articles','news'])
  AND ((auth.uid())::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin'::app_role))
);

-- providers bucket : first folder = provider_id owned by auth.uid()
CREATE POLICY "providers bucket owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'providers'
  AND (public.storage_first_folder_owns_provider(name, auth.uid()) OR has_role(auth.uid(),'admin'::app_role))
);
CREATE POLICY "providers bucket owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'providers'
  AND (public.storage_first_folder_owns_provider(name, auth.uid()) OR has_role(auth.uid(),'admin'::app_role))
)
WITH CHECK (
  bucket_id = 'providers'
  AND (public.storage_first_folder_owns_provider(name, auth.uid()) OR has_role(auth.uid(),'admin'::app_role))
);
CREATE POLICY "providers bucket owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'providers'
  AND (public.storage_first_folder_owns_provider(name, auth.uid()) OR has_role(auth.uid(),'admin'::app_role))
);
