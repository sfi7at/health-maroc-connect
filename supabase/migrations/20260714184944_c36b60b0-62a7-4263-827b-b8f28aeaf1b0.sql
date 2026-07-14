-- pharmacy-products bucket ------------------------------------------------
-- Read: any authenticated user (files are served via signed URLs).
CREATE POLICY "pharmacy_products read authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pharmacy-products');

CREATE POLICY "pharmacy_products owner write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pharmacy-products'
    AND public.storage_first_folder_owns_provider(name, auth.uid())
  );

CREATE POLICY "pharmacy_products owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'pharmacy-products'
    AND public.storage_first_folder_owns_provider(name, auth.uid())
  );

CREATE POLICY "pharmacy_products owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pharmacy-products'
    AND public.storage_first_folder_owns_provider(name, auth.uid())
  );

-- order-prescriptions bucket ----------------------------------------------
-- Helper: does a stored path (first folder = order_id) belong to a user
-- who is a party to that order? Uses can_access_order.
CREATE OR REPLACE FUNCTION public.storage_first_folder_order_access(_name text)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  seg TEXT;
  oid UUID;
BEGIN
  IF _name IS NULL THEN RETURN false; END IF;
  seg := (storage.foldername(_name))[1];
  IF seg IS NULL THEN RETURN false; END IF;
  BEGIN oid := seg::uuid; EXCEPTION WHEN others THEN RETURN false; END;
  RETURN public.can_access_order(oid);
END $$;

REVOKE EXECUTE ON FUNCTION public.storage_first_folder_order_access(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_first_folder_order_access(text) TO authenticated;

CREATE POLICY "order_rx parties read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'order-prescriptions'
    AND public.storage_first_folder_order_access(name)
  );

CREATE POLICY "order_rx buyer write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'order-prescriptions'
    AND public.storage_first_folder_order_access(name)
  );

CREATE POLICY "order_rx parties update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'order-prescriptions'
    AND public.storage_first_folder_order_access(name)
  );

CREATE POLICY "order_rx parties delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'order-prescriptions'
    AND public.storage_first_folder_order_access(name)
  );
