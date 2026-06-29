
-- Helper: user-owned path convention is `{auth.uid()}/...`
-- READABLE-BY-AUTH BUCKETS (avatars, providers, articles, news)
CREATE POLICY "shared buckets read auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('avatars','providers','articles','news'));

CREATE POLICY "shared buckets owner write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('avatars','providers','articles','news')
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );

CREATE POLICY "shared buckets owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('avatars','providers','articles','news')
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  )
  WITH CHECK (
    bucket_id IN ('avatars','providers','articles','news')
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );

CREATE POLICY "shared buckets owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('avatars','providers','articles','news')
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );

-- PRIVATE MEDICAL BUCKETS (documents, prescriptions, laboratories)
CREATE POLICY "private buckets owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id IN ('documents','prescriptions','laboratories')
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );

CREATE POLICY "private buckets owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('documents','prescriptions','laboratories')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "private buckets owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('documents','prescriptions','laboratories')
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  )
  WITH CHECK (
    bucket_id IN ('documents','prescriptions','laboratories')
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );

CREATE POLICY "private buckets owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('documents','prescriptions','laboratories')
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );
