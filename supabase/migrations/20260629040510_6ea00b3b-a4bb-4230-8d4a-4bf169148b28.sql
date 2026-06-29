
CREATE POLICY "imports_admin_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'imports' AND public.has_any_admin_role(auth.uid()));
CREATE POLICY "imports_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'imports' AND public.has_any_admin_role(auth.uid()));
CREATE POLICY "imports_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'imports' AND public.has_any_admin_role(auth.uid()));
CREATE POLICY "imports_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'imports' AND public.has_any_admin_role(auth.uid()));
